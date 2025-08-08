/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { Command, DeleteElementOperation, JsonOperationHandler, ModelState, remove } from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import {
   InheritanceEdge,
   isLogicalEntityNode,
   isRelationshipEdge,
   isSystemDiagramEdge,
   LogicalEntityNode,
   SystemDiagramEdge
} from '../../../language-server/generated/ast.js';
import { CrossModelCommand } from '../../common/cross-model-command.js';
import { SystemModelState } from '../model/system-model-state.js';

@injectable()
export class SystemDiagramDeleteOperationHandler extends JsonOperationHandler {
   operationType = DeleteElementOperation.KIND;

   @inject(ModelState) protected override modelState: SystemModelState;

   override createCommand(operation: DeleteElementOperation): Command | undefined {
      const deleteInfo = this.findElementsToDelete(operation);
      if (deleteInfo.nodes.length === 0 && deleteInfo.edges.length === 0) {
         return undefined;
      }
      return new CrossModelCommand(this.modelState, () => this.deleteElements(deleteInfo));
   }

   protected deleteElements(deleteInfo: DeleteInfo): void {
      const nodes = this.modelState.systemDiagram.nodes;
      remove(nodes, ...deleteInfo.nodes);

      const edges = this.modelState.systemDiagram.edges;
      remove(edges, ...deleteInfo.edges);
   }

   protected findElementsToDelete(operation: DeleteElementOperation): DeleteInfo {
      const deleteInfo: DeleteInfo = { edges: [], nodes: [] };

      for (const elementId of operation.elementIds) {
         const element = this.modelState.index.findSemanticElement(elementId, isDiagramElement);
         // simply remove any diagram nodes or edges from the diagram
         if (isLogicalEntityNode(element)) {
            deleteInfo.nodes.push(element);
            deleteInfo.edges.push(...this.modelState.systemDiagram.edges.filter(edge => isRelatedEdge(edge, element)));
         } else if (isSystemDiagramEdge(element)) {
            deleteInfo.edges.push(element);
         }
      }
      return deleteInfo;
   }
}

function isRelatedEdge(edge: SystemDiagramEdge, node: LogicalEntityNode): boolean {
   if (isRelationshipEdge(edge)) {
      return edge.sourceNode?.ref === node || edge.targetNode?.ref === node;
   } else {
      return (<InheritanceEdge>edge).baseNode?.ref === node || (<InheritanceEdge>edge).superNode?.ref === node;
   }
}

function isDiagramElement(item: unknown): item is SystemDiagramEdge | LogicalEntityNode {
   return isSystemDiagramEdge(item) || isLogicalEntityNode(item);
}

interface DeleteInfo {
   nodes: LogicalEntityNode[];
   edges: SystemDiagramEdge[];
}
