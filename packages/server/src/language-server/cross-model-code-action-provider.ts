/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { ModelFileExtensions } from '@crossmodel/protocol';
import { UriUtils, type LangiumDocument } from 'langium';
import type { CodeActionProvider } from 'langium/lsp';
import { RenameFile, type CodeAction, type CodeActionParams } from 'vscode-languageserver-protocol';
import { FilenameNotMatchingDiagnostic } from './cross-model-validator.js';
import { findSemanticRoot } from './util/ast-util.js';

export class CrossModelCodeActionProvider implements CodeActionProvider {
   getCodeActions(document: LangiumDocument, params: CodeActionParams): CodeAction[] {
      const result: CodeAction[] = [];
      const accept = (action: CodeAction | undefined): void => {
         if (action) {
            result.push(action);
         }
      };
      for (const diagnostic of params.context.diagnostics) {
         if (FilenameNotMatchingDiagnostic.is(diagnostic)) {
            accept(this.fixFilenameNotMatching(diagnostic, document));
         }
      }
      return result;
   }

   private fixFilenameNotMatching(diagnostic: FilenameNotMatchingDiagnostic, document: LangiumDocument): CodeAction | undefined {
      const semanticRoot = findSemanticRoot(document);
      if (!semanticRoot || !semanticRoot.id) {
         return undefined;
      }
      const newName = semanticRoot.id + ModelFileExtensions.getFileExtension(document.uri.toString());
      const newUri = UriUtils.joinPath(UriUtils.dirname(document.uri), newName);
      return {
         title: `Rename file to '${newName}'`,
         edit: {
            documentChanges: [RenameFile.create(document.uri.toString(), newUri.toString())]
         },
         kind: 'quickfix',
         diagnostics: [diagnostic]
      };
   }
}
