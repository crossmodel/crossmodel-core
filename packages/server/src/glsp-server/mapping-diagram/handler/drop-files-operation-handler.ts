/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { DropFilesOperation } from '@crossmodel/protocol';
import { Command, JsonOperationHandler } from '@eclipse-glsp/server';
import { injectable } from 'inversify';
import { URI } from 'vscode-uri';
import { createSourceObject } from '../../../language-server/util/ast-util.js';
import { CrossModelCommand } from '../../common/cross-model-command.js';
import { MappingModelState } from '../model/mapping-model-state.js';

/**
 * An operation handler for the 'DropEntityOperation' that finds an entity for each of the given file URIs and
 * creates a new source object in the mapping for each of the found entities.
 */
@injectable()
export class MappingDiagramDropFilesOperationHandler extends JsonOperationHandler {
   override operationType = DropFilesOperation.KIND;

   declare protected modelState: MappingModelState;

   createCommand(operation: DropFilesOperation): Command {
      return new CrossModelCommand(this.modelState, () => this.createSourceObject(operation));
   }

   protected async createSourceObject(operation: DropFilesOperation): Promise<void> {
      const container = this.modelState.mapping;
      for (const filePath of operation.files) {
         const document = await this.modelState.modelService.request(URI.file(filePath).toString());
         if (document?.root?.entity) {
            const sourceObject = createSourceObject(document.root.entity, container, this.modelState.idProvider);
            container.sources.push(sourceObject);
         }
      }
   }
}
