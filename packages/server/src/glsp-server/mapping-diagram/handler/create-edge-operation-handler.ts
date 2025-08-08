/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { isLeftPortId, isPortId, TARGET_ATTRIBUTE_MAPPING_EDGE_TYPE } from '@crossmodel/protocol';
import {
   Command,
   CreateEdgeOperation,
   JsonCreateEdgeOperationHandler,
   MaybePromise,
   ModelState,
   TriggerEdgeCreationAction
} from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import { combineIds } from '../../../language-server/cross-model-naming.js';
import { isSourceObjectAttribute, isTargetObjectAttribute, SourceObject } from '../../../language-server/generated/ast.js';
import { createAttributeMapping, createAttributeMappingSource, getOwner } from '../../../language-server/util/ast-util.js';
import { CrossModelCommand } from '../../common/cross-model-command.js';
import { MappingModelState } from '../model/mapping-model-state.js';

@injectable()
export class MappingEdgeCreationOperationHandler extends JsonCreateEdgeOperationHandler {
   @inject(ModelState) protected override modelState: MappingModelState;

   override elementTypeIds = [TARGET_ATTRIBUTE_MAPPING_EDGE_TYPE];
   override label: string = 'Mapping Edge';

   override createCommand(operation: CreateEdgeOperation): MaybePromise<Command | undefined> {
      return new CrossModelCommand(this.modelState, () => this.createEdge(operation));
   }

   override getTriggerActions(): TriggerEdgeCreationAction[] {
      // we do not want this edge creation to show up
      return [];
   }

   protected createEdge(operation: CreateEdgeOperation): void {
      const sourceElementId = isLeftPortId(operation.targetElementId) ? operation.sourceElementId : operation.targetElementId;
      const targetElementId = isLeftPortId(operation.targetElementId) ? operation.targetElementId : operation.sourceElementId;
      if (isPortId(sourceElementId)) {
         const container = this.modelState.mapping.target;
         const sourceElement = this.modelState.index.findSemanticElement(sourceElementId, isSourceObjectAttribute);
         const targetElement = this.modelState.index.findSemanticElement(targetElementId, isTargetObjectAttribute);
         const sourceObject = <SourceObject>getOwner(sourceElement);
         if (!targetElement?.id || !sourceElement?.id || !sourceObject?.id) {
            return;
         }
         const sourceAttributeReference = combineIds(sourceObject.id, sourceElement.id);
         const existingMapping = container.mappings.find(mapping => mapping.attribute?.value.ref?.id === targetElement.id);
         if (existingMapping) {
            existingMapping.sources.push(createAttributeMappingSource(existingMapping, sourceAttributeReference));
         } else {
            const mapping = createAttributeMapping(container, sourceAttributeReference, targetElement.id);
            container.mappings.push(mapping);
         }
      }
   }
}
