/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { Action, DirtyStateChangeReason, ModelState, ModelSubmissionHandler } from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import { CrossModelState } from './cross-model-state.js';

@injectable()
export class CrossModelSubmissionHandler extends ModelSubmissionHandler {
   @inject(ModelState) protected override modelState: CrossModelState;

   override async submitModel(reason?: DirtyStateChangeReason): Promise<Action[]> {
      await this.modelState.ready();
      return super.submitModel(reason);
   }
}
