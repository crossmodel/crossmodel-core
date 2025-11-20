/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { ModelDiagnostic } from '@crossmodel/protocol';
import { AstNode, DefaultDocumentValidator, DiagnosticInfo, ValidationSeverity } from 'langium';
import { Diagnostic } from 'vscode-languageserver-types';
import type { CrossModelServices } from './cross-model-module.js';

export interface CrossModelDiagnostic extends Diagnostic {
   element: string;
   property?: string;
}

export class CrossModelDocumentValidator extends DefaultDocumentValidator {
   constructor(protected services: CrossModelServices) {
      super(services);
   }

   protected override toDiagnostic<N extends AstNode>(
      severity: ValidationSeverity,
      message: string,
      info: DiagnosticInfo<N, string>
   ): CrossModelDiagnostic {
      const node = info.node;
      if (!node) {
         // Should not happen but lets be defensive
         this.services.shared.logger.ClientLogger.warn('Cannot create diagnostic element path: DiagnosticInfo has no node.');
         return { ...super.toDiagnostic(severity, message, info), property: info.property, element: '' };
      }

      const astLocator = this.services.workspace.AstNodeLocator;
      // In some cases (references or synthetic elements) Langium's AstNodeLocator may not return a path for the node itself.
      // As a fallback, try the node's $container so we at least get the parent path and can append the property/index.
      // This mirrors how the client expects element paths to be constructed for collection items.
      const nodePath = astLocator.getAstNodePath(node) || astLocator.getAstNodePath(node.$container ?? { $type: 'Dummy' });
      if (!nodePath) {
         // we either could not determine any path (should not really happen)
         this.services.shared.logger.ClientLogger.warn('Cannot create diagnostic element path: Unable to determine AST node path.');
         return { ...super.toDiagnostic(severity, message, info), property: info.property, element: '' };
      }

      if (info.index === undefined || nodePath.endsWith(`${ModelDiagnostic.ELEMENT_INDEX_SEPARATOR}${info.index}`)) {
         // we have no index or the path already includes it (most cases)
         return { ...super.toDiagnostic(severity, message, info), property: info.property, element: nodePath };
      }

      // we are in an array of references where no index is present on the node path but we do have it in our diagnostic info
      // to create a stable, consistent path, we append it here like it happens for other nodes in arrays and how the client expects it
      const elementPath = info.property
         ? `${nodePath}${ModelDiagnostic.ELEMENT_SEGMENT_SEPARATOR}${info.property}${ModelDiagnostic.ELEMENT_INDEX_SEPARATOR}${info.index}`
         : `${nodePath}${ModelDiagnostic.ELEMENT_INDEX_SEPARATOR}${info.index}`;
      return { ...super.toDiagnostic(severity, message, info), property: info.property, element: elementPath };
   }
}
