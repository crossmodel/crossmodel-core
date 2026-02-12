/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { ENTITY_NODE_TYPE, ExpandNavigatorForNewFileAction, ModelFileType, ModelStructure, toIdReference } from '@crossmodel/protocol';
import {
   Action,
   ActionDispatcher,
   Command,
   CreateNodeOperation,
   JsonCreateNodeOperationHandler,
   MaybePromise,
   Point,
   SelectAction
} from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import { Utils as UriUtils } from 'vscode-uri';
import { CrossModelRoot, LogicalEntity, LogicalEntityNode } from '../../../language-server/ast.js';
import { Utils } from '../../../language-server/util/uri-util.js';
import { CrossModelCommand } from '../../common/cross-model-command.js';
import { SystemModelState } from '../model/system-model-state.js';

@injectable()
export class SystemDiagramCreateEntityOperationHandler extends JsonCreateNodeOperationHandler {
   override label = 'Create Entity';
   elementTypeIds = [ENTITY_NODE_TYPE];

   declare protected modelState: SystemModelState;
   @inject(ActionDispatcher) protected actionDispatcher: ActionDispatcher;

   override createCommand(operation: CreateNodeOperation): MaybePromise<Command | undefined> {
      return new CrossModelCommand(this.modelState, () => this.createNode(operation));
   }

   protected async createNode(operation: CreateNodeOperation): Promise<void> {
      const entity = await this.createAndSaveEntity(operation);
      if (!entity) {
         return;
      }
      const container = this.modelState.systemDiagram;
      const location = this.getLocation(operation) ?? Point.ORIGIN;
      const node: LogicalEntityNode = {
         $type: LogicalEntityNode.$type,
         $container: container,
         _attributes: [],
         id: this.modelState.idProvider.findNextInternalId(LogicalEntityNode.$type, entity.name + 'Node', container),
         entity: {
            $refText: toIdReference(this.modelState.idProvider.getNodeId(entity) || entity.id || ''),
            ref: entity
         },
         x: location.x,
         y: location.y,
         width: 10,
         height: 10
      };
      container.nodes.push(node);
      const nodeId = this.modelState.index.createId(node);
      // Dispatch EditLabel action to allow inline name editing
      this.actionDispatcher.dispatchAfterNextUpdate({
         kind: 'EditLabel',
         labelId: `${nodeId}_label`
      } as Action);
      // Select the node to trigger property widget loading
      this.actionDispatcher.dispatchAfterNextUpdate(SelectAction.create({ selectedElementsIDs: [nodeId] }));
   }

   /**
    * Creates a new entity and stores it on a file on the file system.
    */
   protected async createAndSaveEntity(operation: CreateNodeOperation): Promise<LogicalEntity | undefined> {
      const dataModel = this.modelState.dataModel();
      if (!dataModel) {
         return undefined;
      }

      // create entity, serialize and re-read to ensure everything is up to date and linked properly
      const entityRoot: CrossModelRoot = { $type: 'CrossModelRoot' };
      const name = operation.args?.name?.toString() ?? 'NewEntity';

      const id = this.modelState.idProvider.findNextLocalId(LogicalEntity.$type, name, dataModel.uri);

      const entity: LogicalEntity = {
         $type: 'LogicalEntity',
         $container: entityRoot,
         id,
         name,
         attributes: [],
         identifiers: [],
         inherits: [],
         customProperties: []
      };

      const dirName = UriUtils.joinPath(dataModel.directory, ModelStructure.LogicalEntity.FOLDER);
      const targetUri = UriUtils.joinPath(dirName, entity.id + ModelFileType.getFileExtension(ModelFileType.LogicalEntity));
      const uri = Utils.findNewUri(targetUri);

      entityRoot.entity = entity;
      await this.modelState.modelService.save({ uri: uri.toString(), model: entityRoot, clientId: this.modelState.clientId });
      // Notify client to expand the navigator and reveal the newly created file
      this.actionDispatcher.dispatchAfterNextUpdate(
         ExpandNavigatorForNewFileAction.create({ parentUri: dirName.toString(), uri: uri.toString() })
      );
      const document = await this.modelState.modelService.request(uri.toString());
      return document?.root?.entity;
   }
}
