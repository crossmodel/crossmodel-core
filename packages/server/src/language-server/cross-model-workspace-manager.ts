/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import {
   AstNode,
   DefaultWorkspaceManager,
   Deferred,
   DocumentState,
   FileSelector,
   FileSystemNode,
   LangiumDocument,
   UriUtils
} from 'langium';
import { CancellationToken, Emitter, Event, WorkspaceFolder } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { CrossModelSharedServices } from './cross-model-module.js';

/**
 * A custom workspace manager that:
 * - fires an event when the workspace is initialized (we use this for starting LSP-dependent servers)
 * - sets up a package-system on top of the workspace folders (including the 'node_modules' folder)
 * - validates all documents after workspace initialization
 */
export class CrossModelWorkspaceManager extends DefaultWorkspaceManager {
   protected onWorkspaceInitializedEmitter = new Emitter<URI[]>();
   protected workspaceInitializedDeferred = new Deferred<URI[]>();
   workspaceInitialized = this.workspaceInitializedDeferred.promise;

   constructor(
      protected services: CrossModelSharedServices,
      protected logger = services.logger.ClientLogger
   ) {
      super(services);
      this.initialBuildOptions = { validation: true };
   }

   override async initializeWorkspace(folders: WorkspaceFolder[], cancelToken?: CancellationToken | undefined): Promise<void> {
      try {
         this.logger.info('[Workspace] Initialize...');
         await super.initializeWorkspace(folders, cancelToken);
         this.logger.info('[Workspace] Initialized');

         // notify that the workspace is initialized
         this.logger.info('[Workspace] Notify Initialized');
         const uris = this.folders?.map(folder => this.getRootFolder(folder)) || [];
         this.workspaceInitializedDeferred.resolve(uris);
         this.onWorkspaceInitializedEmitter.fire(uris);
      } catch (error) {
         this.workspaceInitializedDeferred.reject(error as Error);
      }
   }

   async updateDataModels(wsUri: string | undefined = this.workspaceFolders?.[0].uri, cancelToken?: CancellationToken): Promise<void> {
      if (!wsUri) {
         this.logger.warn('[DataModel] Rebuild: No workspace folder found, skipping.');
         return;
      }
      this.logger.info('[DataModel] Rebuild Links: Wait for finishing build.');
      await this.documentBuilder.waitUntil(DocumentState.Validated);
      const update = this.services.workspace.DataModelManager.getDataModelInfos().map((info: { uri: URI }) => info.uri);
      this.logger.info('[DataModel] Rebuild Links: Updating ' + update.map(uri => UriUtils.relative(wsUri, uri.path)).join(', '));
      await this.documentBuilder.update(update, [], cancelToken);
      this.logger.info('[DataModel] Rebuild Links: Finished');
   }

   get onWorkspaceInitialized(): Event<URI[]> {
      return this.onWorkspaceInitializedEmitter.event;
   }

   protected override async loadAdditionalDocuments(
      folders: WorkspaceFolder[],
      _collector: (document: LangiumDocument<AstNode>) => void
   ): Promise<void> {
      // build up datamodel-system based on the workspace
      return this.services.workspace.DataModelManager.initialize(folders);
   }

   protected override includeEntry(_workspaceFolder: WorkspaceFolder, entry: FileSystemNode, selector: FileSelector): boolean {
      const name = UriUtils.basename(entry.uri);
      if (entry.isDirectory && name === 'node_modules') {
         return true; // Allow 'node_modules' directories to be scanned
      }
      return super.includeEntry(_workspaceFolder, entry, selector);
   }
}
