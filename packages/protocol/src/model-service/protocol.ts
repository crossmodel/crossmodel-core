/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import * as rpc from 'vscode-jsonrpc/node';

import type { CrossModelRoot } from './transfer-model';
import type { CrossModelDocument } from './transfer-model-document';

// ---------------------------------------------------------------------------
// Client-server protocol: request/response arguments, events, RPC definitions
// ---------------------------------------------------------------------------

export interface ClientModelArgs {
   uri: string;
   clientId: string;
}

export interface OpenModelArgs extends ClientModelArgs {
   languageId?: string;
   version?: number;
   text?: string;
}

export interface CloseModelArgs extends ClientModelArgs {}

export interface UpdateModelArgs<T = CrossModelRoot> extends ClientModelArgs {
   model: T | string;
}

export interface SaveModelArgs<T = CrossModelRoot> extends ClientModelArgs {
   model: T | string;
}

export interface FindIdArgs extends SyntheticDocument {
   proposal: string;
}

export interface ModelUpdatedEvent<D = CrossModelDocument> {
   document: D;
   sourceClientId: string;
   reason: 'changed' | 'deleted' | 'updated' | 'saved';
}

export interface ModelSavedEvent<D = CrossModelDocument> {
   document: D;
   sourceClientId: string;
}

/**
 * A context to describe a cross reference to retrieve reachable elements.
 */
export interface CrossReferenceContext {
   /**
    * The container from which we want to query the reachable elements.
    */
   container: CrossReferenceContainer;
   /**
    * Synthetic elements starting from the container to further narrow down the cross reference.
    * This is useful for elements that are being created or if the element cannot be identified.
    */
   syntheticElements?: SyntheticElement[];
   /**
    * The property of the element referenced through the source container and the optional synthetic
    * elements for which we should retrieve the reachable elements.
    */
   property: string;
}

export interface RootElementReference {
   uri: string;
}

export function isRootElementReference(object: unknown): object is RootElementReference {
   return !!object && typeof object === 'object' && 'uri' in object && typeof object.uri === 'string';
}

export interface GlobalElementReference {
   globalId: string;
   type?: string;
}

export function isGlobalElementReference(object: unknown): object is GlobalElementReference {
   return !!object && typeof object === 'object' && 'globalId' in object && typeof object.globalId === 'string';
}

export interface SyntheticDocument {
   uri: string;
   type: string;
}

export function isSyntheticDocument(object: unknown): object is SyntheticDocument {
   return (
      !!object &&
      typeof object === 'object' &&
      'uri' in object &&
      typeof object.uri === 'string' &&
      'type' in object &&
      typeof object.type === 'string'
   );
}
export type CrossReferenceContainer = RootElementReference | GlobalElementReference | SyntheticDocument;

export interface SyntheticElement {
   type: string;
   property: string;
}

export function isSyntheticElement(object: unknown): object is SyntheticElement {
   return (
      !!object &&
      typeof object === 'object' &&
      'type' in object &&
      typeof object.type === 'string' &&
      'property' in object &&
      typeof object.property === 'string'
   );
}
export interface ReferenceableElement {
   uri: string;
   type: string;
   label: string;
}

export interface CrossReference {
   /**
    * The container from which we want to resolve the reference.
    */
   container: CrossReferenceContainer;
   /**
    * The property for which we want to resolve the reference.
    */
   property: string;
   /**
    * The textual value of the reference we are resolving.
    */
   value: string;
}

export interface ResolvedElement {
   uri: string;
   model: CrossModelRoot;
}

export interface DataModelInfoArgs {
   contextUri: string;
}

export interface DataModelInfo {
   id: string;
   name: string;
   type: string;
   directory: string;
   dataModelFilePath: string;
   modelFilePaths: string[];
}

export interface DataModelUpdatedEvent {
   dataModel: DataModelInfo;
   reason: 'added' | 'removed';
}

export type DataModelUpdateListener = (event: DataModelUpdatedEvent) => void | Promise<void>;

export const OpenModel = new rpc.RequestType1<OpenModelArgs, CrossModelDocument | undefined, void>('server/open');
export const CloseModel = new rpc.RequestType1<CloseModelArgs, void, void>('server/close');
export const RequestModel = new rpc.RequestType1<string, CrossModelDocument | undefined, void>('server/request');
export const RequestModelDiagramNode = new rpc.RequestType2<string, string, Element | undefined, void>('server/requestModelDiagramNode');

export const FindReferenceableElements = new rpc.RequestType1<CrossReferenceContext, ReferenceableElement[], void>('server/complete');
export const ResolveReference = new rpc.RequestType1<CrossReference, ResolvedElement | undefined, void>('server/resolve');
export const FindNextId = new rpc.RequestType1<FindIdArgs, string, void>('server/nextId');

export const UpdateModel = new rpc.RequestType1<UpdateModelArgs, CrossModelDocument, void>('server/update');
export const SaveModel = new rpc.RequestType1<SaveModelArgs, void, void>('server/save');
export const OnModelSaved = new rpc.NotificationType1<ModelSavedEvent>('server/onSave');
export const OnModelUpdated = new rpc.NotificationType1<ModelUpdatedEvent>('server/onUpdated');

export const RequestDataModelInfos = new rpc.RequestType1<void, DataModelInfo[], void>('server/dataModels');
export const RequestDataModelInfo = new rpc.RequestType1<DataModelInfoArgs, DataModelInfo | undefined, void>('server/dataModel');
export const OnDataModelsUpdated = new rpc.NotificationType1<DataModelUpdatedEvent>('server/onDataModelsUpdated');
