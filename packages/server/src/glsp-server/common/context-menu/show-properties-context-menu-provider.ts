/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { ShowPropertiesAction } from '@crossmodel/protocol';
import { ContextActionsProvider, EditorContext, LabeledAction } from '@eclipse-glsp/server';
import { injectable } from 'inversify';

@injectable()
export class ShowPropertiesContextMenuProvider implements ContextActionsProvider {
   contextId = 'context-menu';

   async getActions(editorContext: EditorContext): Promise<LabeledAction[]> {
      if (!editorContext.selectedElementIds || editorContext.selectedElementIds.length === 0) {
         return [];
      }

      return [
         {
            label: 'Show properties',
            actions: [ShowPropertiesAction.create({ elementId: editorContext.selectedElementIds[0] })]
         }
      ];
   }
}

