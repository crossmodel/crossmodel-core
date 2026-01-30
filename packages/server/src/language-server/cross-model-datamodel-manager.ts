/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { Disposable, DocumentState, LangiumDocument, MultiMap, UriUtils } from 'langium';
// eslint-disable-next-line import/no-unresolved
import * as protocol from '@crossmodel/protocol';
import { CancellationToken, WorkspaceFolder } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { CrossModelLangiumDocuments } from './cross-model-langium-documents.js';
import { CrossModelSharedServices } from './cross-model-module.js';
import { QUALIFIED_ID_SEPARATOR } from './cross-model-naming.js';
import { DataModel, DataModelDependency } from './generated/ast.js';
import { findDataModel } from './util/ast-util.js';
import { Utils } from './util/uri-util.js';

/** Constant for representing an unknown project ID. */
export const UNKNOWN_DATAMODEL_ID = 'unknown';

/** Constant for representing an unknown project reference. */
export const UNKNOWN_DATAMODEL_REFERENCE = 'unknown';

export function isDataModelUri(uri: URI): boolean {
   return UriUtils.basename(uri) === protocol.DATAMODEL_FILE;
}

/**
 * Creates a unique id for the given data model.
 *
 * @param id data model id
 * @param version version
 * @returns unique id
 */
export function createDataModelId(id?: string, version = '1.0.0'): string {
   return id === undefined ? UNKNOWN_DATAMODEL_ID : id + '@' + version;
}

/**
 * Creates the data model reference name for the given data model. This name is used to export the nodes in this data model and
 * thus will be used in the references and serialization.
 *
 * @param dataModel datamodel.cm data
 * @returns data model reference name
 */
export function createDataModelReferenceName(dataModel?: any): string {
   let name;
   if (dataModel?.id) {
      name = dataModel.id;
   } else if (dataModel?.name) {
      name = dataModel.name;
   } else {
      name = UNKNOWN_DATAMODEL_ID;
   }
   // ensure we only have characters that are supported by our ID rule in the grammar and still look good to the user
   return name.split(' ').join('_').split(QUALIFIED_ID_SEPARATOR).join('-');
}

export function isUnknownDataModel(dataModelId: string): boolean {
   return dataModelId === UNKNOWN_DATAMODEL_ID;
}

/**
 * Information derived from the datamodel.cm containing all data necessary within the crossmodel system.
 */
export class DataModelInfo {
   constructor(
      /** URI of the 'datamodel.cm' file. */
      readonly uri: URI,
      /** Data parsed from the 'datamodel.cm' file. */
      readonly dataModel: DataModel,
      /** URI of the directory in which the 'datamodel.cm' file is located. */
      readonly directory: URI = UriUtils.dirname(uri),
      /** Identifier for the data model. */
      readonly id = createDataModelId(dataModel.id, dataModel.version),
      /** Data model name used in references and serialization. */
      readonly referenceName = createDataModelReferenceName(dataModel),
      /** Data model type reference (ObjectDefinition ID). */
      readonly type = dataModel.type?.$refText ?? 'unknown',
      /** A list of all direct dependencies of this data model. */
      readonly dependencies = dataModel.dependencies.map((dep: DataModelDependency) =>
         // data models always live in the global scope, so we can use the $refText as id and avoid reference resolution here
         createDataModelId(dep.datamodel?.$refText, dep.version)
      ),
      /** True if this is an unknown data model, not having an id. */
      readonly isUnknown = isUnknownDataModel(id)
   ) {}
}

/**
 * A manager that builds up a system of data models on top of a given workspace.
 * Directories with a 'datamodel.cm' file represent a closed system that can only reference itself.
 * However, dependencies may be explicitly given as part of the 'datamodel.cm' in which case other systems may become visible/referable.
 */
export class CrossModelDataModelManager {
   protected uriToDataModel = new Map<string, DataModelInfo>();
   protected idToDataModel = new MultiMap<string, DataModelInfo>();
   protected readonly updateListeners: protocol.DataModelUpdateListener[] = [];

