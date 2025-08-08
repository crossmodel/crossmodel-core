/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { CloseModelArgs, CrossModelDocument, ModelSavedEvent, ModelUpdatedEvent, OpenModelArgs } from '@crossmodel/protocol';
import * as fs from 'fs';
import {
   AstNode,
   DocumentBuilder,
   DocumentState,
   FileSystemProvider,
   LangiumDefaultSharedCoreServices,
   LangiumDocument,
   LangiumDocuments,
   UriUtils
} from 'langium';
import * as path from 'path';
import { Disposable } from 'vscode-languageserver';
import { Diagnostic, TextDocumentIdentifier, TextDocumentItem, VersionedTextDocumentIdentifier } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { CrossModelRoot } from '../language-server/generated/ast.js';
import { CrossModelLanguageMetaData } from '../language-server/generated/module.js';
import { AddedSharedModelServices } from './model-module.js';
import { OpenableTextDocuments } from './openable-text-documents.js';

export interface UpdateInfo {
   changed: URI[];
   deleted: URI[];
}

export type AstCrossModelDocument = CrossModelDocument<CrossModelRoot, Diagnostic>;

/**
 * A manager class that supports handling documents with a simple open-update-save/close lifecycle.
 *
 * The manager wraps the services exposed by Langium and acts as a small language client on behalf of the caller.
 */
export class OpenTextDocumentManager {
   protected textDocuments: OpenableTextDocuments<TextDocument>;
   protected fileSystemProvider: FileSystemProvider;
   protected langiumDocs: LangiumDocuments;
   protected documentBuilder: DocumentBuilder;

   protected lastUpdate?: UpdateInfo;

   constructor(services: AddedSharedModelServices & LangiumDefaultSharedCoreServices) {
      this.textDocuments = services.workspace.TextDocuments;
      this.fileSystemProvider = services.workspace.FileSystemProvider;
      this.langiumDocs = services.workspace.LangiumDocuments;
      this.documentBuilder = services.workspace.DocumentBuilder;

      this.textDocuments.onDidOpen(event =>
         this.open({ clientId: event.clientId, uri: event.document.uri, languageId: event.document.languageId })
      );
      this.textDocuments.onDidClose(event => this.close({ clientId: event.clientId, uri: event.document.uri }));
      this.documentBuilder.onUpdate((changed, deleted) => {
         this.lastUpdate = { changed, deleted };
      });
   }

   /**
    * Subscribe to the save event of the textdocument.
    *
    * @param uri Uri of the document to listen to. The callback only gets called when this URI and the URI of the saved document
    * are equal.
    * @param listener Callback to be called
    * @returns Disposable object
    */
   onSave(uri: string, listener: (model: ModelSavedEvent<AstCrossModelDocument>) => void): Disposable {
      return this.textDocuments.onDidSave(async event => {
         const documentURI = URI.parse(event.document.uri);

         // Check if the uri of the saved document and the uri of the listener are equal.
         if (event.document.uri === uri && documentURI !== undefined && this.langiumDocs.hasDocument(documentURI)) {
            const document = await this.langiumDocs.getOrCreateDocument(documentURI);
            const root = document.parseResult.value as CrossModelRoot;
            return listener({
               document: {
                  root,
                  diagnostics: document.diagnostics ?? [],
                  uri: event.document.uri
               },
               sourceClientId: event.clientId
            });
         }

         return undefined;
      });
   }

