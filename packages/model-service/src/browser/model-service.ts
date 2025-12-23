/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
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
   ResolvedElement,
   SaveModelArgs,
   UpdateModelArgs
} from '@crossmodel/protocol';
import { Event } from '@theia/core';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { ModelService, ModelServiceClient, ModelServiceServer } from '../common';

@injectable()
export class ModelServiceImpl implements ModelService {
   @inject(ModelServiceServer) protected readonly server: ModelServiceServer;
   @inject(ModelServiceClient) protected readonly client: ModelServiceClient;
   @inject(WorkspaceService) protected readonly workspaceService: WorkspaceService;

   dataModels: DataModelInfo[] = [];

   @postConstruct()
   protected init(): void {
      this.initDataModelInfos();
   }

   protected async initDataModelInfos(): Promise<void> {
      // Only load data model infos when a workspace is opened. If no workspace is present yet,
      // register a listener to load once roots become available. This prevents triggering
      // backend connection attempts at startup when the editor is empty.
      const load = async (): Promise<void> => {
         this.dataModels = await this.server.getDataModelInfos();
         this.client.onDataModelUpdate(event => {
            this.dataModels = this.dataModels.filter(
               dataModel => dataModel.id !== event.dataModel.id || dataModel.dataModelFilePath !== event.dataModel.dataModelFilePath
            );
            if (event.reason === 'added') {
               this.dataModels.push(event.dataModel);
            }
         });
      };

      const roots = this.workspaceService.tryGetRoots();
      if (roots && roots.length > 0) {
         await load();
      } else {
         this.workspaceService.onWorkspaceChanged(async changedRoots => {
            if (changedRoots && changedRoots.length > 0) {
               await load();
            }
         });
      }
   }

   open(args: OpenModelArgs): Promise<CrossModelDocument | undefined> {
      return this.server.open(args);
   }

   close(args: CloseModelArgs): Promise<void> {
      return this.server.close(args);
   }

   update(args: UpdateModelArgs): Promise<CrossModelDocument> {
      return this.server.update(args);
   }

   save(args: SaveModelArgs): Promise<void> {
      return this.server.save(args);
   }

   request(uri: string): Promise<CrossModelDocument | undefined> {
      return this.server.request(uri);
   }

   findReferenceableElements(args: CrossReferenceContext): Promise<ReferenceableElement[]> {
      return this.server.findReferenceableElements(args);
   }

   resolveReference(reference: CrossReference): Promise<ResolvedElement | undefined> {
      return this.server.resolveReference(reference);
   }

   findNextId(args: FindIdArgs): Promise<string> {
      return this.server.findNextId(args);
   }

   getDataModelInfos(): Promise<DataModelInfo[]> {
      return this.server.getDataModelInfos();
   }

   getDataModelInfo(args: DataModelInfoArgs): Promise<DataModelInfo | undefined> {
      return this.server.getDataModelInfo(args);
   }

   get onModelUpdate(): Event<ModelUpdatedEvent> {
      return this.client.onModelUpdate;
   }

   get onDataModelUpdate(): Event<DataModelUpdatedEvent> {
      return this.client.onDataModelUpdate;
   }

   get onReady(): Event<void> {
      return this.client.onReady;
   }
}
