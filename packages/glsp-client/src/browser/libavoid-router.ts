/********************************************************************************
 * MIT License
 * Copyright (c) 2019 Vladyslav Hnatiuk
 * https://github.com/Aksem/sprotty-routing-libavoid
 ********************************************************************************/

import { isLeftPortId } from '@crossmodel/protocol';
import {
   AbstractEdgeRouter,
   Action,
   BoundsAwareModelElement,
   centerOfLine,
   EdgeRouting,
   GConnectableElement,
   GEdge,
   getMatchingElements,
   GParentElement,
   GPort,
   GRoutableElement,
   GRoutingHandle,
   IActionHandler,
   IAnchorComputer,
   ICommand,
   IMultipleEdgesRouter,
   isBoundsAware,
   isConnectable,
   LinearRouteOptions,
   Point,
   ResolvedHandleMove,
   RoutedPoint,
   toAbsoluteBounds,
   translatePoint,
   typeGuard
} from '@eclipse-glsp/client';
import { inject, injectable, optional, postConstruct } from '@theia/core/shared/inversify';
import {
   Libavoid,
   LibavoidConnRef,
   LibavoidConverter,
   LibavoidRouter,
   LibavoidRouteType,
   LibavoidShapeConnectionPin,
   LibavoidShapeRef,
   ShapeConnectionPin
} from './libavoid';
import { getLibavoidEdgeOptions, LibavoidEdge, LibavoidEdgeOptions } from './libavoid-model';
import { DEFAULT_LIBAVOID_EDGE_ROUTER_CONFIG, LibavoidEdgeRouterConfiguration, LibavoidEdgeRouterOptions } from './libavoid-options';

export interface ShapeInfo {
   ref: LibavoidShapeRef;
}

@injectable()
export class LibavoidEdgeRouter extends AbstractEdgeRouter implements IMultipleEdgesRouter, IActionHandler {
   handle(action: Action): ICommand | Action | void {
      throw new Error('Method not implemented.');
   }
   static readonly KIND = 'libavoid';

   @optional() @inject(LibavoidEdgeRouterOptions) protected config: LibavoidEdgeRouterConfiguration = DEFAULT_LIBAVOID_EDGE_ROUTER_CONFIG;

   protected avoidRouter: LibavoidRouter = new Libavoid.Router(Libavoid.OrthogonalRouting);
   protected connectors: { [key: string]: LibavoidConnRef } = {};
   protected connectorSourceTargets: { [key: string]: { sourceId: string; targetId: string } } = {};
   protected shapes: { [key: string]: ShapeInfo } = {};
   protected edgeRouting: EdgeRouting = new EdgeRouting();
   protected changedEdgeIds: string[] = [];

   @postConstruct()
   protected init(): void {
      this.configureRouter(this.config);
   }

   get kind(): string {
      return LibavoidEdgeRouter.KIND;
   }

   configureRouter(options: Partial<LibavoidEdgeRouterConfiguration>): void {
      if (options.routingType) {
         // routingType can not be changed for router instance re-instantiate router
         Libavoid.destroy(this.avoidRouter);
         this.avoidRouter = new Libavoid.Router(options.routingType);
      }
      this.config = { ...this.config, ...options };

      Object.entries(this.config).forEach(([key, value]) => {
         switch (key as keyof LibavoidEdgeRouterConfiguration) {
            case 'segmentPenalty':
            case 'anglePenalty':
            case 'crossingPenalty':
            case 'clusterCrossingPenalty':
            case 'fixedSharedPathPenalty':
            case 'portDirectionPenalty':
            case 'shapeBufferDistance':
            case 'idealNudgingDistance':
            case 'reverseDirectionPenalty':
               this.avoidRouter.setRoutingParameter(Libavoid[key], value as number);
               break;

            case 'nudgeOrthogonalSegmentsConnectedToShapes':
            case 'improveHyperedgeRoutesMovingJunctions':
            case 'penaliseOrthogonalSharedPathsAtConnEnds':
            case 'nudgeOrthogonalTouchingColinearSegments':
            case 'performUnifyingNudgingPreprocessingStep':
            case 'improveHyperedgeRoutesMovingAddingAndDeletingJunctions':
            case 'nudgeSharedPathsWithCommonEndPoint':
               this.avoidRouter.setRoutingOption(Libavoid[key], value as boolean);
               break;

            case 'routingType':
               // nothing to do, this is just a custom option
               break;

            default:
               console.warn(`Unknown routing option: ${key}`);
               break;
         }
      });
   }

