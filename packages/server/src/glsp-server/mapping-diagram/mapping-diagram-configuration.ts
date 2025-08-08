/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import {
   SOURCE_NUMBER_NODE_TYPE,
   SOURCE_OBJECT_NODE_TYPE,
   SOURCE_STRING_NODE_TYPE,
   TARGET_ATTRIBUTE_MAPPING_EDGE_TYPE,
   TARGET_OBJECT_NODE_TYPE
} from '@crossmodel/protocol';
import { DefaultTypes, DiagramConfiguration, ServerLayoutKind, ShapeTypeHint, getDefaultMapping } from '@eclipse-glsp/server';
import { injectable } from 'inversify';

@injectable()
export class MappingDiagramConfiguration implements DiagramConfiguration {
   layoutKind = ServerLayoutKind.AUTOMATIC;
   needsClientLayout = true; // require layout information from client
   animatedUpdate = true; // use animations during state updates

   typeMapping = getDefaultMapping();

   shapeTypeHints = [
      createDeleteOnlyShapeHint(SOURCE_OBJECT_NODE_TYPE),
      createDeleteOnlyShapeHint(SOURCE_NUMBER_NODE_TYPE),
      createDeleteOnlyShapeHint(SOURCE_STRING_NODE_TYPE),
      createViewOnlyShapeHint(TARGET_OBJECT_NODE_TYPE)
   ];
   edgeTypeHints = [
      {
         elementTypeId: TARGET_ATTRIBUTE_MAPPING_EDGE_TYPE,
         deletable: true,
         repositionable: false,
         routable: false,
         sourceElementTypeIds: [DefaultTypes.PORT],
         targetElementTypeIds: [DefaultTypes.PORT]
      }
   ];
}

function createDeleteOnlyShapeHint(elementTypeId: string): ShapeTypeHint {
   return {
      ...createViewOnlyShapeHint(elementTypeId),
      deletable: true
   };
}

function createViewOnlyShapeHint(elementTypeId: string): ShapeTypeHint {
   return {
      elementTypeId,
      deletable: false,
      reparentable: false,
      repositionable: false,
      resizable: false
   };
}
