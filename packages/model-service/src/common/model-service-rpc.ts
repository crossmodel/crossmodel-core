/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import {
   CloseModelArgs,
   CrossModelDocument,
   CrossReference,
   CrossReferenceContext,
   DataModelInfo,
   DataModelInfoArgs,
   DataModelUpdatedEvent,
   FindIdArgs,
   ModelUpdatedEvent,
   OpenModelArgs,
   ReferenceableElement,
   ResolveObjectDefinitionArgs,
   ResolvedElement,
   ResolvedObjectDefinition,
   SaveModelArgs,
   UpdateModelArgs
} from '@crossmodel/protocol';
import { Event, RpcServer } from '@theia/core';

/** Path used to communicate between the Theia frontend and backend */
export const MODEL_SERVICE_PATH = '/services/model-service';

export const ModelService = Symbol('ModelService');
export interface ModelService
   extends Omit<ModelServiceServer, 'setClient' | 'getClient' | 'dispose'>,
      Omit<ModelServiceClient, 'getName' | 'updateModel' | 'updateDataModel' | 'ready'> {
   dataModels: DataModelInfo[];
}

/**
 * Protocol used by the Theia frontend-backend communication
 */
export const ModelServiceServer = Symbol('ModelServiceServer');
export interface ModelServiceServer extends RpcServer<ModelServiceClient> {
   // Model API
   open(args: OpenModelArgs): Promise<CrossModelDocument | undefined>;
   close(args: CloseModelArgs): Promise<void>;
   update(args: UpdateModelArgs): Promise<CrossModelDocument>;
   save(args: SaveModelArgs): Promise<void>;

   // Query API
   request(uri: string): Promise<CrossModelDocument | undefined>;
   findReferenceableElements(args: CrossReferenceContext): Promise<ReferenceableElement[]>;
   resolveReference(reference: CrossReference): Promise<ResolvedElement | undefined>;
   findNextId(args: FindIdArgs): Promise<string>;

   // DataModel API
   getDataModelInfos(): Promise<DataModelInfo[]>;
   getDataModelInfo(args: DataModelInfoArgs): Promise<DataModelInfo | undefined>;

   // ObjectDefinition API
   resolveObjectDefinition(args: ResolveObjectDefinitionArgs): Promise<ResolvedObjectDefinition | undefined>;
}

export const ModelServiceClient = Symbol('ModelServiceClient');
export interface ModelServiceClient {
   getName(): Promise<string>;
   ready(): Promise<void>;
   onReady: Event<void>;
   updateModel(args: ModelUpdatedEvent): Promise<void>;
   onModelUpdate: Event<ModelUpdatedEvent>;
   updateDataModel(args: DataModelUpdatedEvent): Promise<void>;
   onDataModelUpdate: Event<DataModelUpdatedEvent>;
}
