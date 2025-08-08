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
   ModelDiagnostic,
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
import { AstNode, AstUtils, isReference } from 'langium';
import { Disposable } from 'vscode-jsonrpc';
import * as rpc from 'vscode-jsonrpc/node.js';

import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver-protocol';
import * as ast from '../language-server/generated/ast.js';
import { IMPLICIT_ID_PROPERTY } from '../language-server/util/ast-util.js';
import { ModelService } from './model-service.js';

/**
 * The model server handles request messages on the RPC connection and ensures that any return value
 * can be sent to the client by ensuring proper serialization of semantic models.
 */
export class ModelServer implements Disposable {
   protected toDispose: Disposable[] = [];
   protected toDisposeForSession: Map<string, Disposable[]> = new Map();

   constructor(
      protected connection: rpc.MessageConnection,
      protected modelService: ModelService
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
      const uri = AstUtils.getDocument(node).uri.toString();
      const model = this.toSerializable(AstUtils.findRootNode(node)) as CrossModelRoot;
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

   protected setupListeners(args: OpenModelArgs): void {
      this.disposeListeners(args);
      const listenersForClient = [];
      listenersForClient.push(
         this.modelService.onModelSaved(args.uri, event =>
            this.connection.sendNotification(OnModelSaved, {
               sourceClientId: event.sourceClientId,
               document: this.toDocument(event.document)
            })
         ),
         this.modelService.onModelUpdated(args.uri, event =>
            this.connection.sendNotification(OnModelUpdated, {
               sourceClientId: event.sourceClientId,
               document: this.toDocument(event.document),
               reason: event.reason
            })
         )
      );
      this.toDisposeForSession.set(args.clientId, listenersForClient);
   }

   protected disposeListeners(args: CloseModelArgs): void {
      this.toDisposeForSession.get(args.clientId)?.forEach(disposable => disposable.dispose());
      this.toDisposeForSession.delete(args.clientId);
   }

   protected async closeModel(args: CloseModelArgs): Promise<void> {
      this.disposeListeners(args);
      return this.modelService.close(args);
   }

   protected async requestModel(uri: string): Promise<CrossModelDocument | undefined> {
      const document = await this.modelService.request(uri);
      return document ? this.toDocument(document) : undefined;
   }

   protected async updateModel(args: UpdateModelArgs<CrossModelRoot>): Promise<CrossModelDocument> {
      const updated = await this.modelService.update({ ...args, model: args.model as ast.CrossModelRoot });
      return this.toDocument(updated);
   }

   protected async saveModel(args: SaveModelArgs<CrossModelRoot>): Promise<void> {
      await this.modelService.save({ ...args, model: args.model as ast.CrossModelRoot });
   }

   dispose(): void {
      this.toDispose.forEach(disposable => disposable.dispose());
   }

   protected toDocument<T extends CrossModelDocument<ast.CrossModelRoot, Diagnostic>>(
      document: T
   ): CrossModelDocument<CrossModelRoot, ModelDiagnostic> {
      return {
         uri: document.uri,
         diagnostics: document.diagnostics.map(diagnostic => this.toModelDiagnostic(diagnostic)),
         root: this.toSerializable(document.root)!
      };
   }

   protected toModelDiagnostic(diagnostic: Diagnostic): ModelDiagnostic {
      const langiumCode = diagnostic.data?.code;
      return {
         message: diagnostic.message,
         severity:
            diagnostic.severity === DiagnosticSeverity.Error
               ? 'error'
               : diagnostic.severity === DiagnosticSeverity.Warning
                 ? 'warning'
                 : 'info',
         code: diagnostic.code ?? diagnostic.data?.code,
         type: langiumCode === 'lexing-error' ? 'lexing-error' : langiumCode === 'parsing-error' ? 'parsing-error' : 'validation-error'
      };
   }

   /**
    * Cleans the semantic object of any property that cannot be serialized as a String and thus cannot be sent to the client
    * over the RPC connection.
    *
    * @param obj semantic object
    * @returns serializable semantic object
    */
   protected toSerializable<T extends AstNode = ast.CrossModelRoot, O extends object = CrossModelRoot>(obj?: T): O | undefined {
      if (!obj) {
         return;
      }
      // We remove all $<property> from the semantic object with the exception of type
      // they are added by Langium but have no additional value on the client side
      // Furthermore we ensure that for references we use their string representation ($refText)
      // instead of their real value to avoid sending whole serialized object graphs
      return <O>Object.entries(obj)
         .filter(([key, value]) => !key.startsWith('$') || key === '$type' || key === IMPLICIT_ID_PROPERTY)
         .reduce((acc, [key, value]) => ({ ...acc, [key]: this.cleanValue(value) }), { $globalId: this.modelService.getGlobalId(obj) });
   }

   protected cleanValue(value: any): any {
      if (Array.isArray(value)) {
         return value.map(val => this.cleanValue(val));
      } else if (this.isContainedObject(value)) {
         return this.toSerializable(value);
      } else {
         return this.resolvedValue(value);
      }
   }

   protected isContainedObject(value: any): boolean {
      return value === Object(value) && !isReference(value);
   }

   protected resolvedValue(value: any): any {
      if (isReference(value)) {
         return value.$refText;
      }
      return value;
   }
}
