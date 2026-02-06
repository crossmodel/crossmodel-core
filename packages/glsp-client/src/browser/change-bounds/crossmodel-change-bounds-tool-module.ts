/********************************************************************************
 * Copyright (c) 2026 CrossBreeze.
 ********************************************************************************/
import {
   ChangeBoundsManager,
   FeatureModule,
   GResizeHandle,
   GResizeHandleView,
   HideChangeBoundsToolResizeFeedbackCommand,
   ShowChangeBoundsToolResizeFeedbackCommand,
   TYPES,
   bindAsService,
   changeBoundsToolModule,
   configureCommand,
   configureView
} from '@eclipse-glsp/client';
import '@eclipse-glsp/client/css/change-bounds.css';
import { CrossModelChangeBoundsTool } from './crossmodel-change-bounds-tool';

export const crossModelChangeBoundsToolModule = new FeatureModule(
   (bind, _unbind, _isBound, _rebind) => {
      const context = { bind, unbind: _unbind, isBound: _isBound, rebind: _rebind };
      bindAsService(context, TYPES.IChangeBoundsManager, ChangeBoundsManager);
      bindAsService(context, TYPES.IDefaultTool, CrossModelChangeBoundsTool);
      configureCommand(context, ShowChangeBoundsToolResizeFeedbackCommand);
      configureCommand(context, HideChangeBoundsToolResizeFeedbackCommand);
      configureView(context, GResizeHandle.TYPE, GResizeHandleView);
   },
   { featureId: changeBoundsToolModule.featureId }
);
