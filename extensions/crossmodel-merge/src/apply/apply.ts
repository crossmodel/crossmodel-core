/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import type { AstNode, AstReflection } from 'langium';
import { discoverProps } from '../reflection/discover.js';
import { resolveId } from '../reflection/ids.js';
import { Hints } from '../reflection/hints.js';
import { Change } from '../types/change.js';
import { isConflict } from '../diff3/diff-values.js';

export type SelectionResolver = (change: Change) => boolean;

/**
 * Apply selected changes to the ours AST root.
 * 
 * @param oursRoot The root AST node from our version
 * @param rootChange The root change with selections
 * @param selection Function to determine if a change is selected
 * @param reflection Langium AST reflection
 * @param hints Hints for node types
 * @returns The modified AST root
 */
export function applySelected(
   oursRoot: AstNode,
   rootChange: Change,
   selection: SelectionResolver,
   reflection: AstReflection,
   hints: Hints
): AstNode {
   // Work directly on the ours root
   applyChangeToNode(oursRoot, rootChange, selection, reflection, hints);
   return oursRoot;
}

/**
 * Apply a change to a specific node.
 */
function applyChangeToNode(
   node: AstNode,
   change: Change,
   selection: SelectionResolver,
   reflection: AstReflection,
   hints: Hints
): void {
   if (!selection(change)) {
      // Change is not selected, skip
      return;
   }

   // Apply property updates
   if (change.details) {
      for (const [propName, delta] of Object.entries(change.details)) {
         // Determine which value to use
         let valueToApply: unknown;
         
         if (isConflict(delta)) {
            // For conflicts, default to keeping ours unless explicitly selected
            // In a real UI, this would be determined by user selection
            valueToApply = delta.ours;
         } else {
            // Non-conflict: use the changed value
            if (delta.ours !== delta.base) {
               valueToApply = delta.ours;
            } else if (delta.theirs !== delta.base) {
               valueToApply = delta.theirs;
            } else {
               valueToApply = delta.ours;
            }
         }
         
         // Apply the value
         (node as any)[propName] = deepClone(valueToApply);
      }
   }

   // Apply child changes
   if (change.children) {
      for (const childChange of change.children) {
         applyChildChange(node, childChange, selection, reflection, hints);
      }
   }
}

/**
 * Apply a child change to a parent node.
 */
function applyChildChange(
   parentNode: AstNode,
   childChange: Change,
   selection: SelectionResolver,
   reflection: AstReflection,
   hints: Hints
): void {
   if (!selection(childChange)) {
      return;
   }

   const props = discoverProps(parentNode, reflection, hints);

   // Handle additions
   if (childChange.kind === 'add') {
      // Find the array property that should contain this child
      for (const [_arrayKey, arrayValue] of props.arrays) {
         // Check if any existing child has the same type
         if (arrayValue.length > 0 && (arrayValue[0] as any).$type === childChange.nodeKind) {
            // This is the right array, but we need the actual node from theirs
            // For now, we can't add it without access to the theirs node
            // This would need to be passed through the change structure
            console.warn('Cannot apply add change without theirs node:', childChange.id);
            return;
         }
      }
   }

   // Handle removals
   if (childChange.kind === 'remove') {
      for (const [_arrayKey, arrayValue] of props.arrays) {
         const index = arrayValue.findIndex(n => {
            const type = (n as any).$type;
            const hint = hints[type];
            return resolveId(n, hint) === childChange.id;
         });
         if (index >= 0) {
            arrayValue.splice(index, 1);
            return;
         }
      }
      
      // Check singletons
      for (const [_singletonKey, singletonValue] of props.singletons) {
         const type = (singletonValue as any).$type;
         const hint = hints[type];
         if (resolveId(singletonValue, hint) === childChange.id) {
            (parentNode as any)[_singletonKey] = undefined;
            return;
         }
      }
   }

   // Handle updates
   if (childChange.kind === 'update') {
      // Find the child node by ID
      for (const [_arrayKey, arrayValue] of props.arrays) {
         const child = arrayValue.find(n => {
            const type = (n as any).$type;
            const hint = hints[type];
            return resolveId(n, hint) === childChange.id;
         });
         if (child) {
            applyChangeToNode(child, childChange, selection, reflection, hints);
            return;
         }
      }
      
      // Check singletons
      for (const [_singletonKey, singletonValue] of props.singletons) {
         const type = (singletonValue as any).$type;
         const hint = hints[type];
         if (resolveId(singletonValue, hint) === childChange.id) {
            applyChangeToNode(singletonValue, childChange, selection, reflection, hints);
            return;
         }
      }
   }
}

/**
 * Deep clone a value (including AST nodes).
 * For AST nodes, this should create a proper deep copy.
 */
function deepClone(value: unknown): unknown {
   if (value === null || value === undefined) {
      return value;
   }
   
   if (typeof value !== 'object') {
      return value;
   }
   
   if (Array.isArray(value)) {
      return value.map(deepClone);
   }
   
   // For objects, create a shallow copy of own properties
   const cloned: any = {};
   for (const [key, val] of Object.entries(value)) {
      cloned[key] = deepClone(val);
   }
   
   return cloned;
}
