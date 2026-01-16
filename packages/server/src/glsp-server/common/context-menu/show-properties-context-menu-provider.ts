/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { ShowPropertiesAction } from '@crossmodel/protocol';
import { ContextActionsProvider, EditorContext, MenuItem } from '@eclipse-glsp/server';
import { injectable } from 'inversify';

/**
 * Provides a context menu action to show the properties panel.
 */
@injectable()
export class ShowPropertiesContextMenuProvider implements ContextActionsProvider {
   contextId = 'context-menu';

   async getActions(editorContext: EditorContext): Promise<MenuItem[]> {
      if (!editorContext.selectedElementIds || editorContext.selectedElementIds.length === 0) {
         return [];
      }

      return [
         {
            id: 'showProperties',
            label: 'Show Properties',
            icon: 'codicon codicon-table',
            group: '_3',
            sortString: '0',
            actions: [ShowPropertiesAction.create({ elementId: editorContext.selectedElementIds[0] })]
         }
      ];
   }
}
