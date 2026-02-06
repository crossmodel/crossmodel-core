/********************************************************************************
 * Copyright (c) 2026 CrossBreeze.
 ********************************************************************************/
import { HAS_MANUAL_ROUTING_POINTS } from '@crossmodel/protocol';
import {
   Action,
   EdgeEditListener,
   EdgeEditTool,
   EditorContextService,
   FeedbackEdgeRouteMovingMouseListener,
   FeedbackEdgeSourceMovingMouseListener,
   FeedbackEdgeTargetMovingMouseListener,
   MoveAction,
   MoveableRoutingHandle,
   findParentByFeature,
   isRoutable,
   isRoutingHandle,
   toElementAndRoutingPoints
} from '@eclipse-glsp/client';
import { ChangeRoutingPointsOperation } from '@eclipse-glsp/protocol';
import { inject } from 'inversify';

export class CrossModelEdgeEditTool extends EdgeEditTool {
   static isDraggingRoutingHandle = false;
   @inject(EditorContextService) override editorContext: EditorContextService;
   readonly latestRoutingPoints = new Map<string, { x: number; y: number }[]>();

   override enable(): void {
      this.edgeEditListener = new CrossModelEdgeEditListener(this);

      this.feedbackEdgeSourceMovingListener = new FeedbackEdgeSourceMovingMouseListener(this.anchorRegistry, this.feedbackDispatcher);
      this.feedbackEdgeTargetMovingListener = new FeedbackEdgeTargetMovingMouseListener(this.anchorRegistry, this.feedbackDispatcher);
      this.feedbackMovingListener = new CrossModelFeedbackEdgeRouteMovingMouseListener(
         this,
         this.changeBoundsManager,
         this.edgeRouterRegistry
      );

      this.toDisposeOnDisable.push(
         this.edgeEditListener,
         this.mouseTool.registerListener(this.edgeEditListener),
         this.feedbackEdgeSourceMovingListener,
         this.feedbackEdgeTargetMovingListener,
         this.feedbackMovingListener,
         this.selectionService.addListener(this.edgeEditListener)
      );
   }
}

class CrossModelFeedbackEdgeRouteMovingMouseListener extends FeedbackEdgeRouteMovingMouseListener {
   constructor(
      protected readonly tool: CrossModelEdgeEditTool,
      changeBoundsManager: any,
      edgeRouterRegistry?: any
   ) {
      super(changeBoundsManager, edgeRouterRegistry);
   }

   override mouseDown(target: any, event: MouseEvent): Action[] {
      const result = super.mouseDown(target, event);
      if (event.button === 0 && findParentByFeature(target, isRoutingHandle)) {
         CrossModelEdgeEditTool.isDraggingRoutingHandle = true;
      }
      return result;
   }