   getAllShapeElements(parent: GParentElement): BoundsAwareModelElement[] {
      return getMatchingElements(parent.index, typeGuard(isBoundsAware, isConnectable));
   }

   getFixedTranslatedAnchor(
      connectable: GConnectableElement,
      sourcePoint: Point,
      refPoint: Point,
      refContainer: GParentElement,
      edge: GRoutableElement,
      anchorCorrection = 0
   ): Point {
      const anchor = this.getTranslatedAnchor(connectable, refPoint, refContainer, edge, anchorCorrection);
      // AnchorComputer calculates anchor for edge independent from
      // other edges. If router nudges the edge, it cannot take it into account
      // because only target point is passed, no source point.
      //
      // To fix this, changes in sprotty API are needed.
      // Temporary fix until sprotty API is changed: check whether edge is nudged
      // and fix appropriate coordinate of anchor manually.
      //
      // NOTE: This fix works only for anchor computer that calculates anchor from source
      // node center for orthogonal edge.
      if (sourcePoint.x === refPoint.x) {
         // first edge line is vertical, use x coordinate from router
         return { x: sourcePoint.x, y: anchor.y };
      }
      if (sourcePoint.y === refPoint.y) {
         // first edge line is horizontal, use y coordinate from router
         return { x: anchor.x, y: sourcePoint.y };
      }

      return anchor;
   }

   updateEdgeRouting(connRef: LibavoidConnRef, edge: GEdge): void {
      if (!edge?.source || !edge?.target) {
         return;
      }
      const routedPoints: RoutedPoint[] = [];
      const polyline = connRef.displayRoute();
      const points = LibavoidConverter.toGRoute(polyline);
      const options = getLibavoidEdgeOptions(edge);

      const sourceAnchor: Point = this.getSourceAnchor(edge, points, options);
      routedPoints.push({ kind: 'source', ...sourceAnchor });
      // source and target points are set below separately as anchors, so we skip them
      for (let i = 1; i < points.length - 1; i++) {
         routedPoints.push({ kind: 'linear', pointIndex: i, ...points[i] });
      }
      const targetAnchor = this.getTargetAnchor(edge, points, options);
      routedPoints.push({ kind: 'target', ...targetAnchor });
      this.edgeRouting.set(edge.id, routedPoints);
   }

   protected getSourceAnchor(edge: GEdge, points: Point[], options: LibavoidEdgeOptions): Point {
      return options.routeType === LibavoidRouteType.Orthogonal
         ? points[0]
         : this.getFixedTranslatedAnchor(edge.source!, points[0], points[1] ?? points[0], edge.parent, edge, edge.sourceAnchorCorrection);
   }

   protected getTargetAnchor(edge: GEdge, points: Point[], options: LibavoidEdgeOptions): Point {
      return options.routeType === LibavoidRouteType.Orthogonal
         ? points[points.length - 1]
         : this.getFixedTranslatedAnchor(
              edge.target!,
              points[points.length - 1],
              points[points.length - 2] ?? points[points.length - 1],
              edge.parent,
              edge,
              edge.targetAnchorCorrection
           );
   }