   constructor(
      protected shared: CrossModelSharedServices,
      protected fileSystemProvider = shared.workspace.FileSystemProvider,
      protected textDocuments = shared.workspace.TextDocuments,
      protected langiumDocuments = shared.workspace.LangiumDocuments,
      protected documentBuilder = shared.workspace.DocumentBuilder,
      protected logger = shared.logger.ClientLogger
   ) {
      this.documentBuilder.onUpdate((changed, deleted) => this.onBuildUpdate(changed, deleted));
      this.documentBuilder.onBuildPhase(DocumentState.Parsed, (docs, token) => this.documentParsed(docs, token));
   }

   /**
    * Initializes this data model manager for the given folders by parsing all datamodel.cm files available and
    * building up the dependencies between the data models.
    */
   async initialize(folders: WorkspaceFolder[]): Promise<void> {
      const initializations: Promise<void>[] = [];
      for (const folder of folders) {
         this.logger.info('[DataModel] Scan folder for data models: ' + UriUtils.basename(URI.parse(folder.uri)));
         initializations.push(this.initializeDataModels(URI.parse(folder.uri)));
      }
      await Promise.all(initializations);
   }

   protected async initializeDataModels(folderPath: URI): Promise<void> {
      const content = await this.fileSystemProvider.readDirectory(folderPath);
      await Promise.all(
         content.map(async entry => {
            if (entry.isDirectory) {
               await this.initializeDataModels(entry.uri);
            } else if (entry.isFile && isDataModelUri(entry.uri)) {
               await this.updateDataModel(entry.uri);
            }
         })
      );
   }

   getDataModelIdByUri(uri?: URI): string {
      return this.getDataModelInfoByURI(uri)?.id || UNKNOWN_DATAMODEL_ID;
   }

   getDataModelIdByDocument(doc?: LangiumDocument): string {
      return this.getDataModelInfoByDocument(doc)?.id || UNKNOWN_DATAMODEL_ID;
   }

   getDataModelInfoByDocument(doc?: LangiumDocument): DataModelInfo | undefined {
      if (!doc) {
         return undefined;
      }
      // during document parsing we store the data model URI in the document
      const dataModelUri = (doc as any)['dataModelUri'] as URI | undefined;
      return this.getDataModelInfoByURI(dataModelUri ?? doc.uri);
   }

   getDataModelInfos(): DataModelInfo[] {
      return Array.from(this.uriToDataModel.values());
   }

   getDataModelInfoByURI(uri?: URI): DataModelInfo | undefined {
      if (!uri) {
         return;
      }
      // see if we have a hit directly on a 'datamodel.cm' (faster)
      const dataModelInfo = this.uriToDataModel.get(uri.toString());
      if (dataModelInfo) {
         return dataModelInfo;
      }

      // find closest data model info based on the given URI
      // we prefer longer path names as we are deeper in the nested hierarchy
      const closestParent = [...this.uriToDataModel.values()]
         .filter(info => Utils.isEqualOrParent(info.directory, uri))
         .sort((left, right) => right.directory.fsPath.length - left.directory.fsPath.length)
         .at(0);

      if (closestParent) {
         return closestParent;
      }

      if (uri.scheme !== 'file') {
         return this.getDataModelInfoByURI(uri.with({ scheme: 'file' }));
      }

      return undefined;
   }

   isVisible(sourceDataModelId: string, targetDataModelId: string, includeSource = false): boolean {
      // built-in definitions (unknown data model) are always visible from any data model
      if (isUnknownDataModel(targetDataModelId)) {
         return !isUnknownDataModel(sourceDataModelId);
      }
      // an unknown data model cannot see anything else
      return (
         !isUnknownDataModel(sourceDataModelId) && this.getVisibleDataModelIds(sourceDataModelId, includeSource).includes(targetDataModelId)
      );
   }

