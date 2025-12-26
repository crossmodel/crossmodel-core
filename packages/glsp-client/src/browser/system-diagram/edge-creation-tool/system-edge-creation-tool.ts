/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import {
   Action,
   AnchorComputerRegistry,
   Bounds,
   Connectable,
   CreateEdgeOperation,
   CursorCSS,
   Disposable,
   DragAwareMouseListener,
   DrawFeedbackEdgeAction,
   EdgeCreationTool,
   EnableDefaultToolsAction,
   FeedbackEdgeEnd,
   FeedbackEdgeEndMovingMouseListener,
   FeedbackEmitter,
   GConnectableElement,
   GEdge,
   GEdgeSchema,
   GGraph,
   GModelElement,
   HoverFeedbackAction,
   IActionDispatcher,
   IFeedbackActionDispatcher,
   ITypeHintProvider,
   ModifyCSSFeedbackAction,
   MoveAction,
   Point,
   RemoveFeedbackEdgeAction,
   RequestCheckEdgeAction,
   SetUIExtensionVisibilityAction,
   TriggerEdgeCreationAction,
   cursorFeedbackAction,
   defaultFeedbackEdgeSchema,
   feedbackEdgeEndId,
   findParentByFeature,
   getAbsolutePosition,
   isBoundsAware,
   isConnectable,
   toAbsoluteBounds
} from '@eclipse-glsp/client';

import { injectable } from '@theia/core/shared/inversify';
import { RelationshipCommandPalette } from '../../cross-model-command-palette';

const CSS_EDGE_CREATION = 'edge-creation';
const CSS_SOURCE_HIGHLIGHT = 'source-highlight';

@injectable()
export class SystemEdgeCreationTool extends EdgeCreationTool {
   protected creationMouseListener: SystemEdgeCreationToolMouseListener;

   protected override creationListener(): void {
      this.creationMouseListener = new SystemEdgeCreationToolMouseListener(
         this.triggerAction,
         this.actionDispatcher,
         this.typeHintProvider,
         this
      );
      this.toDisposeOnDisable.push(this.creationMouseListener, this.mouseTool.registerListener(this.creationMouseListener));
   }

   override trackFeedbackEdge(): void {
      const mouseMovingFeedback = new SystemFeedbackEndMover(this.anchorRegistry, this.feedbackDispatcher, this.creationMouseListener);
      this.toDisposeOnDisable.push(mouseMovingFeedback, this.mouseTool.registerListener(mouseMovingFeedback));
   }

   protected override toolFeedback(): void {
      const toolFeedback = this.createFeedbackEmitter()
         .add(ModifyCSSFeedbackAction.create({ add: [CSS_EDGE_CREATION] }), ModifyCSSFeedbackAction.create({ remove: [CSS_EDGE_CREATION] }))
         .submit();
      this.toDisposeOnDisable.push(toolFeedback);
   }
}

export interface ConnectionContext {
   element?: GModelElement & Connectable;
   canConnect?: boolean;
}

export interface DragConnectionContext {
   element: GModelElement & Connectable;
   dragStart: Point;
}

export class SystemFeedbackEndMover extends FeedbackEdgeEndMovingMouseListener {
   constructor(
      anchorRegistry: AnchorComputerRegistry,
      feedbackDispatcher: IFeedbackActionDispatcher,
      protected creationListener: SystemEdgeCreationToolMouseListener
   ) {
      super(anchorRegistry, feedbackDispatcher);
   }

   // Override and use the connection context of the creation mouse listener to only snap to valid targets
   override mouseMove(target: GModelElement, event: MouseEvent): Action[] {
      const root = target.root;
      const edgeEnd = root.index.getById(feedbackEdgeEndId(root));
      if (!(edgeEnd instanceof FeedbackEdgeEnd) || !edgeEnd.feedbackEdge) {
         return [];
      }

      const edge = edgeEnd.feedbackEdge;
      const position = getAbsolutePosition(edgeEnd, event);
      const context = this.creationListener.currentConnectionContext;
      if (context && context.element instanceof GConnectableElement && context.canConnect && edge.source && isBoundsAware(edge.source)) {
         const anchor = this.computeAbsoluteAnchor(context.element, Bounds.center(toAbsoluteBounds(edge.source)));
         if (Point.euclideanDistance(anchor, edgeEnd.position) > 1) {
            this.feedback.add(MoveAction.create([{ elementId: edgeEnd.id, toPosition: anchor }], { animate: false })).submit();
         }
      } else {
         this.feedback.add(MoveAction.create([{ elementId: edgeEnd.id, toPosition: position }], { animate: false })).submit();
      }

      return [];
   }
}

