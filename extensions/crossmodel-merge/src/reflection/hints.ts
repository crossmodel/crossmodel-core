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
      label: (node: AstNode) => {
         const anyNode = node as any;
         if (anyNode.id) return anyNode.id;
         // Check first property for reference
         const entity = anyNode.entity;
         if (entity && typeof entity === 'object' && '$refText' in entity) {
            return entity.$refText;
         }
         return 'Source';
      }
   },
   TargetObject: {
      unorderedChildren: ['mappings'],
      label: (node: AstNode) => {
         const anyNode = node as any;
         if (anyNode.id) return anyNode.id;
         // Check first property for reference
         const entity = anyNode.entity;
         if (entity && typeof entity === 'object' && '$refText' in entity) {
            return entity.$refText;
         }
         return 'Target';
      }
   },
   AttributeMapping: {
      unorderedChildren: ['sources'],
      label: (node: AstNode) => {
         const anyNode = node as any;
         if (anyNode.id) return anyNode.id;
         // AttributeMapping has 'attribute' which is an AttributeMappingTarget
         // AttributeMappingTarget has 'value' which is the reference
         const attribute = anyNode.attribute;
         if (attribute && typeof attribute === 'object') {
            const value = attribute.value;
            if (value && typeof value === 'object' && '$refText' in value) {
               return value.$refText;
            }
         }
         return 'AttributeMapping';
      }
   },
   AttributeMappingSource: {
      label: (node: AstNode) => {
         const anyNode = node as any;
         if (anyNode.id) return anyNode.id;
         // Check first property for reference
         const value = anyNode.value;
         if (value && typeof value === 'object' && '$refText' in value) {
            return value.$refText;
         }
         return 'AttributeMappingSource';
      }
   },
   DataModel: {
      label: (node: AstNode) => (node as any).id || 'DataModel'
   }
};