   protected getAllDependencies(dataModelId: string): string[] {
      return this.idToDataModel.get(dataModelId).flatMap(info => info.dependencies);
   }

   protected getVisibleDataModelIds(sourceDataModel: string, includeSource = false, visited: string[] = []): string[] {
      // recursively get all visible data model ids by going down the data model dependencies starting from the source data model
      if (visited.includes(sourceDataModel)) {
         return [];
      }
      visited.push(sourceDataModel);
      const visible = includeSource ? [sourceDataModel] : [];
      this.getAllDependencies(sourceDataModel).forEach(dependency =>
         visible.push(...this.getVisibleDataModelIds(dependency, true, visited))
      );
      return visible;
   }

   protected async onBuildUpdate(changed: URI[], deleted: URI[]): Promise<void> {
      // convert 'datamodel.cm' updates to document updates
      // - remove 'datamodel.cm' updates and track necessary changes
      // - build all text documents that are within updated data models

      let affectedDataModels: string[] = [];
      const changedDataModels = getAndRemoveDataModelUris(changed);
      for (const changedDataModel of changedDataModels) {
         affectedDataModels.push(...(await this.updateDataModel(changedDataModel)));
      }
      const deletedDataModels = getAndRemoveDataModelUris(deleted);
      for (const deletedDataModel of deletedDataModels) {
         affectedDataModels.push(...this.deleteDataModel(deletedDataModel));
      }

      if (affectedDataModels.length > 0) {
         // add transitive affected data models
         this.idToDataModel
            .values()
            .filter(info => affectedDataModels.some(affected => info.dependencies.includes(affected)))
            .forEach(info => affectedDataModels.push(info.id));
         affectedDataModels = [...new Set(affectedDataModels)];
         this.logger.info(`[DataModel] Detect affected data models: ${affectedDataModels.join(', ')}`);

         // invalidate all documents that belong to affected data models
         const docs = this.langiumDocuments.all.filter(doc => affectedDataModels.includes(this.getDataModelIdByDocument(doc))).toArray();
         const workspace = this.shared.workspace.WorkspaceManager;
         this.logger.info(
            `[DataModel] Re-build affected documents (${docs.length}): ${docs.map(doc => workspace.wsRelativePath(doc.uri)).join(', ')}`
         );
         docs.forEach(doc => {
            this.langiumDocuments.invalidateDocument(doc.uri);
            changed.push(doc.uri);
         });
      }
   }

   protected addDataModel(uri: URI, dataModel: DataModel): string[] {
      const dataModelInfo = new DataModelInfo(uri, dataModel);
      if (!dataModelInfo.isUnknown) {
         this.uriToDataModel.set(dataModelInfo.uri.toString(), dataModelInfo);

         // remove existing entry if there is already one for this data model
         const existing = this.idToDataModel.get(dataModelInfo.id).find(info => info.uri.toString() === uri.toString());
         if (existing) {
            this.idToDataModel.delete(dataModelInfo.id, existing);
         }

         // warn if other data model with same ID (but different URI) is registered
         const sameId = this.idToDataModel.get(dataModelInfo.id).find(info => info.uri.toString() !== uri.toString());
         if (sameId) {
            this.logger.warn('[DataModel] A data model with the same id was already registered.');
         }
         this.idToDataModel.add(dataModelInfo.id, dataModelInfo);
         this.logger.info(
            `[DataModel] Add/Update data model "${dataModelInfo.id}" from ${this.shared.workspace.WorkspaceManager.wsRelativePath(uri)}`
         );
         this.emitUpdate({ dataModel: this.convertDataModelInfoToProtocolDataModelInfo(dataModelInfo), reason: 'added' });
         return [dataModelInfo.id];
      }
      return [];
   }

