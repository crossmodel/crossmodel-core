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
   SaveModelArgs,
   toIdReference,
   UpdateModelArgs
} from '@crossmodel/protocol';
import { AstNode, Deferred, DocumentState, isAstNode, UriUtils } from 'langium';
import { basename } from 'path';
import { Disposable, OptionalVersionedTextDocumentIdentifier, Range, TextDocumentEdit, TextEdit, uinteger } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { CrossModelLangiumDocument, CrossModelLangiumDocuments } from '../language-server/cross-model-langium-documents.js';
import { CrossModelServices, CrossModelSharedServices } from '../language-server/cross-model-module.js';
import { CrossModelRoot, isCrossModelRoot } from '../language-server/generated/ast.js';
import { findDocument } from '../language-server/util/ast-util.js';
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
      this.documentBuilder.onBuildPhase(DocumentState.Validated, async (allChangedDocuments, _token) => {
         for (const changedDocument of allChangedDocuments) {
            const sourceClientId = this.documentManager.getAuthor(changedDocument);
            if (sourceClientId === LANGUAGE_CLIENT_ID) {
               continue;
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
      const documentInCurrentState = this.documents.getDocument(documentUri);
      // Workaround for https://github.com/eclipse-langium/langium/issues/1827
      if (!documentInCurrentState || documentInCurrentState.state < state) {
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
      const listener = this.documentBuilder.onBuildPhase(DocumentState.Validated, (allChangedDocuments, _token) => {
         const updatedDocument = allChangedDocuments.find(
            doc => doc.uri.toString() === documentUri.toString() && doc.textDocument.version === newVersion
         ) as CrossModelLangiumDocument | undefined;
         if (updatedDocument) {
            pendingUpdate.resolve({
               diagnostics: updatedDocument.diagnostics ?? [],
               root: updatedDocument.parseResult.value,
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
      const result = await Promise.race([pendingUpdate.promise, timeout]);

      try {
         const relationship = (result?.root as CrossModelRoot)?.relationship as any | undefined;
         if (relationship) {
            // Save the relationship file to persist changes
            await this.documentManager.save(args.uri, text, args.clientId);

            // best-effort: update diagrams that reference this relationship
            this.updateDiagramsReferencingRelationship(relationship, args.clientId).catch(err =>
               // eslint-disable-next-line no-console
               console.warn('Failed to update diagrams for relationship:', err)
            );
         }
      } catch (e) {
         // ignore
      }

      return result;
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
      const text = typeof args.model === 'string' ? args.model : this.serialize(URI.parse(args.uri), args.model);
      if (this.documents.hasDocument(URI.parse(args.uri))) {
         await this.update(args);
      } else {
         this.documents.createDocument(URI.parse(args.uri), text);
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
      return services.references.IdProvider.findNextGlobalId(type, proposal);
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

   protected async updateDiagramsReferencingRelationship(relationship: any, sourceClientId?: string): Promise<void> {
      const indexManager = this.shared.workspace.IndexManager as any;
      const descriptions = indexManager.allElements('RelationshipEdge')?.toArray?.() ?? [];
      const processed = new Set<string>();

      for (const desc of descriptions) {
         try {
            const edgeNode = indexManager.resolveElement(desc) as any;
            if (!edgeNode) {
               continue;
            }
            const relRef = edgeNode.relationship?.ref;
            const relId = relRef?.id ?? edgeNode.relationship?.$refText ?? '';
            if (!relId) {
               continue;
            }

            const relationshipGlobalId = this.getGlobalId(relationship) ?? relationship.id;
            const expectedRelRef = toIdReference(relationshipGlobalId ?? relationship.id ?? '');
            if (relId !== relationship.id && relId !== relationshipGlobalId && relId !== expectedRelRef) {
               continue;
            }

            const diagramRoot = edgeNode.$container as any;
            const diagramUri = edgeNode.$document?.uri?.toString?.();
            if (!diagramRoot || !diagramUri) {
               continue;
            }
            if (processed.has(diagramUri)) {
               continue;
            }

            const parentRef = relationship.parent;
            const childRef = relationship.child;
            if (!parentRef || !childRef) {
               continue;
            }

            const nodes = diagramRoot.nodes ?? [];
            const services = this.shared.ServiceRegistry.getServices(URI.parse(diagramUri)) as CrossModelServices;
            const idp = services.references.IdProvider;

            // Ensure parent/child nodes exist in diagram (create simple nodes if missing)
            const parentG = idp.getGlobalId(parentRef.ref);
            const childG = idp.getGlobalId(childRef.ref);
            const pRefText = parentRef.$refText;
            const cRefText = childRef.$refText;
            let parentNode = nodes.find((n: any) => idp.getGlobalId(n.entity?.ref) === parentG || n.entity?.$refText === pRefText);
            let childNode = nodes.find((n: any) => idp.getGlobalId(n.entity?.ref) === childG || n.entity?.$refText === cRefText);

            const createNodeIfMissing = (ref: any, globalId: string | undefined, existingNode: any, x: number, y: number): any => {
               if (existingNode) {
                  return existingNode;
               }
               const referenceText = idp.getReferenceId(ref.ref, diagramRoot) ?? toIdReference(globalId ?? ref.$refText ?? '');
               const node: any = {
                  $type: 'LogicalEntityNode',
                  $container: diagramRoot,
                  id: idp.findNextLocalId('LogicalEntityNode', (ref.ref?.id ?? 'Node') + 'Node', URI.parse(diagramUri)),
                  entity: { $refText: referenceText, ref: ref.ref },
                  x,
                  y,
                  width: 100,
                  height: 50
               };
               diagramRoot.nodes.push(node);
               return node;
            };

            parentNode = createNodeIfMissing(parentRef, parentG, parentNode, 100, 100);
            childNode = createNodeIfMissing(childRef, childG, childNode, 300, 100);

            // Remove existing relationship edges referencing the relationship
            const before = (diagramRoot.edges ?? []).length;
            diagramRoot.edges = (diagramRoot.edges ?? []).filter((e: any) => {
               const eRel = e.relationship?.ref?.id ?? e.relationship?.$refText;
               return !(eRel === relationship.id || eRel === relationshipGlobalId || eRel === expectedRelRef);
            });

            // Recreate edges between parentNode(s) and childNode(s)
            const newEdges: any[] = [];
            const parents = Array.isArray(parentNode) ? parentNode : [parentNode];
            const childs = Array.isArray(childNode) ? childNode : [childNode];
            for (const p of parents) {
               for (const c of childs) {
                  const edgeKey = relationship.id + 'Edge_' + p.id + '_' + c.id;
                  const edgeId = idp.findNextLocalId('RelationshipEdge', edgeKey, URI.parse(diagramUri));
                  const relRefText = toIdReference(idp.getGlobalId(relationship) ?? relationship.id ?? '');
                  const srcRefText = idp.getReferenceId(p.entity?.ref, diagramRoot) ?? toIdReference(idp.getNodeId(p) ?? p.id ?? '');
                  const tgtRefText = idp.getReferenceId(c.entity?.ref, diagramRoot) ?? toIdReference(idp.getNodeId(c) ?? c.id ?? '');
                  const srcX = (p.x ?? 0) + (p.width ?? 100) / 2;
                  const srcY = (p.y ?? 0) + (p.height ?? 50) / 2;
                  const tgtX = (c.x ?? 0) + (c.width ?? 100) / 2;
                  const tgtY = (c.y ?? 0) + (c.height ?? 50) / 2;
                  const newEdge = {
                     $type: 'RelationshipEdge',
                     $container: diagramRoot,
                     id: edgeId,
                     relationship: { ref: relationship, $refText: relRefText },
                     sourceNode: { ref: p, $refText: srcRefText },
                     targetNode: { ref: c, $refText: tgtRefText },
                     args: {
                        edgePadding: 5,
                        'reference-container-type': 'RelationshipEdge',
                        'reference-property': 'relationship',
                        'reference-value': relRefText,
                        edgeSourcePointX: srcX,
                        edgeSourcePointY: srcY,
                        edgeTargetPointX: tgtX,
                        edgeTargetPointY: tgtY
                     }
                  };
                  newEdges.push(newEdge);
               }
            }

            if (newEdges.length > 0) {
               diagramRoot.edges = (diagramRoot.edges ?? []).concat(newEdges);
            }

            if (diagramRoot.edges.length !== before || newEdges.length > 0) {
               processed.add(diagramUri);
               await this.update({ uri: diagramUri, model: diagramRoot, clientId: sourceClientId ?? LANGUAGE_CLIENT_ID });
               try {
                  // If the diagram file is open in the language client, also push the textual edit so the editor shows updated AST
                  if (this.documentManager.isOpenInLanguageClient(diagramUri)) {
                     const text = this.serialize(URI.parse(diagramUri), diagramRoot);
                     // eslint-disable-next-line no-console
                     await this.shared.lsp.Connection?.workspace.applyEdit({
                        label: 'Update Diagram',
                        documentChanges: [
                           // eslint-disable-next-line no-null/no-null
                           TextDocumentEdit.create(OptionalVersionedTextDocumentIdentifier.create(diagramUri, null), [
                              TextEdit.replace(Range.create(0, 0, uinteger.MAX_VALUE, uinteger.MAX_VALUE), text)
                           ])
                        ]
                     });
                  }
               } catch (e) {
                  // ignore applyEdit failures
               }
            }
         } catch (err: unknown) {
            // continue
         }
      }
   }
}
