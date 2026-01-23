/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import {
   ContainerContext,
   DiagramConfiguration,
   GLSPDiagramWidget,
   GLSPTheiaFrontendModule,
   registerDiagramManager
} from '@eclipse-glsp/theia-integration';

import { MappingDiagramLanguage } from '../../common/crossmodel-diagram-language';
import { MappingDiagramConfiguration } from './mapping-diagram-configuration';
import { MappingDiagramManager } from './mapping-diagram-manager';
import { MappingDiagramWidget } from './mapping-diagram-widget';

export class MappingDiagramModule extends GLSPTheiaFrontendModule {
   readonly diagramLanguage = MappingDiagramLanguage;

   // Theia commands are shared among diagram modules so we want to avoid double registration
   protected override enableLayoutCommands = false;
   protected override enableMarkerNavigationCommands = false;

   bindDiagramConfiguration(context: ContainerContext): void {
      context.bind(DiagramConfiguration).to(MappingDiagramConfiguration);
   }

   override bindGLSPClientContribution(context: ContainerContext): void {
      // DO NOT BIND ANOTHER GLSP CLIENT CONTRIBUTION, WE ONLY NEED ONE PER SERVER AND WE DO IT IN THE DIAGRAM LANGUAGE
   }

   override bindDiagramWidgetFactory(context: ContainerContext): void {
      super.bindDiagramWidgetFactory(context);
      context.rebind(GLSPDiagramWidget).to(MappingDiagramWidget);
   }

   override configureDiagramManager(context: ContainerContext): void {
      context.bind(MappingDiagramManager).toSelf().inSingletonScope();
      registerDiagramManager(context.bind, MappingDiagramManager, false);
   }
}

export default new MappingDiagramModule();
