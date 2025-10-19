/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { AstNode, AstReflection, isAstNode } from 'langium';
import { Hints } from './hints.js';

export interface DiscoveredProps {
   scalars: Map<string, unknown>; // property name -> scalar value
   singletons: Map<string, AstNode>; // property name -> single child node
   arrays: Map<string, AstNode[]>; // property name -> array of child nodes
}

/**
 * Discover properties of an AST node using Langium reflection.
 * Categorizes properties into scalars, singletons, and arrays.
 * Ignores properties starting with '$' (metadata).
 * 
 * @param node The AST node to analyze
 * @param reflection Langium AST reflection
 * @param hints Optional hints for the node type
 * @returns Categorized properties
 */
export function discoverProps(node: AstNode, reflection: AstReflection, hints?: Hints): DiscoveredProps {
   const scalars = new Map<string, unknown>();
   const singletons = new Map<string, AstNode>();
   const arrays = new Map<string, AstNode[]>();

   const type = (node as any).$type;
   const hint = hints?.[type];
   const hiddenProps = new Set(hint?.hiddenProps || []);

   for (const [key, value] of Object.entries(node)) {
      // Skip metadata properties and hidden properties
      if (key.startsWith('$') || hiddenProps.has(key)) {
         continue;
      }

      if (value === null || value === undefined) {
         scalars.set(key, value);
      } else if (Array.isArray(value)) {
         // Check if it's an array of AST nodes
         const astNodes = value.filter(isAstNode);
         if (astNodes.length > 0) {
            arrays.set(key, astNodes);
         } else {
            // Scalar array
            scalars.set(key, value);
         }
      } else if (isAstNode(value)) {
         singletons.set(key, value);
      } else if (typeof value === 'object' && 'ref' in value) {
         // Reference - treat as scalar for now
         scalars.set(key, value);
      } else {
         // Primitive or other scalar
         scalars.set(key, value);
      }
   }

   return { scalars, singletons, arrays };
}
