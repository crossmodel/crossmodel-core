/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { DropFilesOperation, ModelFileExtensions, toIdReference } from '@crossmodel/protocol';
import { Command, JsonOperationHandler } from '@eclipse-glsp/server';
import { injectable } from 'inversify';
import { Reference } from 'langium';
import { URI } from 'vscode-uri';
import {
   LogicalEntity,
   LogicalEntityNode,
   Relationship,
   RelationshipEdge,
   SystemDiagram,
   SystemDiagramEdge,
   isLogicalEntity,
   isRelationshipEdge
} from '../../../language-server/ast.js';
import { CrossModelCommand } from '../../common/cross-model-command.js';
import { SystemModelState } from '../model/system-model-state.js';

/**
 * An operation handler for the 'DropEntityOperation' that finds an entity for each of the given file URIs and
 * creates a new node on the diagram for each of the found entities. If multiple entities are placed on the diagram
 * their position is shifted by (10,10) so they do not fully overlap.
 */
@injectable()
export class SystemDiagramDropFilesOperationHandler extends JsonOperationHandler {
   override operationType = DropFilesOperation.KIND;

   declare protected modelState: SystemModelState;

   createCommand(operation: DropFilesOperation): Command {
      return new CrossModelCommand(this.modelState, () => this.createNodesAndEdges(operation));
   }

   protected async createNodesAndEdges(operation: DropFilesOperation): Promise<void> {
      const container = this.modelState.systemDiagram;

      // for multiple files the position is shifted for each file
      let x = operation.position.x;
      let y = operation.position.y;

      for (const filePath of operation.files) {
         const document = await this.modelState.modelService.request(URI.file(filePath).toString());

         if (ModelFileExtensions.isEntityFile(filePath)) {
            const entity = document?.root?.entity;
            if (entity) {
               await this.createEntityNode(entity, container, (x += 10), (y += 10));
            }
         } else if (ModelFileExtensions.isRelationshipFile(filePath)) {
            const relationship = document?.root?.relationship;
            if (relationship) {
               await this.createRelationshipEdge(relationship, container, (x += 10), (y += 10));
            }
         }
      }
   }

   protected async createEntityNode(
      entity: LogicalEntity,
      container: SystemDiagram,
      x: number,
      y: number
   ): Promise<LogicalEntityNode | undefined> {
      // Always create new entity node even if node for that entity already exists
      const referenceText = this.modelState.idProvider.getReferenceId(entity, container);
      if (!referenceText) {
         return;
      }
      const node: LogicalEntityNode = {
         $type: LogicalEntityNode.$type,
         $container: container,
         _attributes: [],
         id: this.modelState.idProvider.findNextInternalId(LogicalEntityNode.$type, entity.id + 'Node', this.modelState.systemDiagram),
         entity: {
            $refText: referenceText,
            ref: entity
         },
         x,
         y,
         width: 10,
         height: 10
      };
      container.nodes.push(node);
      return node;
   }

   protected async createRelationshipEdge(relationship: Relationship, container: SystemDiagram, x: number, y: number): Promise<void> {
      // Get parent and child entity references
      if (!relationship.parent || !relationship.child) {
         console.warn('Relationship missing parent or child entity reference:', relationship.id);
         return;
      }

      // Ensure both entities exist as nodes in the diagram
      const parentNodes = await this.ensureEntityNodesExist(relationship.parent, container, x, y);
      const childNodes = await this.ensureEntityNodesExist(relationship.child, container, x + 300, y);

      // Create relationship edges for all combinations of parent and child nodes
      for (const parentNode of parentNodes) {
         for (const childNode of childNodes) {
            // Check if edge already exists between these specific nodes
            const existingEdge = container.edges.find(
               (edge: SystemDiagramEdge) =>
                  isRelationshipEdge(edge) &&
                  edge.relationship?.ref?.id === relationship.id &&
                  edge.sourceNode?.ref?.id === parentNode.id &&
                  edge.targetNode?.ref?.id === childNode.id
            );

            if (!existingEdge) {
               const edge: RelationshipEdge = {
                  $type: RelationshipEdge.$type,
                  $container: container,
                  id: this.modelState.idProvider.findNextInternalId(
                     RelationshipEdge.$type,
                     relationship.id + 'Edge_' + parentNode.id + '_' + childNode.id,
                     this.modelState.systemDiagram
                  ),
                  relationship: {
                     ref: relationship,
                     $refText: toIdReference(this.modelState.idProvider.getGlobalId(relationship) || relationship.id || '')
                  },
                  sourceNode: {
                     ref: parentNode,
                     $refText: toIdReference(this.modelState.idProvider.getNodeId(parentNode) || parentNode.id || '')
                  },
                  targetNode: {
                     ref: childNode,
                     $refText: toIdReference(this.modelState.idProvider.getNodeId(childNode) || childNode.id || '')
                  }
               };
               container.edges.push(edge);
            }
         }
      }
   }

   protected async ensureEntityNodesExist(
      entityRef: Reference<LogicalEntity>,
      container: SystemDiagram,
      x: number,
      y: number
   ): Promise<LogicalEntityNode[]> {
      // Find all existing nodes for this entity
      const globalId = this.modelState.idProvider.getGlobalId(entityRef.ref);
      const existingNodes = container.nodes.filter(
         (node: LogicalEntityNode) =>
            this.modelState.idProvider.getGlobalId(node.entity?.ref) === globalId || node.entity?.$refText === entityRef.$refText
      );

      if (existingNodes.length > 0) {
         return existingNodes;
      }

      // Entity not found in diagram, need to resolve and create it
      const scope = this.modelState.services.language.references.ScopeProvider.getCompletionScope(
         {
            container: { globalId: this.modelState.systemDiagram.id! },
            syntheticElements: [{ property: 'nodes', type: LogicalEntityNode.$type }],
            property: 'entity'
         },
         { filterGlobalForLocal: false } // references may use local or global id, we accept both
      );
      const entityDescription = globalId
         ? (scope.elementScope.getElement(globalId) ?? scope.elementScope.getElement(entityRef.$refText))
         : scope.elementScope.getElement(entityRef.$refText);
      if (isLogicalEntity(entityDescription?.node)) {
         const newNode = await this.createEntityNode(entityDescription.node, container, x, y);
         if (newNode) {
            return [newNode];
         }
      }

      console.warn('Could not resolve entity reference:', entityRef);
      return [];
   }
}
