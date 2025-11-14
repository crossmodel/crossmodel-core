/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

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
      return {
         ...super.toDiagnostic(severity, message, info),
         element: this.services.workspace.AstNodeLocator.getAstNodePath(info.node),
         property: info.property
      };
   }
}
