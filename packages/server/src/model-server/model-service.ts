/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import {
   CloseModelArgs,
   CrossReference,
   CrossReferenceContext,
   DATAMODEL_FILE,
   DataModelInfo,
   DataModelInfoArgs,
   DataModelUpdatedEvent,
   ModelSavedEvent,
   ModelUpdatedEvent,
   OpenModelArgs,
   ReferenceableElement,
   ResolveObjectDefinitionArgs,
   ResolvedObjectDefinition,
   ResolvedPropertyDefinition,
   SaveModelArgs,
   UpdateModelArgs
} from '@crossmodel/protocol';
import { AstNode, Deferred, DocumentState, UriUtils, isAstNode } from 'langium';
import { basename } from 'path';
import { Disposable, OptionalVersionedTextDocumentIdentifier, Range, TextDocumentEdit, TextEdit, uinteger } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { CrossModelLangiumDocument, CrossModelLangiumDocuments } from '../language-server/cross-model-langium-documents.js';
import { CrossModelServices, CrossModelSharedServices } from '../language-server/cross-model-module.js';
import { CrossModelRoot, isCrossModelRoot, isObjectDefinition } from '../language-server/generated/ast.js';
import { findDocument, resolveAllPropertyDefinitions } from '../language-server/util/ast-util.js';
import { AstCrossModelDocument } from './open-text-document-manager.js';
import { LANGUAGE_CLIENT_ID } from './openable-text-documents.js';

/**
 * The model service serves as a facade to access and update semantic models from the language server as a non-LSP client.
 * It provides a simple open-request-update-save/close lifecycle for documents and their semantic model.
 */
export class ModelService {
   constructor(
      protected shared: CrossModelSharedServices,
      protected documentManager = shared.workspace.TextDocumentManager,
      protected documents: CrossModelLangiumDocuments = shared.workspace.LangiumDocuments,
      protected documentBuilder = shared.workspace.DocumentBuilder,
      protected fileSystemProvider = shared.workspace.FileSystemProvider
   ) {
      // sync updates with language client
      this.documentBuilder.onDocumentPhase(DocumentState.Validated, async (changedDocument, _token) => {
         const sourceClientId = this.documentManager.getAuthor(changedDocument);
         if (sourceClientId === LANGUAGE_CLIENT_ID) {
            return;
         }
         const textDocument = changedDocument.textDocument;
         if (this.documentManager.isOpenInLanguageClient(textDocument.uri)) {
            // we only want to apply a text edit if the editor is already open
            // because opening and updating at the same time might cause problems as the open call resets the document to filesystem
            shared.logger.ClientLogger.info(
               `[Documents][${basename(URI.parse(textDocument.uri).fsPath)}] Sync from ${sourceClientId} to ${LANGUAGE_CLIENT_ID}`
            );
            await this.shared.lsp.Connection?.workspace.applyEdit({
               label: 'Update Model',
               documentChanges: [
                  // we use a null version to indicate that the version is known
                  // eslint-disable-next-line no-null/no-null
                  TextDocumentEdit.create(OptionalVersionedTextDocumentIdentifier.create(textDocument.uri, null), [
                     TextEdit.replace(Range.create(0, 0, uinteger.MAX_VALUE, uinteger.MAX_VALUE), textDocument.getText())
                  ])
               ]
            });
         }
      });
   }

   /**
    * Opens the document with the given URI for modification.
    *
    * @param uri document URI
    */
   async open(args: OpenModelArgs): Promise<Disposable> {
      return this.documentManager.open(args);
   }

   isOpen(uri: string): boolean {
      return this.documentManager.isOpen(uri);
   }

   /**
    * Closes the document with the given URI for modification.
    *
    * @param uri document URI
    */
   async close(args: CloseModelArgs): Promise<void> {
      if (this.documentManager.isOnlyOpenInClient(args.uri, args.clientId)) {
         // If unable to read, document has been deleted. Nothing to restore.
         const model = await this.documentManager.readFile(args.uri).catch(() => undefined);
         // we need to restore the original state without any unsaved changes
         if (model) {
            await this.update({ ...args, model });
         }
      }
      return this.documentManager.close(args);
   }

   /**
    * Waits until the document with the given URI has reached the given state.
    * @param state minimum state the document should have before returning
    * @param uri document URI
    */
   async ready(state = DocumentState.Validated, uri?: string): Promise<void> {
      await this.documentBuilder.waitUntil(state, uri ? URI.parse(uri) : undefined);
   }