export class SystemEdgeCreationToolMouseListener extends DragAwareMouseListener implements Disposable {
   protected source?: string;
   protected target?: string;
   protected proxyEdge: GEdge;

   protected dragContext?: DragConnectionContext;
   protected mouseMoveFeedback: FeedbackEmitter;
   protected sourceFeedback: FeedbackEmitter;
   protected feedbackEdgeFeedback: FeedbackEmitter;
   protected connectionContext?: ConnectionContext;
   protected pendingDynamicCheck = false;

   constructor(
      protected triggerAction: TriggerEdgeCreationAction,
      protected actionDispatcher: IActionDispatcher,
      protected typeHintProvider: ITypeHintProvider,
      protected tool: EdgeCreationTool
   ) {
      super();
      this.proxyEdge = new GEdge();
      this.proxyEdge.type = triggerAction.elementTypeId;
      this.feedbackEdgeFeedback = tool.createFeedbackEmitter();
      this.mouseMoveFeedback = tool.createFeedbackEmitter();
      this.sourceFeedback = tool.createFeedbackEmitter();
   }

   get currentConnectionContext(): ConnectionContext | undefined {
      return this.connectionContext;
   }

   protected isSourceSelected(): boolean {
      return this.source !== undefined;
   }

   protected isTargetSelected(): boolean {
      return this.target !== undefined;
   }

   override mouseDown(target: GModelElement, event: MouseEvent): Action[] {
      const result = super.mouseDown(target, event);
      if (event.button === 0 && !this.isSourceSelected()) {
         // update the current target
         const context = this.calculateNewContext(target, true);
         if (context.element && context.canConnect) {
            this.dragContext = { element: context.element, dragStart: { x: event.clientX, y: event.clientY } };
         }
      }
      return result;
   }

   override mouseMove(target: GModelElement, event: MouseEvent): Action[] {
      const result = super.mouseMove(target, event);
      if (this.isMouseDrag && this.dragContext && !this.isSourceSelected()) {
         const dragDistance = Point.maxDistance(this.dragContext.dragStart, { x: event.clientX, y: event.clientY });
         if (dragDistance > 3) {
            // assign source if possible
            this.source = this.dragContext.element.id;
            let edgeSchema: Partial<GEdgeSchema> | undefined = undefined;
            // add css classes to the edge if specified in trigger action
            if (this.triggerAction.args?.cssClasses) {
               const cssClasses = this.triggerAction.args?.cssClasses.toString().split(' ');
               defaultFeedbackEdgeSchema.cssClasses?.forEach(cssClass => cssClasses.push(cssClass));
               edgeSchema = { cssClasses };
            }

            this.feedbackEdgeFeedback
               .add(
                  DrawFeedbackEdgeAction.create({ elementTypeId: this.triggerAction.elementTypeId, sourceId: this.source, edgeSchema }),
                  RemoveFeedbackEdgeAction.create()
               )
               .submit();

            // source element feedback
            if (this.isSourceSelected()) {
               this.sourceFeedback
                  .add(
                     ModifyCSSFeedbackAction.create({ elements: [this.source], add: [CSS_SOURCE_HIGHLIGHT] }),
                     ModifyCSSFeedbackAction.create({ elements: [this.source], remove: [CSS_SOURCE_HIGHLIGHT] })
                  )
                  .submit();
            }
            this.dragContext = undefined;
         }
      }
      this.updateFeedback(target);
      return result;
   }

   override draggingMouseUp(target: GModelElement, event: MouseEvent): Action[] {
      const result = super.draggingMouseUp(target, event);
      if (this.isSourceSelected()) {
         const context = this.calculateNewContext(target, true);
         if (context.element && context.canConnect) {
            this.target = context.element.id;
            result.push(
               CreateEdgeOperation.create({
                  elementTypeId: this.triggerAction.elementTypeId,
                  sourceElementId: this.source!,
                  targetElementId: this.target,
                  args: this.triggerAction.args
               })
            );
            if (this.triggerAction.args?.singleUse) {
               result.push(EnableDefaultToolsAction.create());
            }
         }
      }
      this.dispose();
      this.updateFeedback(target);
      return result;
   }