   onUpdate(uri: string, listener: (model: ModelUpdatedEvent<AstCrossModelDocument>) => void): Disposable {
      return this.documentBuilder.onBuildPhase(DocumentState.Validated, (allChangedDocuments, _token) => {
         const changedDocument = allChangedDocuments.find(document => document.uri.toString() === uri);
         if (changedDocument) {
            const buildTrigger = allChangedDocuments.find(
               document => document.uri.toString() === this.lastUpdate?.changed?.[0]?.toString()
            );
            const sourceClientId = this.getSourceClientId(buildTrigger ?? changedDocument, allChangedDocuments);
            const event: ModelUpdatedEvent<AstCrossModelDocument> = {
               document: {
                  root: changedDocument.parseResult.value as CrossModelRoot,
                  diagnostics: changedDocument.diagnostics ?? [],
                  uri: changedDocument.textDocument.uri
               },
               sourceClientId,
               reason: this.lastUpdate?.changed.find(changed => UriUtils.equals(changed, changedDocument.uri))
                  ? 'changed'
                  : this.lastUpdate?.deleted.find(deleted => UriUtils.equals(deleted, changedDocument.uri))
                    ? 'deleted'
                    : 'updated'
            };
            listener(event);
         }
      });
   }

   getSourceClientId(preferred: LangiumDocument<AstNode>, rest: LangiumDocument<AstNode>[]): string {
      const clientId = this.textDocuments.getChangeSource(preferred.textDocument.uri, preferred.textDocument.version);
      if (clientId) {
         return clientId;
      }
      return 'unknown';
   }

   async open(args: OpenModelArgs): Promise<Disposable> {
      // only create a dummy document if it is already open as we use the synced state anyway
      const textDocument = this.isOpen(args.uri)
         ? this.createDummyDocument(args.uri, args.version)
         : await this.createDocumentFromTextOrFileSystem(args.uri, args.languageId, args.version, args.text);

      // open will trigger a change event which in turn will trigger a build
      this.textDocuments.notifyDidOpenTextDocument({ textDocument }, args.clientId);
      return Disposable.create(() => this.close(args));
   }

   async close(args: CloseModelArgs): Promise<void> {
      this.textDocuments.notifyDidCloseTextDocument({ textDocument: TextDocumentIdentifier.create(args.uri) }, args.clientId);
   }

   async update(uri: string, version: number, text: string, clientId: string): Promise<void> {
      if (!this.isOpen(uri)) {
         throw new Error(`Document ${uri} hasn't been opened for updating yet`);
      }
      this.textDocuments.notifyDidChangeTextDocument(
         {
            textDocument: VersionedTextDocumentIdentifier.create(uri, version),
            contentChanges: [{ text }]
         },
         clientId
      );
   }

   async save(uri: string, text: string, clientId: string): Promise<void> {
      const vscUri = URI.parse(uri);
      const dirName = path.dirname(vscUri.fsPath);
      fs.mkdirSync(dirName, { recursive: true });
      fs.writeFileSync(vscUri.fsPath, text);
      this.textDocuments.notifyDidSaveTextDocument({ textDocument: TextDocumentIdentifier.create(uri), text }, clientId);
   }

   isOpen(uri: string): boolean {
      return !!this.textDocuments.get(uri) || !!this.textDocuments.get(this.normalizedUri(uri));
   }

   isOpenInLanguageClient(uri: string): boolean {
      return this.textDocuments.isOpenInLanguageClient(this.normalizedUri(uri));
   }

   isOnlyOpenInClient(uri: string, client: string): boolean {
      return this.textDocuments.isOnlyOpenInClient(this.normalizedUri(uri), client);
   }

   protected createDummyDocument(uri: string, version = 0): TextDocumentItem {
      return TextDocumentItem.create(this.normalizedUri(uri), CrossModelLanguageMetaData.languageId, version, '');
   }

   protected async createDocumentFromTextOrFileSystem(
      uri: string,
      languageId: string = CrossModelLanguageMetaData.languageId,
      version = 0,
      text?: string
   ): Promise<TextDocumentItem> {
      return TextDocumentItem.create(uri, languageId, version, text ?? (await this.readFile(uri)));
   }

   async readFile(uri: string): Promise<string> {
      return this.fileSystemProvider.readFile(URI.parse(uri));
   }

   protected normalizedUri(uri: string): string {
      return URI.parse(uri).toString();
   }
}