   protected deleteDataModel(uri: URI): string[] {
      const dataModelInfo = this.uriToDataModel.get(uri.toString());
      if (dataModelInfo && !dataModelInfo?.isUnknown) {
         this.uriToDataModel.delete(uri.toString());
         if (this.idToDataModel.delete(dataModelInfo.id, dataModelInfo)) {
            this.logger.info(
               `[DataModel] Remove data model "${dataModelInfo.id}" from ${this.shared.workspace.WorkspaceManager.wsRelativePath(uri)}`
            );
            this.emitUpdate({ dataModel: this.convertDataModelInfoToProtocolDataModelInfo(dataModelInfo), reason: 'removed' });
         }
         return [dataModelInfo.id];
      }
      return [];
   }

   protected async updateDataModel(uri: URI): Promise<string[]> {
      const newDataModel = await parseDataModelFile(uri, this.langiumDocuments);
      if (!newDataModel) {
         return [];
      }

      const toUpdate = [];
      const existingDataModelInfo = this.uriToDataModel.get(uri.toString());
      const newDataModelId = createDataModelId(newDataModel.id, newDataModel.version);
      if (existingDataModelInfo && existingDataModelInfo?.id !== newDataModelId) {
         this.logger.info(`[DataModel] Replace data model "${existingDataModelInfo.id}" with "${newDataModelId}"`);
         toUpdate.push(...this.deleteDataModel(uri));
      }
      toUpdate.push(...this.addDataModel(uri, newDataModel));
      return toUpdate;
   }

   protected async emitUpdate(event: protocol.DataModelUpdatedEvent): Promise<void> {
      await Promise.all(this.updateListeners.map(listener => listener(event)));
   }

   onUpdate(callback: protocol.DataModelUpdateListener): Disposable {
      this.updateListeners.push(callback);
      return Disposable.create(() => {
         const index = this.updateListeners.indexOf(callback);
         if (index >= 0) {
            this.updateListeners.splice(index, 1);
         }
      });
   }

   protected documentParsed(built: LangiumDocument[], _cancelToken: CancellationToken): void {
      // we only do this so we can quickly find the data model info for a given document
      for (const doc of built) {
         (doc as any)['dataModelUri'] = this.getDataModelInfoByURI(doc.uri)?.uri;
      }
   }

   convertDataModelInfoToProtocolDataModelInfo(dataModelInfo: DataModelInfo): protocol.DataModelInfo {
      const dataModelId = dataModelInfo.id;
      const directory = UriUtils.dirname(dataModelInfo.uri);
      return {
         id: dataModelInfo.id,
         name: dataModelInfo.dataModel?.name ?? UriUtils.basename(directory) ?? 'Unknown',
         type: dataModelInfo.dataModel?.type?.$refText ?? 'unknown',
         directory: directory.fsPath,
         dataModelFilePath: dataModelInfo.uri.fsPath,
         modelFilePaths: this.shared.workspace.IndexManager.allElementsInDataModel(dataModelId)
            .map(desc => desc.documentUri.fsPath)
            .distinct()
            .toArray()
      };
   }
}

function getAndRemoveDataModelUris(uris: URI[]): URI[] {
   const dataModels: URI[] = [];
   uris.forEach((uri, idx) => {
      if (isDataModelUri(uri)) {
         dataModels.push(...uris.splice(idx, 1));
      }
   });
   return dataModels;
}

async function parseDataModelFile(uri?: URI, langiumDocuments?: CrossModelLangiumDocuments): Promise<DataModel | undefined> {
   if (!uri || !langiumDocuments) {
      return undefined;
   }
   try {
      const document = await langiumDocuments.updateOrCreateDocument(uri);
      if (document.parseResult.lexerErrors.length > 0 || document.parseResult.parserErrors.length > 0) {
         console.error('Parse errors in datamodel file:', document.parseResult.lexerErrors, document.parseResult.parserErrors);
         return undefined;
      }
      return findDataModel(document);
   } catch (error) {
      console.error('Failed to parse datamodel file:', error);
      return undefined;
   }
}
