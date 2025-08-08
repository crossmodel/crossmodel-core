/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { ENTITY_NODE_TYPE, INHERITANCE_EDGE_TYPE, RELATIONSHIP_EDGE_TYPE } from '@crossmodel/protocol';
import { DiagramConfiguration, EdgeTypeHint, ServerLayoutKind, getDefaultMapping } from '@eclipse-glsp/server';
import { injectable } from 'inversify';

@injectable()
export class SystemDiagramConfiguration implements DiagramConfiguration {
   layoutKind = ServerLayoutKind.MANUAL; // we store layout information manually so no automatic layouting is necessary
   needsClientLayout = true; // require layout information from client
   animatedUpdate = true; // use animations during state updates

   typeMapping = getDefaultMapping();

   shapeTypeHints = [
      {
         elementTypeId: ENTITY_NODE_TYPE,
         deletable: true,
         reparentable: false,
         repositionable: true,
         resizable: true
      }
   ];
   edgeTypeHints: EdgeTypeHint[] = [
      {
         elementTypeId: RELATIONSHIP_EDGE_TYPE,
         deletable: true,
         repositionable: false,
         routable: false,
         sourceElementTypeIds: [ENTITY_NODE_TYPE],
         targetElementTypeIds: [ENTITY_NODE_TYPE]
      },
      {
         elementTypeId: INHERITANCE_EDGE_TYPE,
         deletable: true,
         repositionable: false,
         routable: false,
         dynamic: true,
         sourceElementTypeIds: [ENTITY_NODE_TYPE],
         targetElementTypeIds: [ENTITY_NODE_TYPE]
      }
   ];
}
