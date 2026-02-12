/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { codiconCSSString } from '@eclipse-glsp/client';
import { GLSPDiagramManager } from '@eclipse-glsp/theia-integration';
import { OpenWithHandler } from '@theia/core/lib/browser';
import { injectable } from '@theia/core/shared/inversify';
import { SystemDiagramLanguage } from '../../common/crossmodel-diagram-language';

@injectable()
export class SystemDiagramManager extends GLSPDiagramManager implements OpenWithHandler {
   static readonly ID = 'system-diagram-manager';

   get label(): string {
      return 'Diagram Editor';
   }

   override get iconClass(): string {
      return SystemDiagramLanguage.iconClass ?? codiconCSSString('type-hierarchy-sub');
   }

   override get fileExtensions(): string[] {
      return SystemDiagramLanguage.fileExtensions;
   }

   override get diagramType(): string {
      return SystemDiagramLanguage.diagramType;
   }

   override get contributionId(): string {
      return SystemDiagramLanguage.contributionId;
   }

   override get id(): string {
      return SystemDiagramManager.ID;
   }
}
