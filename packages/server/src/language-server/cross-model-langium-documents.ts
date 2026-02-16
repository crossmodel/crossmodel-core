/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { asMutable } from '@crossmodel/protocol';
import { AstNode, DefaultLangiumDocuments, DocumentState, LangiumDocument } from 'langium';
import { CancellationToken } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { CrossModelRoot } from './ast.js';
import { CrossModelDiagnostic } from './cross-model-document-validator.js';
import { Utils } from './util/uri-util.js';

export interface CrossModelLangiumDocument<T extends AstNode = CrossModelRoot> extends LangiumDocument<T> {
   diagnostics?: CrossModelDiagnostic[];
}

export class CrossModelLangiumDocuments extends DefaultLangiumDocuments {
   override async getOrCreateDocument(uri: URI): Promise<CrossModelLangiumDocument> {
      const document = this.getDocument(uri);
      if (document) {
         return document as CrossModelLangiumDocument;
      }
      const documentUri = this.getDocumentUri(uri);
      if (documentUri) {
         return super.getOrCreateDocument(documentUri) as Promise<CrossModelLangiumDocument>;
      }
      return this.createEmptyDocument(uri);
   }

   protected getDocumentUri(uri: URI): URI | undefined {
      // we want to resolve existing URIs to properly deal with linked files and folders and not create duplicates for them
      return Utils.toRealURIorUndefined(uri);
   }

   createEmptyDocument(uri: URI): CrossModelLangiumDocument {
      const root = asMutable<CrossModelRoot>({ $type: CrossModelRoot.$type });
      const document: CrossModelLangiumDocument = {
         uri,
         parseResult: { lexerErrors: [], parserErrors: [], value: root },
         references: [],
         state: DocumentState.Validated,
         textDocument: TextDocument.create(uri.toString(), '', 1, ''),
         diagnostics: []
      };
      root.$document = document;
      return document;
   }

   async updateOrCreateDocument(uri: URI, cancellationToken = CancellationToken.None): Promise<LangiumDocument> {
      const document = await this.getOrCreateDocument(uri);
      return this.langiumDocumentFactory.update(document, cancellationToken);
   }
}