   override nonDraggingMouseUp(element: GModelElement, event: MouseEvent): Action[] {
      this.dispose();
      this.updateFeedback(element);
      const result: Action[] = [];
      if (this.triggerAction.args?.type === 'show') {
         result.push(
            SetUIExtensionVisibilityAction.create({
               extensionId: RelationshipCommandPalette.PALETTE_ID,
               visible: true
            })
         );
      }
      return result;
   }

   protected canConnect(element: GModelElement | undefined, role: 'source' | 'target'): boolean {
      if (
         !element ||
         !isConnectable(element) ||
         !element.canConnect(this.proxyEdge, role) ||
         (role === 'target' && this.source === element.id)
      ) {
         return false;
      }
      if (!this.isDynamic(this.proxyEdge.type)) {
         return true;
      }
      const sourceElement = this.source ?? element;
      const targetElement = this.source ? element : undefined;

      this.pendingDynamicCheck = true;
      // Request server edge check
      this.actionDispatcher
         .request(RequestCheckEdgeAction.create({ sourceElement, targetElement, edgeType: this.proxyEdge.type }))
         .then(result => {
            if (this.pendingDynamicCheck) {
               this.connectionContext = { canConnect: result.isValid, element };
               this.pendingDynamicCheck = false;
               this.updateFeedback(element, true);
            }
         })
         .catch(err => console.error('Dynamic edge check failed with: ', err));
      // Temporarily mark the target as invalid while we wait for the server response,
      return false;
   }

   protected isDynamic(edgeTypeId: string): boolean {
      const typeHint = this.typeHintProvider.getEdgeTypeHint(edgeTypeId);
      return typeHint?.dynamic ?? false;
   }

   protected updateFeedback(target: GModelElement, forceUpdate?: boolean): void {
      const context = this.calculateNewContext(target, forceUpdate ? true : undefined);
      if (!context) {
         return;
      }

      if (this.pendingDynamicCheck) {
         return;
      }

      // cursor feedback
      // if the context is invalid or the target is the root graph we show the default cursor
      if (!context.element || target instanceof GGraph) {
         this.registerFeedback([cursorFeedbackAction()]);
         return;
      }

      if (this.isSourceSelected() && !context.canConnect) {
         this.registerFeedback([cursorFeedbackAction(CursorCSS.OPERATION_NOT_ALLOWED)], [cursorFeedbackAction()]);
         return;
      }

      const cursorCss = this.isSourceSelected() ? CursorCSS.EDGE_CREATION_TARGET : CursorCSS.EDGE_CREATION_SOURCE;
      this.registerFeedback(
         [cursorFeedbackAction(cursorCss), HoverFeedbackAction.create({ mouseoverElement: context.element.id, mouseIsOver: true })],
         [cursorFeedbackAction(), HoverFeedbackAction.create({ mouseoverElement: context.element.id, mouseIsOver: false })]
      );
   }

   protected registerFeedback(feedbackActions: Action[], cleanupActions?: Action[]): void {
      this.mouseMoveFeedback.dispose();
      feedbackActions.forEach(action => this.mouseMoveFeedback.add(action));
      if (cleanupActions) {
         this.mouseMoveFeedback.add(undefined, cleanupActions);
      }
      this.mouseMoveFeedback.submit();
   }

   /**
    * Recalculates the connection context based on the current target element and the event.
    * @returns the new connection context or the current context if the context did not change
    */
   protected calculateNewContext(target: GModelElement, returnCurrent: true): ConnectionContext;
   /**
    * Recalculates the connection context based on the current target element and the event.
    * @returns the new connection context or undefined if the context did not change
    */
   protected calculateNewContext(target: GModelElement, returnCurrent?: boolean): ConnectionContext | undefined;
   protected calculateNewContext(target: GModelElement, returnCurrent?: boolean): ConnectionContext | undefined {
      const context: ConnectionContext = {};
      context.element = findParentByFeature(target, isConnectable);
      if (this.connectionContext && this.connectionContext.element === context.element) {
         return returnCurrent ? this.connectionContext : undefined;
      }
      this.pendingDynamicCheck = false;
      if (!this.isSourceSelected()) {
         context.canConnect = this.canConnect(context.element, 'source');
      } else if (!this.isTargetSelected()) {
         context.canConnect = this.canConnect(context.element, 'target');
      } else {
         context.canConnect = false;
      }
      this.connectionContext = context;
      return context;
   }

   override dispose(): void {
      super.dispose();
      this.source = undefined;
      this.target = undefined;
      this.feedbackEdgeFeedback.dispose();
      this.mouseMoveFeedback.dispose();
      this.sourceFeedback.dispose();
   }
}
