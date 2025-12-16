/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { Command, CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core';
import { CommonMenus } from '@theia/core/lib/browser';
import { injectable } from '@theia/core/shared/inversify';

const ONLINE_HELP_COMMAND: Command = {
   id: 'crossmodel.online.help',
   label: 'Online Help'
};

@injectable()
export class HelpMenuContribution implements CommandContribution, MenuContribution {
   registerCommands(registry: CommandRegistry): void {
      registry.registerCommand(ONLINE_HELP_COMMAND, {
         execute: () => {
            // open external documentation in a new tab/window
            try {
               window.open('https://help.crossmodel.io/', '_blank', 'noopener');
            } catch (e) {
               // fallback
               window.open('https://help.crossmodel.io/');
            }
         }
      });
   }

   registerMenus(menus: MenuModelRegistry): void {
      menus.registerMenuAction(CommonMenus.HELP, {
         commandId: ONLINE_HELP_COMMAND.id,
         label: ONLINE_HELP_COMMAND.label,
         order: 'b'
      });
   }
}
