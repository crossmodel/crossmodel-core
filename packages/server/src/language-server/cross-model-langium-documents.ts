/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { DefaultLangiumDocuments, DocumentState, LangiumDocument } from 'langium';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { CrossModelRoot } from './generated/ast.js';
import { fixDocument } from './util/ast-util.js';
import { Utils } from './util/uri-util.js';

export class CrossModelLangiumDocuments extends DefaultLangiumDocuments {
   override async getOrCreateDocument(uri: URI): Promise<LangiumDocument> {
      const document = this.getDocument(uri);
      if (document) {
         return document;
      }
      const documentUri = this.getDocumentUri(uri);
      if (documentUri) {
         return super.getOrCreateDocument(documentUri);
      }
      return this.createEmptyDocument(uri);
   }

   protected getDocumentUri(uri: URI): URI | undefined {
      // we want to resolve existing URIs to properly deal with linked files and folders and not create duplicates for them
      return Utils.toRealURIorUndefined(uri);
   }

   createEmptyDocument(uri: URI, rootType = CrossModelRoot): LangiumDocument {
      const document: LangiumDocument = {
         uri,
         parseResult: { lexerErrors: [], parserErrors: [], value: { $type: rootType } },
         references: [],
         state: DocumentState.Validated,
         textDocument: TextDocument.create(uri.toString(), '', 1, ''),
         diagnostics: []
      };
      fixDocument(document.parseResult.value, document);
      return document;
   }
}
