/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { GEdge, GGraph, GModelFactory, GNode, ModelState } from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import { InheritanceEdge, LogicalEntityNode, RelationshipEdge, isRelationshipEdge } from '../../../language-server/generated/ast.js';
import { GInheritanceEdge, GRelationshipEdge } from './edges.js';
import { GEntityNode } from './nodes.js';
import { SystemModelState } from './system-model-state.js';

/**
 * Custom factory that translates the semantic diagram root from Langium to a GLSP graph.
 * Each semantic element in the diagram will be translated to a GModel element on the GLSP side.
 * The GLSP client will later use the GModel to render the SVG elements based on their type.
 */
@injectable()
export class SystemDiagramGModelFactory implements GModelFactory {
   @inject(ModelState) protected readonly modelState!: SystemModelState;

   createModel(): void {
      const newRoot = this.createGraph();
      if (newRoot) {
         // update GLSP root element in state so it can be used in any follow-up actions/commands
         this.modelState.updateRoot(newRoot);
      }
   }

   protected createGraph(): GGraph | undefined {
      const diagramRoot = this.modelState.systemDiagram;
      if (!diagramRoot) {
         return;
      }
      const graphBuilder = GGraph.builder().id(this.modelState.semanticUri);

      diagramRoot.nodes.map(node => this.createEntityNode(node)).forEach(node => graphBuilder.add(node));
      diagramRoot.edges
         .map(edge => {
            if (isRelationshipEdge(edge)) {
               return this.createRelationshipEdge(edge);
            }
            return this.createInheritanceEdge(<InheritanceEdge>edge);
         })
         .forEach(edge => graphBuilder.add(edge));

      return graphBuilder.build();
   }

   protected createEntityNode(node: LogicalEntityNode): GNode {
      return GEntityNode.builder().set(node, this.modelState.index).build();
   }

   protected createRelationshipEdge(edge: RelationshipEdge): GEdge {
      return GRelationshipEdge.builder().set(edge, this.modelState.index).build();
   }

   protected createInheritanceEdge(edge: InheritanceEdge): GEdge {
      return GInheritanceEdge.builder().set(edge, this.modelState.index).build();
   }
}
