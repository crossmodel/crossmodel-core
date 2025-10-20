/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import type { AstNode } from 'langium';

export type NodeHint = {
   keyProp?: string; // identity override if not 'id'
   unorderedChildren?: string[]; // child arrays treated as sets
   hiddenProps?: string[]; // props to omit in UI/diff
   label?: (node: AstNode) => string; // pretty label for UI
};

export type Hints = Record<string /* $type */, NodeHint>;

/**
 * Hints for CrossModel types to control diff/merge behavior.
 * These are optional UX tweaks; the engine works if empty.
 */
export const HINTS: Hints = {
   LogicalEntity: {
      unorderedChildren: ['attributes', 'identifiers'],
      label: (node: AstNode) => (node as any).name || (node as any).id || 'Entity'
   },
   LogicalAttribute: {
      label: (node: AstNode) => (node as any).name || (node as any).id || 'Attribute'
   },
   Relationship: {
      unorderedChildren: ['attributes'],
      label: (node: AstNode) => (node as any).name || (node as any).id || 'Relationship'
   },
   SystemDiagram: {
      unorderedChildren: ['nodes', 'edges'],
      label: (node: AstNode) => (node as any).id || 'Diagram'
   },
   Mapping: {
      unorderedChildren: ['sources'],
      label: (node: AstNode) => (node as any).id || 'Mapping'
   },
   SourceObject: {
      unorderedChildren: ['dependencies', 'conditions'],
      label: (node: AstNode) => (node as any).id || 'Source'
   },
   TargetObject: {
      unorderedChildren: ['mappings'],
      label: (node: AstNode) => (node as any).id || 'Target'
   },
   DataModel: {
      label: (node: AstNode) => (node as any).id || 'DataModel'
   }
};