   /**
    * Requests the semantic model stored in the document with the given URI.
    * If the document was not already open for modification, it will be opened automatically.
    *
    * @param uri document URI
    * @param state minimum state the document should have before returning
    */
   async request(uri: string, state = DocumentState.Validated): Promise<AstCrossModelDocument | undefined> {
      const documentUri = URI.parse(uri);
      await this.documentBuilder.waitUntil(state);
      if (this.documents.hasDocument(documentUri)) {
         await this.documentBuilder.waitUntil(state, documentUri);
      }
      const document = await this.documents.getOrCreateDocument(documentUri);
      const root = document.parseResult.value;
      return isCrossModelRoot(root) ? { root, diagnostics: document.diagnostics ?? [], uri } : undefined;
   }

   /**
    * Updates the semantic model stored in the document with the given model or textual representation of a model.
    * Any previous content will be overridden.
    * If the document was not already open for modification, it will be opened automatically.
    *
    * @param uri document URI
    * @param model semantic model or textual representation of it
    * @returns the stored semantic model
    */
   async update(args: UpdateModelArgs<CrossModelRoot>): Promise<AstCrossModelDocument> {
      await this.open(args);
      const documentUri = URI.parse(args.uri);
      const document = await this.documents.getOrCreateDocument(documentUri);
      const root = document.parseResult.value;
      if (!isAstNode(root)) {
         throw new Error(`No AST node to update exists in '${args.uri}'`);
      }
      const textDocument = document.textDocument;
      const text = typeof args.model === 'string' ? args.model : this.serialize(documentUri, args.model);
      if (text === textDocument.getText()) {
         return {
            diagnostics: document.diagnostics ?? [],
            root: document.parseResult.value as CrossModelRoot,
            uri: args.uri
         };
      }
      const newVersion = textDocument.version + 1;
      const pendingUpdate = new Deferred<AstCrossModelDocument>();
      const listener = this.documentBuilder.onDocumentPhase(DocumentState.Validated, (updatedDocument, _token) => {
         if (updatedDocument.uri.toString() === documentUri.toString() && updatedDocument.textDocument.version === newVersion) {
            const crossModelDocument = updatedDocument as CrossModelLangiumDocument;
            pendingUpdate.resolve({
               diagnostics: crossModelDocument.diagnostics ?? [],
               root: crossModelDocument.parseResult.value,
               uri: args.uri
            });
            listener.dispose();
         }
      });
      const timeout = new Promise<AstCrossModelDocument>((_, reject) =>
         setTimeout(() => {
            listener.dispose();
            reject('Update timed out.');
         }, 5000)
      );
      await this.documentManager.update(args.uri, newVersion, text, args.clientId);
      return Promise.race([pendingUpdate.promise, timeout]);
   }

   onModelUpdated(uri: string, listener: (model: ModelUpdatedEvent<AstCrossModelDocument>) => void): Disposable {
      return this.documentManager.onUpdate(uri, listener);
   }

   onModelSaved(uri: string, listener: (model: ModelSavedEvent<AstCrossModelDocument>) => void): Disposable {
      return this.documentManager.onSave(uri, listener);
   }

   /**
    * Overrides the document with the given URI with the given semantic model or text.
    *
    * @param uri document uri
    * @param model semantic model or text
    */
   async save(args: SaveModelArgs<CrossModelRoot>): Promise<void> {
      // sync: implicit update of internal data structure to match file system (similar to workspace initialization)
      const documentUri = URI.parse(args.uri);
      const text = typeof args.model === 'string' ? args.model : this.serialize(documentUri, args.model);
      if (this.documents.hasDocument(documentUri)) {
         await this.update(args);
      } else {
         this.documents.createDocument(documentUri, text);
         await this.documentBuilder.update([documentUri], []);
      }
      return this.documentManager.save(args.uri, text, args.clientId);
   }

   /**
    * Serializes the given semantic model by using the serializer service for the corresponding language.
    *
    * @param uri document uri
    * @param model semantic model
    */
   protected serialize(uri: URI, model: AstNode): string {
      const serializer = this.shared.ServiceRegistry.getServices(uri).serializer.Serializer;
      return serializer.serialize(model);
   }

   getId(node: AstNode, uri = findDocument(node)?.uri): string | undefined {
      if (uri) {
         const services = this.shared.ServiceRegistry.getServices(uri) as CrossModelServices;
         return services.references.IdProvider.getLocalId(node);
      }
      return undefined;
   }

