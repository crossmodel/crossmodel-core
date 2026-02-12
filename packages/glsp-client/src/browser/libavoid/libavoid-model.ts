/********************************************************************************
 * MIT License
 * Copyright (c) 2019 Vladyslav Hnatiuk
 * https://github.com/Aksem/sprotty-routing-libavoid
 ********************************************************************************/

import { GEdge } from '@eclipse-glsp/client';
import { LibavoidRouteType, LibavoidShapeConnectionDirection } from './libavoid';

export interface LibavoidEdgeOptions {
   /**
    * Default: routing type of router
    */
   routeType?: LibavoidRouteType;
   /**
    * Default: Directions.ALL
    */
   sourceVisibleDirections?: LibavoidShapeConnectionDirection;
   /**
    * Default: Directions.ALL
    */
   targetVisibleDirections?: LibavoidShapeConnectionDirection;
   /**
    * Default: false
    */
   hateCrossings?: boolean;
}

export class LibavoidEdge extends GEdge implements LibavoidEdgeOptions {
   routeType?: LibavoidRouteType;
   hateCrossings?: boolean = true;
   sourceVisibleDirections?: LibavoidShapeConnectionDirection;
   targetVisibleDirections?: LibavoidShapeConnectionDirection;
}

export function getLibavoidEdgeOptions(obj: any): LibavoidEdgeOptions {
   const libavoidEdge = obj as LibavoidEdgeOptions;
   return {
      routeType: libavoidEdge?.routeType,
      hateCrossings: libavoidEdge?.hateCrossings,
      sourceVisibleDirections: libavoidEdge?.sourceVisibleDirections,
      targetVisibleDirections: libavoidEdge?.targetVisibleDirections
   };
}
