/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { RenderProps, TARGET_ATTRIBUTE_MAPPING_EDGE_TYPE, createLeftPortId, createRightPortId } from '@crossmodel/protocol';
import { GEdge, GEdgeBuilder } from '@eclipse-glsp/server';
import { AttributeMappingSource } from '../../../language-server/generated/ast.js';
import { MappingModelIndex } from './mapping-model-index.js';

export class GTargetObjectEdge extends GEdge {
   override type = TARGET_ATTRIBUTE_MAPPING_EDGE_TYPE;

   static override builder(): GTargetMappingSourceEdgeBuilder {
      return new GTargetMappingSourceEdgeBuilder(GTargetObjectEdge).type(TARGET_ATTRIBUTE_MAPPING_EDGE_TYPE);
   }
}

export class GTargetMappingSourceEdgeBuilder extends GEdgeBuilder<GTargetObjectEdge> {
   set(source: AttributeMappingSource, index: MappingModelIndex): this {
      const mapping = source.$container;
      const sourceId = createRightPortId(index.createId(source.value.ref));
      const targetId = createLeftPortId(index.createId(mapping.attribute));

      const id = 'edge_' + index.createId(source);
      this.id(id);
      this.routerKind('libavoid');
      index.indexSemanticElement(id, source);
      this.addCssClasses('diagram-edge', 'mapping-edge', 'attribute-mapping');
      this.addArg('edgePadding', 5);

      if (mapping.$containerIndex !== undefined) {
         this.addArg(RenderProps.TARGET_ATTRIBUTE_MAPPING_IDX, mapping.$containerIndex);
      }

      this.sourceId(sourceId);
      this.targetId(targetId);
      return this;
   }
}
