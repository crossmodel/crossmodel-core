/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { GRID } from '@crossmodel/protocol';
import { Point } from '@eclipse-glsp/server';

export class Grid {
   public static GRID_X = GRID.x;
   public static GRID_Y = GRID.y;

   public static snap(originalPoint: Point | undefined): Point | undefined {
      if (originalPoint) {
         return {
            x: Math.round(originalPoint.x / this.GRID_X) * this.GRID_X,
            y: Math.round(originalPoint.y / this.GRID_Y) * this.GRID_Y
         };
      } else {
         return undefined;
      }
   }
}
