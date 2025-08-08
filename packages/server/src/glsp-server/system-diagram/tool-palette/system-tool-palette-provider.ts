/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import {
   ENTITY_NODE_TYPE,
   INHERITANCE_EDGE_TYPE,
   ModelStructure,
   RELATIONSHIP_EDGE_TYPE,
   activateDefaultToolsAction,
   activateDeleteToolAction
} from '@crossmodel/protocol';
import {
   Args,
   MaybePromise,
   PaletteItem,
   ToolPaletteItemProvider,
   TriggerEdgeCreationAction,
   TriggerNodeCreationAction
} from '@eclipse-glsp/server';
import { injectable } from 'inversify';

@injectable()
export class SystemToolPaletteProvider extends ToolPaletteItemProvider {
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
                  label: 'Select & Move',
                  icon: 'inspect',
                  actions: [activateDefaultToolsAction()]
               },
               {
                  id: 'hide-tool',
                  sortString: '2',
                  label: 'Hide',
                  icon: 'eye-closed',
                  actions: [activateDeleteToolAction()]
               },
               {
                  id: 'entity-show-tool',
                  sortString: '3',
                  label: 'Show Entity',
                  icon: 'eye',
                  actions: [TriggerNodeCreationAction.create(ENTITY_NODE_TYPE, { args: { type: 'show' } })]
               },
               {
                  id: 'entity-create-tool',
                  sortString: '4',
                  label: 'Create Entity',
                  icon: ModelStructure.LogicalEntity.ICON,
                  actions: [TriggerNodeCreationAction.create(ENTITY_NODE_TYPE, { args: { type: 'create' } })]
               },
               {
                  id: 'relationship-create-tool',
                  sortString: '5',
                  label: 'Create Relationship',
                  icon: ModelStructure.Relationship.ICON,
                  actions: [TriggerEdgeCreationAction.create(RELATIONSHIP_EDGE_TYPE)]
               },
               {
                  id: 'inheritance-create-tool',
                  sortString: '6',
                  label: 'Create Inheritance',
                  icon: 'type-hierarchy-super',
                  actions: [TriggerEdgeCreationAction.create(INHERITANCE_EDGE_TYPE, { args: { cssClasses: 'diagram-edge inheritance' } })]
               }
            ]
         }
      ];
   }
}
