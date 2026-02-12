/********************************************************************************
 * MIT License
 * Copyright (c) 2019 Vladyslav Hnatiuk
 * https://github.com/Aksem/sprotty-routing-libavoid
 ********************************************************************************/

import {
   DIAMOND_ANCHOR_KIND,
   EllipseAnchor,
   ELLIPTIC_ANCHOR_KIND,
   IAnchorComputer,
   ManhattanDiamondAnchor,
   RectangleAnchor,
   RECTANGULAR_ANCHOR_KIND
} from '@eclipse-glsp/client';
import { injectable } from '@theia/core/shared/inversify';
import { LibavoidEdgeRouter } from './libavoid-router';

@injectable()
export class LibavoidEllipseAnchor extends EllipseAnchor implements IAnchorComputer {
   override get kind(): string {
      return LibavoidEdgeRouter.KIND + ':' + ELLIPTIC_ANCHOR_KIND;
   }
}

@injectable()
export class LibavoidRectangleAnchor extends RectangleAnchor implements IAnchorComputer {
   override get kind(): string {
      return LibavoidEdgeRouter.KIND + ':' + RECTANGULAR_ANCHOR_KIND;
   }
}

// Use ManhattanDiamondAnchor instead DiamondAnchor, because it calculates
// lines to diamond sides, not rectangle around diamond
@injectable()
export class LibavoidDiamondAnchor extends ManhattanDiamondAnchor implements IAnchorComputer {
   override get kind(): string {
      return LibavoidEdgeRouter.KIND + ':' + DIAMOND_ANCHOR_KIND;
   }
}
