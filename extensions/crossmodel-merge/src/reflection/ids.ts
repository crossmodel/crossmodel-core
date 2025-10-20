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
   if ((node as any).id !== undefined) {
      return String((node as any).id);
   }

   // Synthesize from $type and visible scalar
   const type = (node as any).$type || 'Unknown';
   const name = (node as any).name || (node as any).label || '';
   
   // Create a disambiguator from other scalar properties
   const props = Object.keys(node)
      .filter(k => !k.startsWith('$') && typeof (node as any)[k] !== 'object')
      .sort();
   
   const disambiguator = props.slice(0, 3).map(p => `${p}=${(node as any)[p]}`).join('&');
   
   if (name) {
      return `${type}:${name}${disambiguator ? `[${disambiguator}]` : ''}`;
   }
   
   return `${type}[${disambiguator}]`;
}

/**
 * Check if a node has an explicit id property (from IdentifiedObject).
 */
export function hasExplicitId(node: AstNode): boolean {
   return (node as any).id !== undefined;
}
