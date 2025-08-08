/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { Command, DeleteElementOperation, GEdge, GNode, JsonOperationHandler, ModelState, remove } from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import {
   AttributeMappingSource,
   SourceObject,
   SourceObjectDependency,
   isAttributeMappingSource,
   isSourceObject
} from '../../../language-server/generated/ast.js';
import { getOwner } from '../../../language-server/util/ast-util.js';
import { CrossModelCommand } from '../../common/cross-model-command.js';
import { MappingModelState } from '../model/mapping-model-state.js';

@injectable()
export class MappingDiagramDeleteElementOperationHandler extends JsonOperationHandler {
   override operationType = DeleteElementOperation.KIND;

   @inject(ModelState) protected override modelState: MappingModelState;

   override createCommand(operation: DeleteElementOperation): Command | undefined {
      const deleteInfo = this.findElementsToDelete(operation);
      if (deleteInfo.sources.length === 0 && deleteInfo.attributeSources.length === 0 && deleteInfo.dependencies.length === 0) {
         return undefined;
      }

      return new CrossModelCommand(this.modelState, () => this.deleteElements(deleteInfo));
   }

   protected deleteElements(deleteInfo: DeleteInfo): void {
      const container = this.modelState.mapping.sources;
      remove(container, ...deleteInfo.sources);
      deleteInfo.attributeSources.forEach(source => remove(source.$container.sources, source));
      deleteInfo.dependencies.forEach(dependency => remove(dependency.$container.dependencies, dependency));
   }

   protected findElementsToDelete(operation: DeleteElementOperation): DeleteInfo {
      const deleteInfo: DeleteInfo = { sources: [], dependencies: [], attributeSources: [] };
      operation.elementIds.forEach(id => {
         const graphElement = this.modelState.index.get(id);
         if (graphElement instanceof GNode) {
            this.deleteNode(graphElement, deleteInfo);
         } else if (graphElement instanceof GEdge) {
            this.deleteEdge(graphElement, deleteInfo);
         }
      });
      return deleteInfo;
   }

   protected deleteNode(node: GNode, deleteInfo: DeleteInfo): void {
      const astNode = this.modelState.index.findSemanticElement(node.id);
      if (isSourceObject(astNode)) {
         this.deleteSourceObject(node, astNode, deleteInfo);
      }
   }

   protected deleteSourceObject(node: GNode, source: SourceObject, deleteInfo: DeleteInfo): void {
      const mapping = this.modelState.mapping;
      // delete source and all relations and attribute sources that reference that source
      deleteInfo.sources.push(source);
      deleteInfo.dependencies.push(
         ...mapping.sources.flatMap(src => src.dependencies).filter(dependency => dependency.source.ref === source)
      );
      deleteInfo.attributeSources.push(
         ...mapping.target.mappings.flatMap(attrMapping =>
            attrMapping.sources.filter(attrSource => attrSource.value.ref && getOwner(attrSource.value?.ref) === source)
         )
      );
   }

   protected deleteEdge(edge: GEdge, deleteInfo: DeleteInfo): void {
      // the edge has the source as semantic element with an additional UUID cause the user may use the same source multiple times
      // see the generation of the edge id in edges.ts
      const source = this.modelState.index.findSemanticElement(edge.id, isAttributeMappingSource);
      if (source) {
         deleteInfo.attributeSources.push(source);
      }
   }
}

interface DeleteInfo {
   sources: SourceObject[];
   dependencies: SourceObjectDependency[];
   attributeSources: AttributeMappingSource[];
}
