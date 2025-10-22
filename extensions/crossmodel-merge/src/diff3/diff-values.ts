/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { PropDelta } from '../types/change.js';

/**
 * Perform 3-way diff on scalar properties.
 * Returns a map of property name to delta for properties that changed.
 *
 * @param base Base version properties
 * @param ours Our version properties
 * @param theirs Their version properties
 * @param hidden Set of property names to exclude from diff
 * @returns Map of property name to delta
 */
export function diffScalarProps(
   base: Record<string, unknown>,
   ours: Record<string, unknown>,
   theirs: Record<string, unknown>,
   hidden: Set<string> = new Set()
): Record<string, PropDelta> {
   const result: Record<string, PropDelta> = {};

   // Collect all property names from all three versions
   const allProps = new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)]);

   for (const prop of allProps) {
      if (hidden.has(prop)) {
         continue;
      }

      const baseVal = base[prop];
      const oursVal = ours[prop];
      const theirsVal = theirs[prop];

      // Check if any value differs from base
      const oursChanged = !isEqual(baseVal, oursVal);
      const theirsChanged = !isEqual(baseVal, theirsVal);

      // Only include delta if there's a meaningful change
      // Skip if both sides made the same change (convergent change)
      if (oursChanged && theirsChanged && isEqual(oursVal, theirsVal)) {
         // Both sides changed to the same value - no conflict, no delta needed
         continue;
      }

      if (oursChanged || theirsChanged) {
         result[prop] = {
            base: baseVal,
            ours: oursVal,
            theirs: theirsVal
         };
      }
   }

   return result;
}

/**
 * Check if a record of property deltas has any conflicts.
 * A conflict occurs when both ours and theirs differ from base,
 * but ours and theirs are not equal to each other.
 *
 * @param details Property deltas
 * @returns True if there are any conflicts
 */
export function hasConflicts(details: Record<string, PropDelta>): boolean {
   for (const delta of Object.values(details)) {
      if (isConflict(delta)) {
         return true;
      }
   }
   return false;
}

/**
 * Check if a specific property delta represents a conflict.
 */
export function isConflict(delta: PropDelta): boolean {
   const oursChanged = !isEqual(delta.base, delta.ours);
   const theirsChanged = !isEqual(delta.base, delta.theirs);
   return oursChanged && theirsChanged && !isEqual(delta.ours, delta.theirs);
}

/**
 * Deep equality check for scalar values.
 * Handles primitives, null, undefined, and simple objects/arrays.
 * Includes cycle detection to prevent stack overflow on circular references.
 */
function isEqual(a: unknown, b: unknown, visited: Set<string> = new Set()): boolean {
   if (a === b) {
      return true;
   }

   if (a === null || a === undefined || b === null || b === undefined) {
      return a === b;
   }

   if (typeof a !== typeof b) {
      return false;
   }

   if (typeof a !== 'object') {
      return a === b;
   }

   // Cycle detection: create a unique key for this comparison pair
   // Skip cycle detection for primitive-like objects
   if (typeof a === 'object' && typeof b === 'object') {
      // Check for AST node markers to detect cycles
      const isAstNodeA = '$type' in a || '$container' in a;
      const isAstNodeB = '$type' in b || '$container' in b;

      if (isAstNodeA && isAstNodeB) {
         // For AST nodes, use identity comparison if we've seen this pair before
         const key = `${(a as any).$type || 'unknown'}:${(b as any).$type || 'unknown'}`;
         if (visited.has(key)) {
            // Already comparing these types, assume equal to break cycle
            return true;
         }
         visited.add(key);
      }
   }

   // For references, compare the ref property
   if (typeof a === 'object' && 'ref' in a && typeof b === 'object' && 'ref' in b) {
      return isEqual((a as any).ref, (b as any).ref, visited);
   }

   // Simple array comparison
   if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
         return false;
      }
      for (let i = 0; i < a.length; i++) {
         if (!isEqual(a[i], b[i], visited)) {
            return false;
         }
      }
      return true;
   }

   // Simple object comparison - skip internal Langium properties
   const skipProps = new Set(['$type', '$container', '$containerProperty', '$containerIndex', '$document', '$cstNode']);
   const aKeys = Object.keys(a as object)
      .filter(k => !skipProps.has(k))
      .sort();
   const bKeys = Object.keys(b as object)
      .filter(k => !skipProps.has(k))
      .sort();

   if (aKeys.length !== bKeys.length) {
      return false;
   }

   for (let i = 0; i < aKeys.length; i++) {
      if (aKeys[i] !== bKeys[i]) {
         return false;
      }
      if (!isEqual((a as any)[aKeys[i]], (b as any)[bKeys[i]], visited)) {
         return false;
      }
   }

   return true;
}