   protected updateShape(element: BoundsAwareModelElement): void {
      const bounds = toAbsoluteBounds(element);
      const shape = LibavoidConverter.toRectangle(bounds);
      const shapeInfo = this.shapes[element.id];
      if (shapeInfo) {
         this.avoidRouter.moveShape(shapeInfo.ref, shape);
         return;
      }

      // create shape with connection pins
      const newShapeRef = new Libavoid.ShapeRef(this.avoidRouter, shape);
      this.shapes[element.id] = { ref: newShapeRef };
      if (element instanceof GPort) {
         if (isLeftPortId(element.id)) {
            this.createPin(
               newShapeRef,
               ShapeConnectionPin.ORTHOGONAL_PIN_ID,
               ShapeConnectionPin.ATTACH_POS_LEFT,
               ShapeConnectionPin.ATTACH_POS_MIDDLE,
               ShapeConnectionPin.DIRECTION_LEFT
            );
         } else {
            this.createPin(
               newShapeRef,
               ShapeConnectionPin.ORTHOGONAL_PIN_ID,
               ShapeConnectionPin.ATTACH_POS_RIGHT,
               ShapeConnectionPin.ATTACH_POS_MIDDLE,
               ShapeConnectionPin.DIRECTION_RIGHT
            );
         }
      } else if (element instanceof GConnectableElement) {
         this.createPin(
            newShapeRef,
            ShapeConnectionPin.ORTHOGONAL_PIN_ID,
            ShapeConnectionPin.ATTACH_POS_CENTRE,
            ShapeConnectionPin.ATTACH_POS_TOP,
            ShapeConnectionPin.DIRECTION_UP
         );
         this.createPin(
            newShapeRef,
            ShapeConnectionPin.ORTHOGONAL_PIN_ID,
            ShapeConnectionPin.ATTACH_POS_LEFT,
            ShapeConnectionPin.ATTACH_POS_MIDDLE,
            ShapeConnectionPin.DIRECTION_LEFT
         );
         this.createPin(
            newShapeRef,
            ShapeConnectionPin.ORTHOGONAL_PIN_ID,
            ShapeConnectionPin.ATTACH_POS_RIGHT,
            ShapeConnectionPin.ATTACH_POS_MIDDLE,
            ShapeConnectionPin.DIRECTION_RIGHT
         );
         this.createPin(
            newShapeRef,
            ShapeConnectionPin.ORTHOGONAL_PIN_ID,
            ShapeConnectionPin.ATTACH_POS_CENTRE,
            ShapeConnectionPin.ATTACH_POS_BOTTOM,
            ShapeConnectionPin.DIRECTION_DOWN
         );
      }
   }

   protected createPin(shape: LibavoidShapeRef, classId: number, x: number, y: number, direction: number): LibavoidShapeConnectionPin {
      const pin = new Libavoid.ShapeConnectionPin(shape, classId, x, y, true, 0, direction);
      pin.setExclusive(false);
      return pin;
   }

   protected updateShapes(edges: GEdge[], parent: GParentElement): void {
      const shapeElements = this.getAllShapeElements(parent);
      for (const element of shapeElements) {
         this.updateShape(element);
      }
      const newShapeIds = shapeElements.map(shape => shape.id);
      for (const prevShapeId of Object.keys(this.shapes)) {
         if (!newShapeIds.includes(prevShapeId)) {
            this.avoidRouter.deleteShape(this.shapes[prevShapeId].ref);
            delete this.shapes[prevShapeId];
         }
      }
   }

   protected updateConnector(edge: GEdge, parent: GParentElement): LibavoidConnRef | undefined {
      const connectionRef = this.connectors[edge.id];
      const trackedSourceTarget = this.connectorSourceTargets[edge.id];

      const sourceTargetChanged = trackedSourceTarget &&
         (trackedSourceTarget.sourceId !== edge.sourceId ||
          trackedSourceTarget.targetId !== edge.targetId);
      if (connectionRef && !sourceTargetChanged) {
         return connectionRef;
      }

      if (connectionRef && sourceTargetChanged) {
         this.avoidRouter.deleteConnector(connectionRef);
         delete this.connectors[edge.id];
         delete this.connectorSourceTargets[edge.id];
      }

      const sourceShape = this.shapes[edge.sourceId];
      if (!sourceShape) {
         return undefined;
      }
      const targetShape = this.shapes[edge.targetId];
      if (!targetShape) {
         return undefined;
      }

      const sourceConnEnd = new Libavoid.ConnEnd(sourceShape.ref, ShapeConnectionPin.ORTHOGONAL_PIN_ID);
      const targetConnEnd = new Libavoid.ConnEnd(targetShape.ref, ShapeConnectionPin.ORTHOGONAL_PIN_ID);
      const options = getLibavoidEdgeOptions(edge);
      const connRef = new Libavoid.ConnRef(this.avoidRouter, sourceConnEnd, targetConnEnd);
      connRef.setCallback(() => this.changedEdgeIds.push(edge.id), connRef);
      if (options.routeType) {
         connRef.setRoutingType(options.routeType);
      }
      if (options.hateCrossings) {
         connRef.setHateCrossings(options.hateCrossings);
      }

      this.connectorSourceTargets[edge.id] = {
         sourceId: edge.sourceId,
         targetId: edge.targetId
      };

      return connRef;
   }

