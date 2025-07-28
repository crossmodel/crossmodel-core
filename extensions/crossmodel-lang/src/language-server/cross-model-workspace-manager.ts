/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { AstNode, DefaultWorkspaceManager, Deferred, FileSelector, FileSystemNode, LangiumDocument, UriUtils } from 'langium';
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
         await super.initializeWorkspace(folders, cancelToken);
         this.logger.info('Workspace Initialized');

         // notify that the workspace is initialized
         const uris = this.folders?.map(folder => this.getRootFolder(folder)) || [];
         this.workspaceInitializedDeferred.resolve(uris);
         this.onWorkspaceInitializedEmitter.fire(uris);

         // relink all data models as their dependencies might not have properly resolved due to the order in which files are processed
         const update = this.services.workspace.DataModelManager.getDataModelInfos().map(info => info.uri);
         await this.documentBuilder.update(update, [], cancelToken);
      } catch (error) {
         this.workspaceInitializedDeferred.reject(error);
      }
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
