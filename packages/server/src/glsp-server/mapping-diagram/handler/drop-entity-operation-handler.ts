/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { DropEntityOperation } from '@crossmodel/protocol';
import { Command, JsonOperationHandler, ModelState } from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import { URI } from 'vscode-uri';
import { createSourceObject } from '../../../language-server/util/ast-util.js';
import { CrossModelCommand } from '../../common/cross-model-command.js';
import { MappingModelState } from '../model/mapping-model-state.js';

/**
 * An operation handler for the 'DropEntityOperation' that finds an entity for each of the given file URIs and
 * creates a new source object in the mapping for each of the found entities.
 */
@injectable()
export class MappingDiagramDropEntityOperationHandler extends JsonOperationHandler {
   override operationType = DropEntityOperation.KIND;

   @inject(ModelState) protected override modelState: MappingModelState;

   createCommand(operation: DropEntityOperation): Command {
      return new CrossModelCommand(this.modelState, () => this.createSourceObject(operation));
   }

   protected async createSourceObject(operation: DropEntityOperation): Promise<void> {
      const container = this.modelState.mapping;
      for (const filePath of operation.filePaths) {
         const document = await this.modelState.modelService.request(URI.file(filePath).toString());
         if (document?.root?.entity) {
            const sourceObject = createSourceObject(document.root.entity, container, this.modelState.idProvider);
            container.sources.push(sourceObject);
         }
      }
   }
}