   protected updateConnectors(edges: GEdge[], parent: GParentElement): { [key: string]: GEdge } {
      const edgeById: { [key: string]: GEdge } = {};
      for (const edge of edges) {
         edgeById[edge.id] = edge;
         const connRef = this.updateConnector(edge, parent);
         if (connRef) {
            this.connectors[edge.id] = connRef;
         }
      }

      // check for deleted edges
      const newEdgeIds = edges.map(e => e.id);
      for (const previousEdgeId of Object.keys(this.connectors)) {
         if (!newEdgeIds.includes(previousEdgeId)) {
            this.avoidRouter.deleteConnector(this.connectors[previousEdgeId]);
            delete this.connectors[previousEdgeId];
            delete this.connectorSourceTargets[previousEdgeId];
         }
      }
      return edgeById;
   }

   routeAll(edges: GEdge[], parent: GParentElement): EdgeRouting {
      // transform into libavoid shapes and connectors
      this.updateShapes(edges, parent);
      const edgeById = this.updateConnectors(edges, parent);
      this.avoidRouter.processTransaction();

      // only collected changed edge ids during transaction as the edge may have changed in-between
      this.changedEdgeIds.forEach(edgeId => this.updateEdgeRouting(this.connectors[edgeId], edgeById[edgeId]));
      this.changedEdgeIds = [];
      return this.edgeRouting;
   }

   destroy(): void {
      Libavoid.destroy(this.avoidRouter);
   }

   route(edge: Readonly<LibavoidEdge>, args?: Record<string, unknown>): RoutedPoint[] {
      const route = this.edgeRouting.get(edge.id);
      if (route) {
         return route;
      }
      // edge cannot be routed yet (e.g. pre-rendering phase), but glsp server requires at least
      // two points in route, connect source and target temporarily directly, it will be replaced
      // on next iteration.
      return [
         { kind: 'source', x: edge.source?.position.x || 0, y: edge.source?.position.y || 0 },
         { kind: 'target', x: edge.target?.position.x || 0, y: edge.target?.position.y || 0 }
      ];
   }

   createRoutingHandles(edge: GRoutableElement): void {
      const rpCount = edge.routingPoints.length;
      this.addHandle(edge, 'source', 'routing-point', -2);
      this.addHandle(edge, 'line', 'volatile-routing-point', -1);
      for (let i = 0; i < rpCount; i++) {
         this.addHandle(edge, 'junction', 'routing-point', i);
         this.addHandle(edge, 'line', 'volatile-routing-point', i);
      }
      this.addHandle(edge, 'target', 'routing-point', rpCount);
   }

   applyInnerHandleMoves(edge: GRoutableElement, moves: ResolvedHandleMove[]): void {
      moves.forEach(move => {
         const handle = move.handle;
         const points = edge.routingPoints;
         let index = handle.pointIndex;
         if (handle.kind === 'line') {
            // Upgrade to a proper routing point
            handle.kind = 'junction';
            handle.type = 'routing-point';
            points.splice(index + 1, 0, move.fromPosition || points[Math.max(index, 0)]);
            edge.children.forEach(child => {
               if (child instanceof GRoutingHandle && (child === handle || child.pointIndex > index)) {
                  child.pointIndex++;
               }
            });
            this.addHandle(edge, 'line', 'volatile-routing-point', index);
            this.addHandle(edge, 'line', 'volatile-routing-point', index + 1);
            index++;
         }
         if (index >= 0 && index < points.length) {
            points[index] = move.toPosition;
         }
      });
   }

