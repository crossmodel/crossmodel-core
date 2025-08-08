/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { toId, toIdReference } from '@crossmodel/protocol';
import { ApplyLabelEditOperation, Command, getOrThrow, JsonOperationHandler, ModelState } from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import { CrossModelRoot, LogicalEntity, LogicalEntityNode } from '../../../language-server/generated/ast.js';
import { findDocument } from '../../../language-server/util/ast-util.js';
import { CrossModelCommand } from '../../common/cross-model-command.js';
import { SystemModelState } from '../model/system-model-state.js';

@injectable()
export class SystemDiagramApplyLabelEditOperationHandler extends JsonOperationHandler {
   readonly operationType = ApplyLabelEditOperation.KIND;
   @inject(ModelState) override modelState: SystemModelState;

   createCommand(operation: ApplyLabelEditOperation): Command {
      const entityNode = getOrThrow(this.modelState.index.findLogicalEntityNode(operation.labelId), 'Entity node not found');
      const entity = getOrThrow(entityNode.entity.ref, 'Entity not found');
      const oldName = entity.name;
      return new CrossModelCommand(
         this.modelState,
         () => this.renameEntity(entityNode, entity, operation.text),
         () =>
            this.renameEntity(
               getOrThrow(this.modelState.index.findLogicalEntityNode(operation.labelId), 'Entity node not found'),
               getOrThrow(entityNode.entity.ref, 'Entity not found'),
               oldName ?? this.modelState.idProvider.findNextId(LogicalEntity, 'NewEntity')
            ),
         () =>
            this.renameEntity(
               getOrThrow(this.modelState.index.findLogicalEntityNode(operation.labelId), 'Entity node not found'),
               getOrThrow(entityNode.entity.ref, 'Entity not found'),
               operation.text
            )
      );
   }

   protected async renameEntity(entityNode: LogicalEntityNode, entity: LogicalEntity, name: string): Promise<void> {
      entity.name = name;
      const document = findDocument<CrossModelRoot>(entity)!;
      const references = Array.from(
         this.modelState.services.language.references.References.findReferences(entity, { includeDeclaration: false })
      );
      if (references.length === 0 || (references.length === 1 && references[0].sourceUri.fsPath === this.modelState.sourceUri)) {
         // if the diagram is the only reference to the entity, we can safely rename it
         // otherwise we need to ensure to implement proper rename behavior
         entity.id = toId(this.modelState.idProvider.findNextGlobalId(LogicalEntity, toId(entity.name)));
         entityNode.entity = { $refText: toIdReference(entity.id), ref: entity };
      }
      await this.modelState.modelService.save({
         uri: document.uri.toString(),
         model: document.parseResult.value,
         clientId: this.modelState.clientId
      });
   }
}
