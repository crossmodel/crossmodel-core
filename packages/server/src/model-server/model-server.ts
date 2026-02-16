/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import {
   CloseModel,
   CloseModelArgs,
   CrossModelDocument,
   CrossModelRoot,
   CrossReference,
   CrossReferenceContext,
   DataModelInfo,
   DataModelInfoArgs,
   FindIdArgs,
   FindNextId,
   FindReferenceableElements,
   OnDataModelsUpdated,
   OnModelSaved,
   OnModelUpdated,
   OpenModel,
   OpenModelArgs,
   ReferenceableElement,
   RequestDataModelInfo,
   RequestDataModelInfos,
   RequestModel,
   ResolveReference,
   ResolvedElement,
   SaveModel,
   SaveModelArgs,
   UpdateModel,
   UpdateModelArgs
} from '@crossmodel/protocol';
import { Disposable } from 'vscode-jsonrpc';
import * as rpc from 'vscode-jsonrpc/node.js';

import { CrossModelLSPServices } from '../integration.js';
import { findDocument } from '../language-server/util/ast-util.js';

/**
 * The model server handles request messages on the RPC connection and ensures that any return value
 * can be sent to the client by ensuring proper serialization of semantic models.
 */
export class ModelServer implements Disposable {
   protected toDispose: Disposable[] = [];
   protected toDisposeForSession: Map<string, Disposable[]> = new Map();

   constructor(
      protected connection: rpc.MessageConnection,
      protected services: CrossModelLSPServices,
      protected modelService = services.shared.model.ModelService,
      protected converter = services.shared.client.Converter,
      protected logger = services.shared.client.Logger.for('ModelServer')
   ) {
      this.initialize(connection);
   }

   protected initialize(connection: rpc.MessageConnection): void {
      this.toDispose.push(connection.onRequest(OpenModel, args => this.openModel(args)));
      this.toDispose.push(connection.onRequest(CloseModel, args => this.closeModel(args)));
      this.toDispose.push(connection.onRequest(RequestModel, uri => this.requestModel(uri)));
      this.toDispose.push(connection.onRequest(FindReferenceableElements, args => this.complete(args)));
      this.toDispose.push(connection.onRequest(ResolveReference, args => this.resolve(args)));
      this.toDispose.push(connection.onRequest(FindNextId, args => this.findNextId(args)));
      this.toDispose.push(connection.onRequest(UpdateModel, args => this.updateModel(args)));
      this.toDispose.push(connection.onRequest(SaveModel, args => this.saveModel(args)));
      this.toDispose.push(connection.onRequest(RequestDataModelInfo, args => this.dataModelInfo(args)));
      this.toDispose.push(connection.onRequest(RequestDataModelInfos, () => this.dataModelInfos()));
      this.toDispose.push(this.modelService.onDataModelUpdated(event => this.connection.sendNotification(OnDataModelsUpdated, event)));
   }

   protected dataModelInfo(args: DataModelInfoArgs): Promise<DataModelInfo | undefined> {
      return this.modelService.getDataModelInfo(args);
   }

   protected dataModelInfos(): Promise<DataModelInfo[]> {
      return this.modelService.getDataModelInfos();
   }

   protected complete(args: CrossReferenceContext): Promise<ReferenceableElement[]> {
      return this.modelService.findReferenceableElements(args);
   }

   protected async resolve(args: CrossReference): Promise<ResolvedElement | undefined> {
      const node = await this.modelService.resolveCrossReference(args);
      if (!node) {
         return undefined;
      }
      const document = findDocument(node);
      if (!document) {
         return undefined;
      }
      const uri = document.uri.toString();
      const model = this.converter.toTransfer(document.parseResult.value);
      return { uri, model };
   }

   protected findNextId({ uri, type, proposal }: FindIdArgs): string {
      return this.modelService.findNextId(uri, type, proposal);
   }

   protected async openModel(args: OpenModelArgs): Promise<CrossModelDocument | undefined> {
      if (!this.modelService.isOpen(args.uri)) {
         await this.modelService.open(args);
      }
      this.setupListeners(args);
      return this.requestModel(args.uri);
   }

   protected sessionId(args: OpenModelArgs | CloseModelArgs): string {
      // Create a unique session ID based on the given arguments
      // This may not be unique if somehow the same client (aka widget on the client-side) opens the same document twice
      // If we want to allow that, we need an additional unique identifier in the args that is managed by the client
      return args.clientId + '_' + args.uri;
   }

   protected setupListeners(args: OpenModelArgs): void {
      this.disposeListeners(args);
      const listenersForClient = [];
      listenersForClient.push(
         this.modelService.onModelSaved(args.uri, event =>
            this.connection.sendNotification(OnModelSaved, {
               sourceClientId: event.sourceClientId,
               document: this.converter.toTransferDocument(event.document)
            })
         ),
         this.modelService.onModelUpdated(args.uri, event =>
            this.connection.sendNotification(OnModelUpdated, {
               sourceClientId: event.sourceClientId,
               document: this.converter.toTransferDocument(event.document),
               reason: event.reason
            })
         )
      );
      this.toDisposeForSession.set(this.sessionId(args), listenersForClient);
   }

   protected disposeListeners(args: CloseModelArgs): void {
      this.toDisposeForSession.get(this.sessionId(args))?.forEach(disposable => disposable.dispose());
      this.toDisposeForSession.delete(this.sessionId(args));
   }

   protected async closeModel(args: CloseModelArgs): Promise<void> {
      this.disposeListeners(args);
      return this.modelService.close(args);
   }

   protected async requestModel(uri: string): Promise<CrossModelDocument | undefined> {
      const document = await this.modelService.request(uri);
      return document ? this.converter.toTransferDocument(document) : undefined;
   }

   protected async updateModel(args: UpdateModelArgs<CrossModelRoot>): Promise<CrossModelDocument> {
      const updated = await this.modelService.update({ ...args, model: this.converter.toAstText(args.model) });
      return this.converter.toTransferDocument(updated);
   }

   protected async saveModel(args: SaveModelArgs<CrossModelRoot>): Promise<void> {
      await this.modelService.save({ ...args, model: this.converter.toAstText(args.model) });
   }

   dispose(): void {
      this.toDispose.forEach(disposable => disposable.dispose());
   }
}
