/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { EnableToolsAction, activateDefaultToolsAction, activateDeleteToolAction } from '@crossmodel/protocol';
import { Args, MaybePromise, PaletteItem, ToolPaletteItemProvider } from '@eclipse-glsp/server';
import { injectable } from 'inversify';

@injectable()
export class MappingToolPaletteProvider extends ToolPaletteItemProvider {
   override getItems(_args?: Args | undefined): MaybePromise<PaletteItem[]> {
      return [
         {
            id: 'default',
            actions: [],
            label: 'default',
            sortString: 'A',
            children: [
               {
                  id: 'default-tool',
                  sortString: '1',
                  label: 'Select',
                  icon: 'inspect',
                  actions: [activateDefaultToolsAction()]
               },
               {
                  id: 'delete-tool',
                  sortString: '2',
                  label: 'Delete',
                  icon: 'chrome-close',
                  actions: [activateDeleteToolAction()]
               },
               {
                  id: 'source-object-create-tool',
                  sortString: '3',
                  label: 'Create Source Object',
                  icon: 'empty-window',
                  actions: [EnableToolsAction.create(['source-object-creation-tool'])]
               },
               {
                  id: 'mapping-create-tool',
                  sortString: '4',
                  label: 'Create Mapping',
                  icon: 'git-compare',
                  actions: [EnableToolsAction.create(['mapping-edge-creation-tool'])]
               }
            ]
         }
      ];
   }
}
