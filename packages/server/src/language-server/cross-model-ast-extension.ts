/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { toMutable } from '@crossmodel/protocol';
import { AstNode, AstNodeDescription, LangiumDocument } from 'langium';
import {
   LogicalAttribute,
   LogicalEntity,
   LogicalEntityNodeAttribute,
   SourceObjectAttribute,
   TargetObjectAttribute,
   isIdentifiedObject,
   isLogicalEntityNode,
   isSourceObject,
   isTargetObject
} from './ast.js';
import { CrossModelSharedServices } from './cross-model-module.js';
import { combineIds } from './cross-model-naming.js';

/**
 * Service that extends AST nodes with computed properties during scope computation.
 *
 * Called from `addLocalSymbol` during the ComputedScopes build phase to populate
 * derived `_`-prefixed properties on AST nodes. Currently computes:
 * - `_globalId` on all IdentifiedObject subtypes (via the ID provider)
 * - `_attributes` on LogicalEntityNode, SourceObject, and TargetObject (from referenced entity)
 * - `_id` on TargetObject (from referenced entity's id)
 */
export class CrossModelAstExtensionService {
   constructor(
      protected services: CrossModelSharedServices,
      protected descriptions = services.ServiceRegistry.CrossModel.workspace.AstNodeDescriptionProvider,
      protected idProvider = services.ServiceRegistry.CrossModel.references.IdProvider,
      protected logger = services.client.Logger.for('AstExtension')
   ) {}

   extendLocalAstNode(node: AstNode, nodeId: string | undefined, document: LangiumDocument): AstNodeDescription[] {
      // Set _globalId on all IdentifiedObject subtypes.
      // Uses the ID provider which combines the datamodel reference name with the local ID.
      // Only depends on the node's id property and $container chain, both available after parsing.
      if (toMutable(node, isIdentifiedObject)) {
         node._globalId = this.idProvider.getGlobalId(node);
      }

      if (toMutable(node, isLogicalEntityNode)) {
         node._attributes = this.createAttributes(node.entity?.ref, node, LogicalEntityNodeAttribute.$type);
      } else if (toMutable(node, isSourceObject)) {
         node._attributes = this.createAttributes(node.entity?.ref, node, SourceObjectAttribute.$type);
         if (nodeId) {
            // add source object attributes to the local scope as they may be used in conditions
            return node._attributes
               .filter(attribute => attribute.id !== undefined)
               .map(attribute => this.descriptions.createDescription(attribute, combineIds(nodeId, attribute.id!), document));
         }
      } else if (toMutable(node, isTargetObject)) {
         node._id = node.entity?.ref?.id;
         node._attributes = this.createAttributes(node.entity?.ref, node, TargetObjectAttribute.$type);
         // add target attributes to the local scope as they may be used in conditions
         // for target attributes we use simple names and not object-qualified ones
         return node._attributes
            .filter(attribute => attribute.id !== undefined)
            .map(attribute => this.descriptions.createDescription(attribute, attribute.id, document));
      }
      return [];
   }

   protected createAttributes<T extends LogicalAttribute>(source: LogicalEntity | undefined, container: AstNode, type: string): T[] {
      const entityAttributes = source?.attributes ?? [];
      return (
         entityAttributes.map<T>(
            attribute =>
               ({
                  ...attribute,
                  $container: container,
                  $type: type
               }) as T
         ) ?? []
      );
   }
}