   protected override moveRoutingHandles(target: any, event: MouseEvent): Action[] {
      const directHandle = findParentByFeature(target, isRoutingHandle);
      const routingHandlesToMove = directHandle
         ? [new MoveableRoutingHandle(directHandle, this.getHandlePosition(directHandle)!)].filter(Boolean)
         : this.getRoutingHandlesToMove(target);
      const move = this.tracker.moveElements(routingHandlesToMove, { snap: false, restrict: false });
      if (move.elementMoves.length === 0) {
         return [];
      }
      this.tracker.updateTrackingPosition(move);

      // Apply handle moves to the underlying edge so routingPoints update during drag
      move.elementMoves.forEach(elementMove => {
         const actualHandle = target?.root?.index?.getById(elementMove.element.id);
         if (!isRoutingHandle(actualHandle)) {
            return;
         }
         const mainHandle = (this.tool as CrossModelEdgeEditTool).editorContext.modelRoot.index.getById(actualHandle.id);
         const effectiveHandle = isRoutingHandle(mainHandle) ? mainHandle : actualHandle;
         const parent = effectiveHandle.parent;
         if (!isRoutable(parent) || !this.edgeRouterRegistry) {
            // eslint-disable-next-line no-console
            console.log('[routing-debug][client] no routerRegistry or parent not routable', {
               parentId: parent?.id,
               hasRegistry: !!this.edgeRouterRegistry
            });
            return;
         }
         const router: any = this.edgeRouterRegistry.get(parent.routerKind);
         if (!router?.applyHandleMoves && !router?.applyInnerHandleMoves) {
            // eslint-disable-next-line no-console
            console.log('[routing-debug][client] router has no applyHandleMoves', parent.routerKind);
            return;
         }
         const route = router.route(parent);
         const fromPosition = router.getHandlePosition(parent, route, effectiveHandle) ?? elementMove.toPosition;
         // eslint-disable-next-line no-console
         console.log('[routing-debug][client] applyHandleMoves', {
            edgeId: parent.id,
            handleId: effectiveHandle.id,
            handleKind: effectiveHandle.kind,
            pointIndex: effectiveHandle.pointIndex,
            fromPosition,
            toPosition: elementMove.toPosition
         });
         if (router.applyInnerHandleMoves) {
            router.applyInnerHandleMoves(parent, [{ handle: effectiveHandle, fromPosition, toPosition: elementMove.toPosition }]);
         } else {
            router.applyHandleMoves(parent, [{ handle: effectiveHandle, fromPosition, toPosition: elementMove.toPosition }]);
         }
         (parent as any).args = { ...((parent as any).args ?? {}), [HAS_MANUAL_ROUTING_POINTS]: true };
         const mainEdge = (this.tool as CrossModelEdgeEditTool).editorContext.modelRoot.index.getById(parent.id);
         if (mainEdge && isRoutable(mainEdge)) {
            mainEdge.routingPoints = parent.routingPoints.map(point => ({ x: point.x, y: point.y }));
            (mainEdge as any).args = { ...((mainEdge as any).args ?? {}), [HAS_MANUAL_ROUTING_POINTS]: true };
         }
         this.tool.latestRoutingPoints.set(
            parent.id,
            parent.routingPoints.map(point => ({ x: point.x, y: point.y }))
         );
         // eslint-disable-next-line no-console
         console.log('[routing-debug][client] routingPoints after apply', parent.routingPoints);
      });

      return [
         MoveAction.create(
            move.elementMoves.map(elementMove => ({ elementId: elementMove.element.id, toPosition: elementMove.toPosition })),
            { animate: false }
         )
      ];
   }

   override draggingMouseUp(target: any, event: MouseEvent): Action[] {
      CrossModelEdgeEditTool.isDraggingRoutingHandle = false;
      return super.draggingMouseUp(target, event);
   }

   override nonDraggingMouseUp(target: any, event: MouseEvent): Action[] {
      CrossModelEdgeEditTool.isDraggingRoutingHandle = false;
      return super.nonDraggingMouseUp(target, event);
   }
}

class CrossModelEdgeEditListener extends EdgeEditListener {
   override selectionChanged(root: Readonly<any>, selectedElements: string[]): void {
      if (CrossModelEdgeEditTool.isDraggingRoutingHandle) {
         return;
      }
      super.selectionChanged(root, selectedElements);
   }

   override mouseUp(target: any, event: MouseEvent): Action[] {
      const actions = super.mouseUp(target, event);
      return actions
         .map(action => {
            if (!ChangeRoutingPointsOperation.is(action)) {
               return action;
            }

            const edge = this.edge ? target?.root?.index?.getById(this.edge.id) : undefined;
            if (!edge || !isRoutable(edge)) {
               return action;
            }
            const latest = (this.tool as CrossModelEdgeEditTool).latestRoutingPoints.get(edge.id);
            // eslint-disable-next-line no-console
            console.log('[routing-debug][client] mouseUp routingPoints', {
               edgeId: edge.id,
               latest,
               edgeRoutingPoints: edge.routingPoints
            });
            if (latest && latest.length > 0) {
               (this.tool as CrossModelEdgeEditTool).latestRoutingPoints.delete(edge.id);
               return ChangeRoutingPointsOperation.create([{ elementId: edge.id, newRoutingPoints: latest }]);
            }
            const elementAndRoutingPoints = toElementAndRoutingPoints(edge);
            return ChangeRoutingPointsOperation.create([elementAndRoutingPoints]);
         })
         .filter((action): action is Action => action !== undefined);
   }
}
