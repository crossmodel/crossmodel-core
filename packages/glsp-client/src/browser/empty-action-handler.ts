/********************************************************************************
 * Copyright (c) 2026 CrossBreeze.
 ********************************************************************************/

import { Action, IActionHandler, ICommand } from '@eclipse-glsp/client';
import { injectable } from 'inversify';

@injectable()
export class EmptyActionHandler implements IActionHandler {
   handle(action: Action): ICommand | Action | void {
      // purposefully do nothing
   }
}
