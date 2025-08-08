/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { AddSourceObjectOperation } from '@crossmodel/protocol';
import { Command, JsonOperationHandler, ModelState } from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import { SourceObject } from '../../../language-server/generated/ast.js';
import { createSourceObject } from '../../../language-server/util/ast-util.js';
import { CrossModelCommand } from '../../common/cross-model-command.js';
import { MappingModelState } from '../model/mapping-model-state.js';

/**
 * An operation handler for the 'AddSourceObjectOperation' that resolves the referenced entity by name and creates a source object form it.
 */
@injectable()
export class MappingDiagramAddSourceObjectOperationHandler extends JsonOperationHandler {
   override operationType = AddSourceObjectOperation.KIND;
   @inject(ModelState) protected override modelState: MappingModelState;

   createCommand(operation: AddSourceObjectOperation): Command {
      return new CrossModelCommand(this.modelState, () => this.addSourceObject(operation));
   }

   protected async addSourceObject(operation: AddSourceObjectOperation): Promise<void> {
      const container = this.modelState.mapping;
      const scope = this.modelState.services.language.references.ScopeProvider.getCompletionScope({
         container: { globalId: this.modelState.mapping.id! },
         syntheticElements: [{ property: 'sources', type: SourceObject }],
         property: 'entity'
      });
      const entityDescription = scope.elementScope.getElement(operation.entityName);
      if (entityDescription) {
         const sourceObject = createSourceObject(entityDescription, container, this.modelState.idProvider);
         container.sources.push(sourceObject);
      }
   }
}
