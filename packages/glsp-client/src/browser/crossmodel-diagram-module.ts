/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { GRID, ShowPropertiesAction } from '@crossmodel/protocol';
import {
    ConsoleLogger,
    EnableDefaultToolsAction,
    GLSPHiddenBoundsUpdater,
    GLSPMousePositionTracker,
    GModelElement,
    GlspCommandPalette,
    LogLevel,
    MetadataPlacer,
    MouseDeleteTool,
    TYPES,
    ToolManager,
    ToolPalette,
    TriggerEdgeCreationAction,
    TriggerNodeCreationAction,
    bindAsService,
    bindOrRebind,
    configureActionHandler,
    isRoutable,
    toElementAndRoutingPoints
} from '@eclipse-glsp/client';
import { GlspSelectionDataService } from '@eclipse-glsp/theia-integration';
import { ContainerModule, injectable, interfaces } from '@theia/core/shared/inversify';
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
import { ShowPropertiesActionHandler } from './show-properties-action-handler';
import {
    CreateEntityAction,
    CreateInheritanceAction,
    CreateRelationshipAction,
    ShowEntityAction,
    ShowRelationshipAction
} from './system-diagram/context-menu/context-menu-actions';

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
      rebind(GLSPHiddenBoundsUpdater).to(CrossModelHiddenBoundsUpdater).inSingletonScope();

      configureActionHandler(context, ShowPropertiesAction.KIND, ShowPropertiesActionHandler);
      configureActionHandler(context, TriggerNodeCreationAction.KIND, ToolPalette);
      configureActionHandler(context, TriggerEdgeCreationAction.KIND, ToolPalette);
      configureActionHandler(context, CreateEntityAction.KIND, ToolPalette);
      configureActionHandler(context, ShowEntityAction.KIND, ToolPalette);
      configureActionHandler(context, CreateRelationshipAction.KIND, ToolPalette);
      configureActionHandler(context, ShowRelationshipAction.KIND, ToolPalette);
      configureActionHandler(context, CreateInheritanceAction.KIND, ToolPalette);
      configureActionHandler(context, EnableDefaultToolsAction.KIND, ToolPalette);
   });
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
