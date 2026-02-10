/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import {
   ExpandNavigatorForNewFileAction,
   GRID,
   HAS_MANUAL_ROUTING_POINTS,
   OpenCompositeEditorAction,
   ShowPropertiesAction
} from '@crossmodel/protocol';
import {
   Action,
   ChangeRoutingPointsOperation,
   ConsoleLogger,
   EditorContextService,
   EnableDefaultToolsAction,
   GLSPHiddenBoundsUpdater,
   GLSPMousePositionTracker,
   GModelElement,
   GlspCommandPalette,
   IActionHandler,
   LogLevel,
   MetadataPlacer,
   MouseDeleteTool,
   MoveAction,
   RequestContextActions,
   SwitchRoutingModeAction,
   TYPES,
   ToolManager,
   ToolPalette,
   TriggerEdgeCreationAction,
   TriggerLayoutAction,
   TriggerNodeCreationAction,
   bindAsService,
   bindOrRebind,
   configureActionHandler,
   isRoutable,
   isRoutingHandle,
   toElementAndRoutingPoints
} from '@eclipse-glsp/client';
import { GlspSelectionDataService } from '@eclipse-glsp/theia-integration';
import { ContainerModule, inject, injectable, interfaces } from '@theia/core/shared/inversify';
import { VNode } from 'snabbdom';
import { CmMetadataPlacer } from './cm-metadata-placer';
import {
   CrossModelCommandPalette,
   CrossModelMousePositionTracker,
   EntityCommandPalette,
   RelationshipCommandPalette
} from './cross-model-command-palette';
import { CrossModelMouseDeleteTool } from './cross-model-delete-tool';
import { CrossModelDiagramStartup } from './cross-model-diagram-startup';
import { CrossModelErrorExtension } from './cross-model-error-extension';
import { CrossModelToolPalette } from './cross-model-tool-palette';
import { CrossModelGLSPSelectionDataService } from './crossmodel-selection-data-service';
import { CrossModelEdgeEditTool } from './edge-edit/crossmodel-edge-edit-tool';
import { EmptyActionHandler } from './empty-action-handler';
import { ExpandNavigatorActionHandler } from './expand-navigator-action-handler';
import { CrossModelTriggerLayoutActionHandler } from './layout/crossmodel-trigger-layout-action-handler';
import { OpenCompositeEditorActionHandler } from './open-editor-action-handler';
import { ShowPropertiesActionHandler } from './show-properties-action-handler';

export function createCrossModelDiagramModule(registry: interfaces.ContainerModuleCallBack): ContainerModule {
   return new ContainerModule((bind, unbind, isBound, rebind, unbindAsync, onActivation, onDeactivation) => {
      const context = { bind, unbind, isBound, rebind };
      rebind(TYPES.ILogger).to(ConsoleLogger).inSingletonScope();
      rebind(TYPES.LogLevel).toConstantValue(LogLevel.warn);
      rebind(TYPES.Grid).toConstantValue(GRID);
      bind(CrossModelToolPalette).toSelf().inSingletonScope();
      bind(CrossModelMouseDeleteTool).toSelf().inSingletonScope();
      rebind(MouseDeleteTool).toService(CrossModelMouseDeleteTool);
      rebind(ToolPalette).toService(CrossModelToolPalette);
      bindAsService(context, GlspSelectionDataService, CrossModelGLSPSelectionDataService);
      bindAsService(context, TYPES.IDiagramStartup, CrossModelDiagramStartup);
      registry(bind, unbind, isBound, rebind, unbindAsync, onActivation, onDeactivation);
      bind(CrossModelCommandPalette).toSelf().inSingletonScope();
      rebind(GlspCommandPalette).toService(CrossModelCommandPalette);
      bindAsService(context, TYPES.IUIExtension, EntityCommandPalette);
      bindAsService(context, TYPES.IUIExtension, RelationshipCommandPalette);

      bind(CrossModelMousePositionTracker).toSelf().inSingletonScope();
      bindOrRebind(context, GLSPMousePositionTracker).toService(CrossModelMousePositionTracker);

      bind(CrossModelToolManager).toSelf().inSingletonScope();
      bindOrRebind(context, TYPES.IToolManager).toService(CrossModelToolManager);

      bindAsService(context, TYPES.IUIExtension, CrossModelErrorExtension);
      rebind(MetadataPlacer).to(CmMetadataPlacer).inSingletonScope();

      bind(CrossModelHiddenBoundsUpdater).toSelf().inSingletonScope();
      rebind(GLSPHiddenBoundsUpdater).to(CrossModelHiddenBoundsUpdater).inSingletonScope();

      configureActionHandler(context, ShowPropertiesAction.KIND, ShowPropertiesActionHandler);
      configureActionHandler(context, ExpandNavigatorForNewFileAction.KIND, ExpandNavigatorActionHandler);
      configureActionHandler(context, TriggerNodeCreationAction.KIND, ToolPalette);
      configureActionHandler(context, TriggerEdgeCreationAction.KIND, ToolPalette);
      configureActionHandler(context, TriggerLayoutAction.KIND, CrossModelTriggerLayoutActionHandler);
      configureActionHandler(context, EnableDefaultToolsAction.KIND, ToolPalette);
      configureActionHandler(context, ChangeRoutingPointsOperation.KIND, CrossModelRoutingPointsDebugHandler);
      configureActionHandler(context, MoveAction.KIND, CrossModelMoveDebugHandler);
      configureActionHandler(context, SwitchRoutingModeAction.KIND, CrossModelRoutingModeDebugHandler);

      configureActionHandler(context, RequestContextActions.KIND, EmptyActionHandler);
      configureActionHandler(context, OpenCompositeEditorAction.KIND, OpenCompositeEditorActionHandler);
   });
}