   getGlobalId(node: AstNode, uri = findDocument(node)?.uri): string | undefined {
      if (uri) {
         const services = this.shared.ServiceRegistry.getServices(uri) as CrossModelServices;
         return services.references.IdProvider.getGlobalId(node);
      }
      return undefined;
   }

   findNextId(uri: string, type: string, proposal: string): string {
      const itemUri = URI.parse(uri);
      const services = this.shared.ServiceRegistry.getServices(itemUri) as CrossModelServices;
      return services.references.IdProvider.findNextLocalId(type, proposal, itemUri);
   }

   async findReferenceableElements(args: CrossReferenceContext): Promise<ReferenceableElement[]> {
      return this.shared.ServiceRegistry.CrossModel.references.ScopeProvider.complete(args);
   }

   async resolveCrossReference(args: CrossReference): Promise<AstNode | undefined> {
      return this.shared.ServiceRegistry.CrossModel.references.ScopeProvider.resolveCrossReference(args);
   }

   async getDataModelInfos(): Promise<DataModelInfo[]> {
      return this.shared.workspace.DataModelManager.getDataModelInfos().map(info =>
         this.shared.workspace.DataModelManager.convertDataModelInfoToProtocolDataModelInfo(info)
      );
   }

   async getDataModelInfo(args: DataModelInfoArgs): Promise<DataModelInfo | undefined> {
      const contextUri = URI.parse(args.contextUri);
      const dataModelInfo =
         this.shared.workspace.DataModelManager.getDataModelInfoByURI(contextUri) ??
         this.shared.workspace.DataModelManager.getDataModelInfoByURI(UriUtils.joinPath(contextUri, DATAMODEL_FILE));
      if (!dataModelInfo) {
         return undefined;
      }
      return this.shared.workspace.DataModelManager.convertDataModelInfoToProtocolDataModelInfo(dataModelInfo);
   }

   onDataModelUpdated(listener: (event: DataModelUpdatedEvent) => void): Disposable {
      return this.shared.workspace.DataModelManager.onUpdate(listener);
   }

   async resolveObjectDefinition(args: ResolveObjectDefinitionArgs): Promise<ResolvedObjectDefinition | undefined> {
      const indexManager = this.shared.workspace.IndexManager;
      const description = indexManager.getElementById(args.type, 'ObjectDefinition');
      if (!description) {
         return undefined;
      }
      const node = indexManager.resolveElement(description);
      if (!isObjectDefinition(node)) {
         return undefined;
      }

      const allProps = resolveAllPropertyDefinitions(node);

      // Build a map of property id → resolved default value text.
      // Properties are ordered root ancestor → leaf, so later entries override earlier ones.
      // The effective default is: defaultValue (rich typed) > value (plain text), most specific wins.
      const resolvedDefaults = new Map<string, string>();
      for (const p of allProps) {
         const propId = p.definition.id ?? p.definition.name ?? '';
         const defaultText = p.definition.defaultValue
            ? String(p.definition.defaultValue.value)
            : p.definition.value;
         if (propId && defaultText !== undefined) {
            resolvedDefaults.set(propId, defaultText);
         }
      }

      const propertyDefinitions: ResolvedPropertyDefinition[] = allProps.map(p => {
         const propId = p.definition.id ?? p.definition.name ?? '';
         const base = p.baseDefinition;
         return {
            id: p.definition.id ?? base?.id,
            name: p.definition.name ?? base?.name,
            description: p.definition.description ?? base?.description,
            datatype: p.definition.datatype ?? base?.datatype,
            length: p.definition.length ?? base?.length,
            precision: p.definition.precision ?? base?.precision,
            scale: p.definition.scale ?? base?.scale,
            mandatory: p.definition.mandatory || base?.mandatory || false,
            defaultValue: p.definition.defaultValue
               ? this.serializePropertyValue(p.definition.defaultValue)
               : base?.defaultValue
                  ? this.serializePropertyValue(base.defaultValue)
                  : undefined,
            resolvedDefaultValue: resolvedDefaults.get(propId),
            values: p.definition.values.length > 0
               ? p.definition.values.map(v => this.serializePropertyValue(v))
               : base?.values
                  ? base.values.map(v => this.serializePropertyValue(v))
                  : [],
            sourceDefinitionId: p.sourceDefinitionId,
            inherited: p.inherited
         };
      });

      return {
         id: node.id ?? '',
         name: node.name,
         abstract: node.abstract || undefined,
         extends: node.extends?.$refText,
         propertyDefinitions
      };
   }

   private serializePropertyValue(value: any): any {
      return { $type: value.$type, value: value.value };
   }
}
