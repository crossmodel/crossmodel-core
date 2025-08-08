/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { Command, JsonOperationHandler, LayoutEngine, LayoutOperation, ModelState } from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import { CrossModelCommand } from '../../common/cross-model-command.js';
import { SystemModelState } from '../model/system-model-state.js';

@injectable()
export class SystemDiagramOperationHandler extends JsonOperationHandler {
   override operationType = LayoutOperation.KIND;

   @inject(LayoutEngine) protected layoutEngine: LayoutEngine;
   @inject(ModelState) protected override modelState: SystemModelState;

   override createCommand(operation: LayoutOperation): Command | undefined {
      return new CrossModelCommand(this.modelState, () => this.layout());
   }

   protected async layout(): Promise<void> {
      await this.layoutEngine?.layout();
   }
}