@injectable()
class CrossModelRoutingPointsDebugHandler implements IActionHandler {
   handle(action: ChangeRoutingPointsOperation): void {
      // eslint-disable-next-line no-console
      console.log('[routing-debug][client] ChangeRoutingPointsOperation', action.newRoutingPoints);
   }
}

@injectable()
class CrossModelMoveDebugHandler implements IActionHandler {
   @inject(EditorContextService) protected editorContext: EditorContextService;

   handle(action: MoveAction): void {
      // eslint-disable-next-line no-console
      console.log('[routing-debug][client] MoveAction', action.moves, 'finished=', action.finished);

      // If a routing handle is moving, update the main model edge routingPoints immediately
      for (const move of action.moves ?? []) {
         const element = this.editorContext.modelRoot.index.getById(move.elementId);
         if (!element || !isRoutingHandle(element)) {
            continue;
         }
         const edge = element.parent;
         if (!edge || !isRoutable(edge)) {
            continue;
         }
         if (element.kind === 'junction') {
            if (element.pointIndex >= 0 && element.pointIndex < edge.routingPoints.length) {
               edge.routingPoints[element.pointIndex] = move.toPosition;
            }
         } else if (element.kind === 'line') {
            const insertIndex = Math.max(0, element.pointIndex + 1);
            if (insertIndex >= edge.routingPoints.length) {
               edge.routingPoints.push(move.toPosition);
            } else {
               edge.routingPoints.splice(insertIndex, 0, move.toPosition);
            }
            element.kind = 'junction';
            element.type = 'routing-point';
            element.pointIndex = insertIndex;
         }
         (edge as any).args = { ...((edge as any).args ?? {}), [HAS_MANUAL_ROUTING_POINTS]: true };
      }
   }
}

@injectable()
class CrossModelRoutingModeDebugHandler implements IActionHandler {
   handle(action: SwitchRoutingModeAction): Action | void {
      // eslint-disable-next-line no-console
      console.log('[routing-debug][client] SwitchRoutingModeAction', action);
      if (CrossModelEdgeEditTool.isDraggingRoutingHandle && action.elementsToDeactivate?.length) {
         const filtered = { ...action, elementsToDeactivate: [] };
         return filtered as Action;
      }
   }
}

@injectable()
export class CrossModelToolManager extends ToolManager {
   override enableDefaultTools(): void {
      super.enableDefaultTools();
      // since setting the _defaultToolsEnabled flag to true will short-circuit the enableDefaultTools method
      // we only set it to true if truly all default tools are enabled
      this._defaultToolsEnabled = this.activeTools.length === this.defaultTools.length;
   }
}

@injectable()
export class CrossModelHiddenBoundsUpdater extends GLSPHiddenBoundsUpdater {
   override decorate(vnode: VNode, element: GModelElement): VNode {
      super.decorate(vnode, element);
      if (isRoutable(element)) {
         const addedRoute = this.element2route.pop();
         if (addedRoute?.newRoutingPoints && addedRoute.newRoutingPoints.length >= 2) {
            this.element2route.push(addedRoute);
         } else {
            this.element2route.push(toElementAndRoutingPoints(element));
         }
      }
      return vnode;
   }
}
