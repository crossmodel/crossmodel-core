/* ******************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { ExpandNavigatorForNewFileAction } from '@crossmodel/protocol';
import { Action, IActionHandler, ICommand } from '@eclipse-glsp/client';
import { CommandService } from '@theia/core/lib/common';
import { inject, injectable } from '@theia/core/shared/inversify';

const EXPAND_NEW_FILE_COMMAND_ID = '_crossmodel.expandNavigatorForNewFile';

/**
 * Handles ExpandNavigatorForNewFileAction by executing a command to expand the File Explorer.
 */
@injectable()
export class ExpandNavigatorActionHandler implements IActionHandler {
   constructor(@inject(CommandService) protected readonly commandService: CommandService) {}

   handle(action: Action): ICommand | Action | void {
      if (!ExpandNavigatorForNewFileAction.is(action)) {
         return;
      }
      const parentUri = action.parentUri;
      const uri = action.uri;
      if (!parentUri || !uri) {
         return;
      }
      this.commandService.executeCommand(EXPAND_NEW_FILE_COMMAND_ID, parentUri, uri);
   }
}
