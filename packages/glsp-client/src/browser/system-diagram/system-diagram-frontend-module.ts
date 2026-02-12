/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import {
   ContainerContext,
   DiagramConfiguration,
   GLSPClientContribution,
   GLSPDiagramWidget,
   GLSPTheiaFrontendModule,
   registerDiagramManager
} from '@eclipse-glsp/theia-integration';

import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { SystemDiagramLanguage } from '../../common/crossmodel-diagram-language';
import { CrossModelClientContribution } from '../crossmodel-client-contribution';
import { LibAvoidInitializer } from '../libavoid';
import { SystemDiagramConfiguration } from './system-diagram-configuration';
import { SystemDiagramManager } from './system-diagram-manager';
import { SystemDiagramWidget } from './system-diagram-widget';

export class SystemDiagramModule extends GLSPTheiaFrontendModule {
   readonly diagramLanguage = SystemDiagramLanguage;
   protected override enableMarkerNavigationCommands = false;

   bindDiagramConfiguration(context: ContainerContext): void {
      context.bind(DiagramConfiguration).to(SystemDiagramConfiguration);
   }

   override bindGLSPClientContribution(context: ContainerContext): void {
      // override client contribution to delay Theia frontend-backend connection for GLSP (see comments in contribution)
      context.bind(CrossModelClientContribution).toSelf().inSingletonScope();
      context.bind(GLSPClientContribution).toService(CrossModelClientContribution);
   }

   override bindDiagramWidgetFactory(context: ContainerContext): void {
      super.bindDiagramWidgetFactory(context);
      context.rebind(GLSPDiagramWidget).to(SystemDiagramWidget);
   }

   override configureDiagramManager(context: ContainerContext): void {
      context.bind(SystemDiagramManager).toSelf().inSingletonScope();
      registerDiagramManager(context.bind, SystemDiagramManager, false);
   }

   override configure(context: ContainerContext): void {
      context.bind(LibAvoidInitializer).toSelf().inSingletonScope();
      context.bind(FrontendApplicationContribution).toService(LibAvoidInitializer);
   }
}

export default new SystemDiagramModule();