   getInnerHandlePosition(edge: GRoutableElement, route: RoutedPoint[], handle: GRoutingHandle): Point | undefined {
      if (handle.kind === 'line') {
         const { start, end } = this.findRouteSegment(edge, route, handle.pointIndex);
         if (start !== undefined && end !== undefined) {
            return centerOfLine(start, end);
         }
      }
      return undefined;
   }

   protected getOptions(edge: LibavoidEdge): LinearRouteOptions {
      return {
         minimalPointDistance: 2,
         standardDistance: 20,
         selfEdgeOffset: 0.25
      };
   }

   /**
    * Calculation is similar as in original method, but `minimalSegmentLengthForChildPosition`
    * parameter is introduced (see LibavoidRouterOptions.minimalSegmentLengthForChildPosition for
    * more details) to avoid getting very small segments, that has negative impact for example on
    * placing edge children such as labels.
    */
   protected override calculateSegment(
      edge: LibavoidEdge,
      t: number
   ): { segmentStart: Point; segmentEnd: Point; lambda: number } | undefined {
      const segments = super.calculateSegment(edge, t);

      if (!segments) {
         return undefined;
      }
      let { segmentStart, segmentEnd, lambda } = segments;
      const segmentLength = Point.euclideanDistance(segmentStart, segmentEnd);
      // avoid placing labels on very small segments
      const minSegmentSize =
         this.config.minimalSegmentLengthForChildPosition === undefined ? 20 : this.config.minimalSegmentLengthForChildPosition;
      if (segmentLength < minSegmentSize) {
         const routedPoints = this.route(edge);
         if (routedPoints.length < 2) {
            return undefined;
         }

         // try to find longer segment before segmentStart
         let found = false;
         const segmentStartIndex = routedPoints.findIndex(point => Point.equals(point, segmentStart));
         for (let i = segmentStartIndex - 1; i >= 0; i--) {
            const currentSegmentLength = Point.euclideanDistance(routedPoints[i], routedPoints[i + 1]);
            if (currentSegmentLength > minSegmentSize) {
               segmentStart = routedPoints[i];
               segmentEnd = routedPoints[i + 1];
               lambda = 0.8;
               found = true;
               break;
            }
         }

         if (!found) {
            const segmentEndIndex = segmentStartIndex + 1;
            if (segmentEndIndex < routedPoints.length - 1) {
               // no long enough segment before segmentStart, try to find one after segmentEnd
               for (let i = segmentEndIndex; i < routedPoints.length - 1; i++) {
                  const currentSegmentLength = Point.euclideanDistance(routedPoints[i], routedPoints[i + 1]);
                  if (currentSegmentLength > minSegmentSize) {
                     segmentStart = routedPoints[i];
                     segmentEnd = routedPoints[i + 1];
                     lambda = 0.2;
                     found = true;
                     break;
                  }
               }
            }
         }
      }
      return { segmentStart, segmentEnd, lambda };
   }
}

export function getCenterPoint(element: GConnectableElement): Point {
   // translatePoint
   let x = element.bounds.width / 2;
   let y = element.bounds.height / 2;
   let currentElement = element;
   while (currentElement) {
      if (currentElement.position) {
         x += currentElement.position.x;
         y += currentElement.position.y;
      }

      if (!(currentElement.parent && currentElement.parent.type === 'graph')) {
         currentElement = currentElement.parent as GConnectableElement;
      } else {
         break;
      }
   }
   return { x, y };
}

export function getRelativeAnchor(
   connectable: GConnectableElement,
   refPoint: Point,
   refContainer: GParentElement,
   anchorComputer: IAnchorComputer,
   anchorCorrection = 0
): Point {
   const translatedRefPoint = translatePoint(refPoint, refContainer, connectable.parent);
   const strokeCorrection = 0.5 * connectable.strokeWidth;
   const anchor = anchorComputer.getAnchor(connectable, translatedRefPoint, anchorCorrection + strokeCorrection);
   return {
      x: anchor.x - connectable.bounds.x,
      y: anchor.y - connectable.bounds.y
   };
}
