/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import type { AstNode } from 'langium';
import { NodeHint } from './hints.js';

/**
 * Resolve a stable identity for an AST node.
 * Prefers (node as any).id from IdentifiedObject interface.
 * If not available, synthesize from $type and best scalar property.
 *
 * @param node The AST node
 * @param hint Optional hint for custom key property
 * @returns A stable string identity
 */
export function resolveId(node: AstNode, hint?: NodeHint): string {
   // First, try the hint's custom key property
   if (hint?.keyProp && (node as any)[hint.keyProp]) {
      return String((node as any)[hint.keyProp]);
   }

   // Next, try the standard 'id' property from IdentifiedObject
   // Empty string is treated as missing (falsy)
   if ((node as any).id !== undefined && (node as any).id !== '') {
      return String((node as any).id);
   }

   // Synthesize from $type and visible scalar
   const type = (node as any).$type || 'Unknown';
   const name = (node as any).name || (node as any).label || '';

   if (name) {
      // When name is present, use simple format: Type:name
      return `${type}:${name}`;
   }

   // Check if first non-$ property is a reference with $refText
   const keys = Object.keys(node).filter(k => !k.startsWith('$'));
   if (keys.length > 0) {
      const firstKey = keys[0];
      const value = (node as any)[firstKey];
      if (value && typeof value === 'object') {
         // Direct reference with $refText
         if ('$refText' in value) {
            return `${type}:${value.$refText}`;
         }
         // Nested reference: check if it has a 'value' property with $refText
         // This handles cases like AttributeMappingTarget which wraps the reference
         if ('value' in value && value.value && typeof value.value === 'object' && '$refText' in value.value) {
            return `${type}:${value.value.$refText}`;
         }
      }
   }

   // Create a disambiguator from other scalar properties when name is not present
   const props = Object.keys(node)
      .filter(k => !k.startsWith('$') && typeof (node as any)[k] !== 'object')
      .sort();

   const disambiguator = props
      .slice(0, 3)
      .map(p => `${p}=${(node as any)[p]}`)
      .join('&');

   // If no disambiguator (empty node), add a suffix to ensure it's longer than just the type
   if (!disambiguator) {
      return `${type}:<generated>`;
   }

   return `${type}:${disambiguator}`;
}

/**
 * Check if a node has an explicit id property (from IdentifiedObject).
 */
export function hasExplicitId(node: AstNode): boolean {
   return (node as any).id !== undefined;
}
