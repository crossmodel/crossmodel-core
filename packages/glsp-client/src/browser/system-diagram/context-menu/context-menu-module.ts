/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { FeatureModule, TYPES, contextMenuModule } from '@eclipse-glsp/client';
import { SystemDiagramContextMenuProvider } from './system-diagram-context-menu-provider';

/**
 * Feature module for context menu support in the system diagram.
 */
export const systemContextMenuModule = new FeatureModule(
   bind => {
      bind(SystemDiagramContextMenuProvider).toSelf().inSingletonScope();
      bind(TYPES.IContextMenuItemProvider).toService(SystemDiagramContextMenuProvider);
   },
   { requires: [contextMenuModule] }
);
