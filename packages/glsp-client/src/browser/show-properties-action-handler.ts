/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { ShowPropertiesAction } from '@crossmodel/protocol';
import { Action, IActionHandler, ICommand } from '@eclipse-glsp/client';
import { ApplicationShell } from '@theia/core/lib/browser';
import { CommandService } from '@theia/core/lib/common';
import { inject, injectable } from '@theia/core/shared/inversify';

const PROPERTY_VIEW_ID = 'property-view';
const PROPERTY_VIEW_TOGGLE_COMMAND = 'property-view:toggle';

/**
 * Handles the ShowPropertiesAction by toggling the property panel visibility.
 */
@injectable()
export class ShowPropertiesActionHandler implements IActionHandler {
   constructor(
      @inject(ApplicationShell) protected readonly shell: ApplicationShell,
      @inject(CommandService) protected readonly commandService: CommandService
   ) {}

   handle(action: Action): ICommand | Action | void {
      if (!ShowPropertiesAction.is(action)) {
         return;
      }

      const propertyWidget = this.shell.getWidgets('right').find(widget => widget.id === PROPERTY_VIEW_ID);
      const isVisible = propertyWidget?.isVisible ?? false;

      if (!isVisible) {
         this.commandService.executeCommand(PROPERTY_VIEW_TOGGLE_COMMAND);
      }
   }
}
