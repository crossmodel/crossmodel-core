/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { AstNode, DefaultWorkspaceManager, Deferred, DocumentState, LangiumDocument, UriUtils } from 'langium';
import { CancellationToken, WorkspaceFolder } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { CrossModelSharedServices } from './cross-model-module.js';

/**
 * A custom workspace manager that:
 * - fires an event when the workspace is initialized (we use this for starting LSP-dependent servers)
 * - sets up a package-system on top of the workspace folders (including the 'node_modules' folder)
 * - validates all documents after workspace initialization
 */
export class CrossModelWorkspaceManager extends DefaultWorkspaceManager {
   protected workspaceInitializedDeferred = new Deferred<URI>();
   workspaceInitialized = this.workspaceInitializedDeferred.promise;

   constructor(
      protected services: CrossModelSharedServices,
      protected logger = services.client.Logger.for('Workspace')
   ) {
      super(services);
      this.initialBuildOptions = { validation: true };
   }

   override async initializeWorkspace(folders: WorkspaceFolder[], cancelToken?: CancellationToken | undefined): Promise<void> {
      try {
         this.logger.info(`Initialize: ${folders.length > 0 ? `${folders.map(f => f.name).join(', ')}` : '<empty>'}`);
         await super.initializeWorkspace(folders, cancelToken);
         this.logger.info('Initialized.');

         // notify that the workspace is initialized
         this.logger.info('Notify Listeners...');
         if (this.workspace) {
            this.workspaceInitializedDeferred.resolve(this.getRootFolder(this.workspace));
         }
      } catch (error) {
         this.workspaceInitializedDeferred.reject(error as Error);
      }
   }

   get workspace(): WorkspaceFolder | undefined {
      return this.workspaceFolders?.[0];
   }

   wsRelativePath(uri: URI, workspace?: string): string;
   wsRelativePath(uri: string, workspace?: string): string;
   wsRelativePath(uri: string | URI, workspace = this.workspace?.uri): string {
      return workspace ? UriUtils.relative(workspace, uri) : typeof uri === 'string' ? uri : uri.path.toString();
   }

   async updateDataModels(wsUri: string | undefined = this.workspace?.uri, cancelToken?: CancellationToken): Promise<void> {
      if (!wsUri) {
         this.logger.warn('Rebuild DataModels: No workspace folder found, skipping.');
         return;
      }
      this.logger.info('Rebuild DataModels: Wait for finishing build...');
      await this.documentBuilder.waitUntil(DocumentState.Validated);
      const update = this.services.workspace.DataModelManager.getDataModelInfos().map((info: { uri: URI }) => info.uri);
      this.logger.info(`Rebuild DataModels: Update ${update.map(uri => this.wsRelativePath(uri.path, wsUri)).join(', ')}`);
      await this.documentBuilder.update(update, [], cancelToken);
   }

   protected override async loadAdditionalDocuments(
      folders: WorkspaceFolder[],
      _collector: (document: LangiumDocument<AstNode>) => void
   ): Promise<void> {
      // build up datamodel-system based on the workspace
      this.logger.info('Initialize DataModels...');
      return this.services.workspace.DataModelManager.initialize(folders);
   }
}
