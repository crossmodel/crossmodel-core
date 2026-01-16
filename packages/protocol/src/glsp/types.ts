/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { Args, DefaultTypes } from '@eclipse-glsp/protocol';

// System Diagram
export const ENTITY_NODE_TYPE = DefaultTypes.NODE + ':entity';
export const RELATIONSHIP_EDGE_TYPE = DefaultTypes.EDGE + ':relationship';
export const INHERITANCE_EDGE_TYPE = DefaultTypes.EDGE + ':inheritance';
export const LABEL_ENTITY = DefaultTypes.LABEL + ':entity';

// Mapping Diagram
export const SOURCE_OBJECT_NODE_TYPE = DefaultTypes.NODE + ':source-object';
export const SOURCE_NUMBER_NODE_TYPE = DefaultTypes.NODE + ':source-number';
export const SOURCE_STRING_NODE_TYPE = DefaultTypes.NODE + ':source-string';
export const TARGET_OBJECT_NODE_TYPE = DefaultTypes.NODE + ':target-object';
export const TARGET_ATTRIBUTE_MAPPING_EDGE_TYPE = DefaultTypes.EDGE + ':target-attribute-mapping';
export const ATTRIBUTE_COMPARTMENT_TYPE = DefaultTypes.COMPARTMENT + ':attribute';

// Args
export const REFERENCE_CONTAINER_TYPE = 'reference-container-type';
export const REFERENCE_PROPERTY = 'reference-property';
export const REFERENCE_VALUE = 'reference-value';

export type RenderProps = Record<string, string | number | boolean | undefined> & {
   theme: 'light' | 'dark' | 'hc' | 'hcLight'; // supported ThemeType of Theia
};

export namespace RenderProps {
   export function key(name: string): string {
      return 'render-prop-' + name;
   }

   export function read(args: Args): Partial<RenderProps> {
      return Object.keys(args).reduce((renderProps, propKey) => {
         if (propKey.startsWith('render-prop-')) {
            renderProps[propKey.substring('render-prop-'.length)] = args[propKey];
         }
         return renderProps;
      }, {} as Args);
   }
   export const TARGET_ATTRIBUTE_IDX_NAME = 'attributeId';
   export const TARGET_ATTRIBUTE_IDX = RenderProps.key(TARGET_ATTRIBUTE_IDX_NAME);

   export const TARGET_ATTRIBUTE_MAPPING_IDX_NAME = 'mappingIndex';
   export const TARGET_ATTRIBUTE_MAPPING_IDX = RenderProps.key(TARGET_ATTRIBUTE_MAPPING_IDX_NAME);

   export const SOURCE_OBJECT_IDX_NAME = 'sourceObjectIndex';
   export const SOURCE_OBJECT_IDX = RenderProps.key(SOURCE_OBJECT_IDX_NAME);
}

export const SEMANTIC_URI = 'semanticUri';

export namespace SemanticUri {
   export function read(args?: Args): string | undefined {
      return args ? (args[SEMANTIC_URI] as string | undefined) : undefined;
   }
}
