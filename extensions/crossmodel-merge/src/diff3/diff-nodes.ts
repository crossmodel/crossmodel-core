/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { AstNode, AstReflection } from 'langium';
import * as vscode from 'vscode';
import { discoverProps } from '../reflection/discover.js';
import { resolveId } from '../reflection/ids.js';
import { Hints } from '../reflection/hints.js';
import { Change } from '../types/change.js';
import { diffScalarProps, hasConflicts } from './diff-values.js';

/**
 * Perform 3-way diff on AST nodes.
 * 
 * @param base Base version node
 * @param ours Our version node
 * @param theirs Their version node
 * @param fileUri URI of the file containing these nodes
 * @param reflection Langium AST reflection
 * @param hints Optional hints for node types
 * @returns A Change representing the diff, or undefined if no changes
 */
export function diff3Node(
   base: AstNode | undefined,
   ours: AstNode | undefined,
   theirs: AstNode | undefined,
   fileUri: vscode.Uri,
   reflection: AstReflection,
   hints: Hints
): Change | undefined {
   // Determine change kind
   if (!base && ours && theirs) {
      // Both added - should not happen for root nodes
      return createAddChange(ours, fileUri, hints);
   } else if (!base && ours && !theirs) {
      // We added
      return createAddChange(ours, fileUri, hints);
   } else if (!base && !ours && theirs) {
      // They added
      return createAddChange(theirs, fileUri, hints);
   } else if (base && !ours && theirs) {
      // We removed
      return createRemoveChange(base, fileUri, hints);
   } else if (base && ours && !theirs) {
      // They removed
      return createRemoveChange(base, fileUri, hints);
   } else if (base && !ours && !theirs) {
      // Both removed
      return createRemoveChange(base, fileUri, hints);
   } else if (!ours && !theirs) {
      // Nothing exists
      return undefined;
   }

   // All three exist - check for updates
   const node = ours || theirs || base!;
   const type = (node as any).$type;
   const hint = hints[type];
   const id = resolveId(node, hint);

   // Discover properties from all three versions
   const baseProps = base ? discoverProps(base, reflection, hints) : { scalars: new Map(), singletons: new Map(), arrays: new Map() };
   const oursProps = ours ? discoverProps(ours, reflection, hints) : { scalars: new Map(), singletons: new Map(), arrays: new Map() };
   const theirsProps = theirs ? discoverProps(theirs, reflection, hints) : { scalars: new Map(), singletons: new Map(), arrays: new Map() };

   // Diff scalar properties
   const baseScalars: Record<string, unknown> = Object.fromEntries(baseProps.scalars);
   const oursScalars: Record<string, unknown> = Object.fromEntries(oursProps.scalars);
   const theirsScalars: Record<string, unknown> = Object.fromEntries(theirsProps.scalars);
   
   const details = diffScalarProps(baseScalars, oursScalars, theirsScalars);
   const conflicts = hasConflicts(details);

   // Recursively diff singleton children
   const childChanges: Change[] = [];
   const allSingletonKeys = new Set([...baseProps.singletons.keys(), ...oursProps.singletons.keys(), ...theirsProps.singletons.keys()]);
   
   for (const key of allSingletonKeys) {
      const childChange = diff3Node(
         baseProps.singletons.get(key),
         oursProps.singletons.get(key),
         theirsProps.singletons.get(key),
         fileUri,
         reflection,
         hints
      );
      if (childChange) {
         childChanges.push(childChange);
      }
   }

   // Diff array children (treat as unordered sets)
   const allArrayKeys = new Set([...baseProps.arrays.keys(), ...oursProps.arrays.keys(), ...theirsProps.arrays.keys()]);
   
   for (const key of allArrayKeys) {
      const baseArray = baseProps.arrays.get(key) || [];
      const oursArray = oursProps.arrays.get(key) || [];
      const theirsArray = theirsProps.arrays.get(key) || [];
      
      const arrayChanges = diff3Array(baseArray, oursArray, theirsArray, fileUri, reflection, hints);
      childChanges.push(...arrayChanges);
   }

   // If there are no scalar changes and no child changes, no diff
   if (Object.keys(details).length === 0 && childChanges.length === 0) {
      return undefined;
   }

   // Determine label
   const label = hint?.label ? hint.label(node) : ((node as any).name || (node as any).id || type);

   return {
      id,
      nodeKind: type,
      fileUri,
      kind: 'update',
      details: Object.keys(details).length > 0 ? details : undefined,
      conflicts,
      children: childChanges.length > 0 ? childChanges : undefined,
      label
   };
}

/**
 * Diff two arrays of nodes as unordered sets.
 */
function diff3Array(
   base: AstNode[],
   ours: AstNode[],
   theirs: AstNode[],
   fileUri: vscode.Uri,
   reflection: AstReflection,
   hints: Hints
): Change[] {
   const changes: Change[] = [];
   
   // Build maps keyed by identity
   const baseMap = new Map(base.map(n => {
      const type = (n as any).$type;
      const hint = hints[type];
      return [resolveId(n, hint), n];
   }));
   const oursMap = new Map(ours.map(n => {
      const type = (n as any).$type;
      const hint = hints[type];
      return [resolveId(n, hint), n];
   }));
   const theirsMap = new Map(theirs.map(n => {
      const type = (n as any).$type;
      const hint = hints[type];
      return [resolveId(n, hint), n];
   }));
   
   // Collect all IDs
   const allIds = new Set([...baseMap.keys(), ...oursMap.keys(), ...theirsMap.keys()]);
   
   for (const id of allIds) {
      const change = diff3Node(
         baseMap.get(id),
         oursMap.get(id),
         theirsMap.get(id),
         fileUri,
         reflection,
         hints
      );
      if (change) {
         changes.push(change);
      }
   }
   
   return changes;
}

function createAddChange(node: AstNode, fileUri: vscode.Uri, hints: Hints): Change {
   const type = (node as any).$type;
   const hint = hints[type];
   const id = resolveId(node, hint);
   const label = hint?.label ? hint.label(node) : ((node as any).name || (node as any).id || type);
   
   return {
      id,
      nodeKind: type,
      fileUri,
      kind: 'add',
      label
   };
}

function createRemoveChange(node: AstNode, fileUri: vscode.Uri, hints: Hints): Change {
   const type = (node as any).$type;
   const hint = hints[type];
   const id = resolveId(node, hint);
   const label = hint?.label ? hint.label(node) : ((node as any).name || (node as any).id || type);
   
   return {
      id,
      nodeKind: type,
      fileUri,
      kind: 'remove',
      label
   };
}
