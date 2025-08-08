/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { RELATIONSHIP_EDGE_TYPE, computeRelationshipName, toId, toIdReference } from '@crossmodel/protocol';
import {
   ActionDispatcher,
   Command,
   CreateEdgeOperation,
   JsonCreateEdgeOperationHandler,
   ModelState,
   SelectAction
} from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import { URI, Utils as UriUtils } from 'vscode-uri';
import { CrossModelRoot, LogicalEntityNode, Relationship, RelationshipEdge } from '../../../language-server/generated/ast.js';
import { Utils } from '../../../language-server/util/uri-util.js';
import { CrossModelCommand } from '../../common/cross-model-command.js';
import { SystemModelState } from '../model/system-model-state.js';

@injectable()
export class SystemDiagramCreateRelationshipOperationHandler extends JsonCreateEdgeOperationHandler {
   override label = '1:1 Relationship';
   elementTypeIds = [RELATIONSHIP_EDGE_TYPE];

   @inject(ModelState) protected override modelState: SystemModelState;
   @inject(ActionDispatcher) protected actionDispatcher: ActionDispatcher;

   createCommand(operation: CreateEdgeOperation): Command {
      return new CrossModelCommand(this.modelState, () => this.createEdge(operation));
   }

   protected async createEdge(operation: CreateEdgeOperation): Promise<void> {
      const sourceNode = this.modelState.index.findLogicalEntityNode(operation.sourceElementId);
      const targetNode = this.modelState.index.findLogicalEntityNode(operation.targetElementId);

      if (sourceNode && targetNode) {
         // before we can create a diagram edge, we need to create the corresponding relationship that it is based on
         const relationship = await this.createAndSaveRelationship(sourceNode, targetNode);
         if (relationship) {
            const edge: RelationshipEdge = {
               $type: RelationshipEdge,
               $container: this.modelState.systemDiagram,
               id: this.modelState.idProvider.findNextId(RelationshipEdge, relationship.id + 'Edge', this.modelState.systemDiagram),
               relationship: {
                  ref: relationship,
                  $refText: toIdReference(this.modelState.idProvider.getGlobalId(relationship) || relationship.id || '')
               },
               sourceNode: {
                  ref: sourceNode,
                  $refText: toIdReference(this.modelState.idProvider.getNodeId(sourceNode) || sourceNode.id || '')
               },
               targetNode: {
                  ref: targetNode,
                  $refText: toIdReference(this.modelState.idProvider.getNodeId(targetNode) || targetNode.id || '')
               }
            };
            this.modelState.systemDiagram.edges.push(edge);
            this.actionDispatcher.dispatchAfterNextUpdate(
               SelectAction.create({ selectedElementsIDs: [this.modelState.idProvider.getLocalId(edge) ?? edge.id!] })
            );
         }
      }
   }

   /**
    * Creates a new relationship and stores it on a file on the file system.
    */
   protected async createAndSaveRelationship(
      sourceNode: LogicalEntityNode,
      targetNode: LogicalEntityNode
   ): Promise<Relationship | undefined> {
      const source = sourceNode.entity?.ref?.id || sourceNode.entity?.$refText;
      const target = targetNode.entity?.ref?.id || targetNode.entity?.$refText;

      // create relationship, serialize and re-read to ensure everything is up to date and linked properly
      const relationshipRoot: CrossModelRoot = { $type: 'CrossModelRoot' };
      const name = computeRelationshipName(source, target);
      const id = this.modelState.idProvider.findNextId(Relationship, toId(name));
      const relationship: Relationship = {
         $type: Relationship,
         $container: relationshipRoot,
         id,
         name,
         attributes: [],
         parent: { $refText: toIdReference(sourceNode.entity?.$refText || '') },
         child: { $refText: toIdReference(targetNode.entity?.$refText || '') },
         customProperties: []
      };

      // search for unique file name for the relationship and use file base name as relationship name
      // if the user doesn't rename any files we should end up with unique names ;-)
      const dirName = UriUtils.joinPath(UriUtils.dirname(URI.parse(this.modelState.semanticUri)), '..', 'relationships');
      const targetUri = UriUtils.joinPath(dirName, relationship.id + '.relationship.cm');
      const uri = Utils.findNewUri(targetUri);

      relationshipRoot.relationship = relationship;
      const text = this.modelState.semanticSerializer.serialize(relationshipRoot);

      await this.modelState.modelService.save({ uri: uri.toString(), model: text, clientId: this.modelState.clientId });
      const document = await this.modelState.modelService.request(uri.toString());
      return document?.root.relationship;
   }
}
