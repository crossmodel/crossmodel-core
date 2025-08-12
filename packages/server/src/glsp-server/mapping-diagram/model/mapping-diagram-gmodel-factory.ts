/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { GEdge, GGraph, GModelFactory, GNode } from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import { AttributeMapping, SourceObject, TargetObject } from '../../../language-server/generated/ast.js';
import { GTargetObjectEdge } from './edges.js';
import { MappingModelState } from './mapping-model-state.js';
import { GSourceObjectNode, GTargetObjectNode } from './nodes.js';

@injectable()
export class MappingDiagramGModelFactory implements GModelFactory {
   @inject(MappingModelState) protected readonly modelState!: MappingModelState;

   createModel(): void {
      const newRoot = this.createGraph();
      if (newRoot) {
         // update GLSP root element in state so it can be used in any follow-up actions/commands
         this.modelState.updateRoot(newRoot);
      }
   }

   protected createGraph(): GGraph | undefined {
      const mappingRoot = this.modelState.mapping;
      if (!mappingRoot) {
         return;
      }
      const graphBuilder = GGraph.builder().id(this.modelState.semanticUri);

      // source nodes
      mappingRoot.sources.map(sourceObject => this.createSourceObjectNode(sourceObject)).forEach(node => graphBuilder.add(node));

      // target node
      graphBuilder.add(this.createTargetNode(mappingRoot.target));

      // attribute mapping edges
      mappingRoot.target.mappings.flatMap(mapping => this.createTargetObjectEdge(mapping)).forEach(edge => graphBuilder.add(edge));

      return graphBuilder.build();
   }

   protected createTargetObjectEdge(attribute: AttributeMapping): GEdge[] {
      return attribute.sources.map(src => GTargetObjectEdge.builder().set(src, this.modelState.index).build());
   }

   protected createSourceObjectNode(sourceObject: SourceObject): GNode {
      return GSourceObjectNode.builder().set(sourceObject, this.modelState.index).build();
   }

   protected createTargetNode(target: TargetObject): GNode {
      return GTargetObjectNode.builder().set(target, this.modelState.index).build();
   }
}
