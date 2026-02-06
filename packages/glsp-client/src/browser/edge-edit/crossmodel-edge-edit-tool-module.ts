/********************************************************************************
 * Copyright (c) 2026 CrossBreeze.
 ********************************************************************************/
import {
   DrawFeedbackEdgeSourceCommand,
   FeatureModule,
   HideEdgeReconnectHandlesFeedbackCommand,
   ShowEdgeReconnectHandlesFeedbackCommand,
   SwitchRoutingModeCommand,
   TYPES,
   bindAsService,
   configureCommand,
   configureDanglingFeedbackEdge,
   edgeEditToolModule
} from '@eclipse-glsp/client';
import { CrossModelEdgeEditTool } from './crossmodel-edge-edit-tool';

export const crossModelEdgeEditToolModule = new FeatureModule(
   (bind, unbind, isBound, rebind) => {
      const context = { bind, unbind, isBound, rebind };
      bindAsService(context, TYPES.IDefaultTool, CrossModelEdgeEditTool);

      configureCommand(context, ShowEdgeReconnectHandlesFeedbackCommand);
      configureCommand(context, HideEdgeReconnectHandlesFeedbackCommand);
      configureCommand(context, DrawFeedbackEdgeSourceCommand);
      configureCommand(context, SwitchRoutingModeCommand);

      configureDanglingFeedbackEdge(context);
   },
   { featureId: edgeEditToolModule.featureId }
);
