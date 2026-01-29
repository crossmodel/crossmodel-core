/********************************************************************************
 * MIT License
 * Copyright (c) 2019 Vladyslav Hnatiuk
 * https://github.com/Aksem/sprotty-routing-libavoid
 ********************************************************************************/

import { Bounds, Point } from '@eclipse-glsp/client';
import { Avoid as AvoidInterface, AvoidLib, PolyLine } from 'libavoid-js';

export let Libavoid: AvoidInterface;

export type LibavoidConnEnd = AvoidInterface['ConnEnd'];
export type LibavoidConnRef = AvoidInterface['ConnRef'];
export type LibavoidPoint = AvoidInterface['Point'];
export type LibavoidRectangle = AvoidInterface['Rectangle'];
export type LibavoidRouter = AvoidInterface['Router'];
export type LibavoidObstacle = AvoidInterface['Obstacle'];
export type LibavoidShapeRef = AvoidInterface['ShapeRef'];
export type LibavoidJunctionRef = AvoidInterface['JunctionRef'];
export type LibavoidShapeConnectionPin = AvoidInterface['ShapeConnectionPin'];

// eslint-disable-next-line no-shadow
export enum LibavoidRouteType {
   // eslint-disable-next-line no-shadow
   PolyLine = 1,
   Orthogonal = 2
}

// eslint-disable-next-line no-shadow
export enum LibavoidShapeConnectionDirection {
   None = 0,
   Up = 1,
   Down = 2,
   Left = 4,
   Right = 8,
   All = 15
}

export namespace LibavoidLifecycle {
   export function isLoaded(): boolean {
      try {
         AvoidLib.getInstance();
         return true;
      } catch (error) {
         return false;
      }
   }

   export async function load(): Promise<void> {
      try {
         if (!isLoaded()) {
            await AvoidLib.load();
            Libavoid = AvoidLib.getInstance();
         }
      } catch (loadError) {
         console.error('Failed to load libavoid router:', loadError);
      }
   }
}

export namespace LibavoidConverter {
   export function toRectangle(bounds: Bounds): LibavoidRectangle {
      const topLeft = Bounds.topLeft(bounds);
      const bottomRight = Bounds.bottomRight(bounds);
      return new Libavoid.Rectangle(new Libavoid.Point(topLeft.x, topLeft.y), new Libavoid.Point(bottomRight.x, bottomRight.y));
   }

   export function toPoint(point: Point): LibavoidPoint {
      return new Libavoid.Point(point.x, point.y);
   }

   export function toGPoint(point: LibavoidPoint): Point {
      return { x: point.x, y: point.y };
   }

   export function toGRoute(polyline: PolyLine): Point[] {
      const points: Point[] = [];
      for (let i = 0; i < polyline.size(); i++) {
         const point = polyline.get_ps(i);
         points.push(toGPoint(point));
      }
      return points;
   }
}

export namespace ShapeConnectionPin {
   export const CENTER_PIN_ID = -1;
   export const ORTHOGONAL_PIN_ID = 1;
   export const POLYLINE_PIN_ID = 2;

   export const ATTACH_POS_LEFT = 0;
   export const ATTACH_POS_CENTRE = 0.5;
   export const ATTACH_POS_RIGHT = 1;
   export const ATTACH_POS_TOP = 0;
   export const ATTACH_POS_MIDDLE = 0.5;
   export const ATTACH_POS_BOTTOM = 1;

   export const DIRECTION_ALL = LibavoidShapeConnectionDirection.All.valueOf();
   export const DIRECTION_UP = LibavoidShapeConnectionDirection.Up.valueOf();
   export const DIRECTION_DOWN = LibavoidShapeConnectionDirection.Down.valueOf();
   export const DIRECTION_LEFT = LibavoidShapeConnectionDirection.Left.valueOf();
   export const DIRECTION_RIGHT = LibavoidShapeConnectionDirection.Right.valueOf();
   export const DIRECTION_NONE = LibavoidShapeConnectionDirection.None.valueOf();
}
