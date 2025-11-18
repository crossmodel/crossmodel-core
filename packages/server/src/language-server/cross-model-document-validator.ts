/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { ModelDiagnostic } from '@crossmodel/protocol';
import { AstNode, DefaultDocumentValidator, DiagnosticInfo, LangiumCoreServices, ValidationSeverity } from 'langium';
import { Diagnostic } from 'vscode-languageserver-types';

export interface CrossModelDiagnostic extends Diagnostic {
   element: string;
   property?: string;
}

export class CrossModelDocumentValidator extends DefaultDocumentValidator {
   constructor(protected services: LangiumCoreServices) {
      super(services);
   }

   protected override toDiagnostic<N extends AstNode>(
      severity: ValidationSeverity,
      message: string,
      info: DiagnosticInfo<N, string>
   ): CrossModelDiagnostic {
      // Build the element path and include an index if provided by the DiagnosticInfo.
      // For list properties that hold references (like superEntities) Langium provides the
      // parent node plus a property and an index. We need to encode the index into the
      // element path so the client diagnostic manager can match diagnostics to specific
      // collection rows (it expects the same separators as used by AstNodeLocator).
      // Try to obtain a stable AST path for the node. In some cases (references or
      // synthetic elements) Langium's AstNodeLocator may not return a path for the
      // node itself. As a fallback, try the node's $container so we at least get the
      // parent path and can append the property/index. This mirrors how the UI
      // expects element paths to be constructed for collection items.
      const node = info.node as AstNode | undefined;
      let basePath = node ? (this.services.workspace.AstNodeLocator.getAstNodePath(node) ?? '') : '';
      if (!basePath && node && (node as any).$container) {
         basePath = this.services.workspace.AstNodeLocator.getAstNodePath((node as any).$container) ?? '';
      }
      let elementPath = basePath;
      if (info.index !== undefined) {
         if (basePath && info.property) {
            // If we have a container base path and a property, append the property
            // segment and then the index so the path becomes '/container/property@idx'
            const sep = ModelDiagnostic.ELEMENT_SEGMENT_SEPARATOR;
            const idxSep = ModelDiagnostic.ELEMENT_INDEX_SEPARATOR;
            elementPath = `${basePath}${sep}${info.property}${idxSep}${info.index}`;
         } else if (basePath) {
            // No property provided (or basePath already refers to the element), just append index
            elementPath = `${basePath}${ModelDiagnostic.ELEMENT_INDEX_SEPARATOR}${info.index}`;
         }
      }
      return {
         ...super.toDiagnostic(severity, message, info),
         element: elementPath,
         property: info.property
      };
   }
}
