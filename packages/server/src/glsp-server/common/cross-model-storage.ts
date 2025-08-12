/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import {
   Action,
   ActionDispatcher,
   ClientSession,
   ClientSessionListener,
   ClientSessionManager,
   DisposableCollection,
   EditMode,
   GLSPServerError,
   Logger,
   MaybePromise,
   ModelSubmissionHandler,
   RequestModelAction,
   SOURCE_URI_ARG,
   SaveModelAction,
   SetEditModeAction,
   SourceModelStorage
} from '@eclipse-glsp/server';
import { inject, injectable, postConstruct } from 'inversify';
import { AstUtils } from 'langium';
import debounce from 'p-debounce';
import { DiagnosticSeverity } from 'vscode-languageserver-protocol';
import { URI } from 'vscode-uri';
import { CrossModelRoot } from '../../language-server/generated/ast.js';
import { AstCrossModelDocument } from '../../model-server/open-text-document-manager.js';
import { CrossModelState } from './cross-model-state.js';

/**
 * Model storage implementation that loads the model through the ModelService extension in our language services.
 * This way we ensure that during loading we get the latest up-to-date version from the central language storage and
 * any saved changes are properly synced back to it.
 */
@injectable()
export class CrossModelStorage implements SourceModelStorage, ClientSessionListener {
   @inject(Logger) protected logger!: Logger;
   @inject(CrossModelState) protected state!: CrossModelState;
   @inject(ClientSessionManager) protected sessionManager!: ClientSessionManager;
   @inject(ModelSubmissionHandler) protected submissionHandler!: ModelSubmissionHandler;
   @inject(ActionDispatcher) protected actionDispatcher: ActionDispatcher;

   protected toDispose = new DisposableCollection();

   @postConstruct()
   protected init(): void {
      this.sessionManager.addListener(this, this.state.clientId);
   }

   async loadSourceModel(action: RequestModelAction): Promise<void> {
      // load semantic model from document in language model service
      const sourceUri = this.getSourceUri(action);
      const rootUri = URI.file(sourceUri).toString();
      const document = await this.update(rootUri);
      if (!document) {
         return;
      }
      this.toDispose.push(await this.state.modelService.open({ uri: rootUri, clientId: this.state.clientId }));
      this.toDispose.push(
         this.state.modelService.onModelUpdated(rootUri, async event => {
            if (this.state.clientId !== event.sourceClientId || event.reason !== 'changed') {
               const result = await this.updateAndSubmit(rootUri, event.document);
               this.actionDispatcher.dispatchAll(result);
            }
         })
      );
   }

   protected async update(uri: string, document?: AstCrossModelDocument): Promise<AstCrossModelDocument | undefined> {
      const doc = document ?? (await this.state.modelService.request(uri));
      if (doc) {
         this.state.setSemanticRoot(uri, doc.root);
         const actions = await this.updateEditMode(doc);
         if (actions.length > 0) {
            setTimeout(() => this.actionDispatcher.dispatchAll(actions), 0);
         }
      } else {
         this.logger.error('Could not find model for ' + uri);
      }
      return doc;
   }

   protected async updateEditMode(document: AstCrossModelDocument): Promise<Action[]> {
      const actions = [];
      const prevEditMode = this.state.editMode;
      this.state.editMode =
         document.diagnostics.filter(diagnostic => diagnostic.severity === DiagnosticSeverity.Error).length > 0
            ? EditMode.READONLY
            : EditMode.EDITABLE;
      if (prevEditMode !== this.state.editMode) {
         if (this.state.isReadonly) {
            actions.push(SetEditModeAction.create(EditMode.READONLY));
         } else {
            actions.push(SetEditModeAction.create(EditMode.EDITABLE));
         }
      }
      return actions;
   }

   protected updateAndSubmit = debounce(async (rootUri: string, document: AstCrossModelDocument): Promise<Action[]> => {
      await this.update(rootUri, document);
      return [...(await this.submissionHandler.submitModel('external')), ...(await this.updateEditMode(document))];
   }, 250);

   saveSourceModel(action: SaveModelAction): MaybePromise<void> {
      const saveUri = this.getFileUri(action);

      // save document and all related documents
      this.state.modelService.save({ uri: saveUri, model: this.state.semanticRoot, clientId: this.state.clientId });
      AstUtils.streamReferences(this.state.semanticRoot)
         .map(refInfo => refInfo.reference.ref)
         .nonNullable()
         .map(ref => AstUtils.findRootNode(ref) as CrossModelRoot)
         .forEach(root =>
            this.state.modelService.save({ uri: root.$document!.uri.toString(), model: root, clientId: this.state.clientId })
         );
   }

   sessionDisposed(_clientSession: ClientSession): void {
      this.toDispose.dispose();
   }

   protected getSourceUri(action: RequestModelAction): string {
      const sourceUri = action.options?.[SOURCE_URI_ARG];
      if (typeof sourceUri !== 'string') {
         throw new GLSPServerError(`Invalid RequestModelAction! Missing argument with key '${SOURCE_URI_ARG}'`);
      }
      return sourceUri;
   }

   protected getFileUri(action: SaveModelAction): string {
      const uri = action.fileUri ?? this.state.get(SOURCE_URI_ARG);
      if (!uri) {
         throw new GLSPServerError('Could not derive fileUri for saving the current source model');
      }
      return uri;
   }
}
