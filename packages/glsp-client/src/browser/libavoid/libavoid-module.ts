/********************************************************************************
 * MIT License
 * Copyright (c) 2019 Vladyslav Hnatiuk
 * https://github.com/Aksem/sprotty-routing-libavoid
 ********************************************************************************/

import { FeatureModule, TYPES } from '@eclipse-glsp/client';

import { DEFAULT_LIBAVOID_EDGE_ROUTER_CONFIG, LibavoidEdgeRouterOptions } from './libavoid-options';
import { LibavoidEdgeRouter } from './libavoid-router';
import { LibavoidDiamondAnchor, LibavoidEllipseAnchor, LibavoidRectangleAnchor } from './libavoid-router-anchors';

export const libAvoidModule = new FeatureModule(
   bind => {
      bind(LibavoidEdgeRouter).toSelf().inSingletonScope();
      bind(LibavoidEdgeRouterOptions).toConstantValue(DEFAULT_LIBAVOID_EDGE_ROUTER_CONFIG);
      bind(TYPES.IEdgeRouter).toService(LibavoidEdgeRouter);
      bind(TYPES.IAnchorComputer).to(LibavoidDiamondAnchor).inSingletonScope();
      bind(TYPES.IAnchorComputer).to(LibavoidEllipseAnchor).inSingletonScope();
      bind(TYPES.IAnchorComputer).to(LibavoidRectangleAnchor).inSingletonScope();
   },
   { featureId: Symbol('libAvoid') }
);
