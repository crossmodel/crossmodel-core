/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { FeatureModule, TYPES, configureActionHandler, contextMenuModule } from '@eclipse-glsp/client';
import {
    CreateEntityActionHandler,
    CreateInheritanceActionHandler,
    CreateRelationshipActionHandler,
    OpenInCodeEditorActionHandler,
    OpenInFormEditorActionHandler,
    ShowEntityActionHandler,
    ShowRelationshipActionHandler
} from './context-menu-action-handlers';
import {
    CreateEntityAction,
    CreateInheritanceAction,
    CreateRelationshipAction,
    OpenInCodeEditorAction,
    OpenInFormEditorAction,
    ShowEntityAction,
    ShowRelationshipAction
} from './context-menu-actions';
import { SystemDiagramContextMenuProvider } from './system-diagram-context-menu-provider';

/**
 * Feature module for context menu support in the system diagram.
 */
export const systemContextMenuModule = new FeatureModule(
   (bind, unbind, isBound, rebind) => {
      const context = { bind, unbind, isBound, rebind };

      bind(SystemDiagramContextMenuProvider).toSelf().inSingletonScope();
      bind(TYPES.IContextMenuItemProvider).toService(SystemDiagramContextMenuProvider);

      configureActionHandler(context, OpenInFormEditorAction.KIND, OpenInFormEditorActionHandler);
      configureActionHandler(context, OpenInCodeEditorAction.KIND, OpenInCodeEditorActionHandler);
      configureActionHandler(context, CreateEntityAction.KIND, CreateEntityActionHandler);
      configureActionHandler(context, ShowEntityAction.KIND, ShowEntityActionHandler);
      configureActionHandler(context, CreateRelationshipAction.KIND, CreateRelationshipActionHandler);
      configureActionHandler(context, ShowRelationshipAction.KIND, ShowRelationshipActionHandler);
      configureActionHandler(context, CreateInheritanceAction.KIND, CreateInheritanceActionHandler);
   },
   { requires: [contextMenuModule] }
);
