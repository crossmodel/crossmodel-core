/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { findNextUnique, identity, toIdReference } from '@crossmodel/protocol';
import { AstNode, AstUtils, CstNode, GrammarUtils, NameProvider } from 'langium';
import { URI } from 'vscode-uri';
import { UNKNOWN_DATAMODEL_ID, UNKNOWN_DATAMODEL_REFERENCE } from './cross-model-datamodel-manager.js';
import { CrossModelServices } from './cross-model-module.js';
import { IdentifiedObject, isDataModel } from './generated/ast.js';
import { findDocument, getOwner } from './util/ast-util.js';

/** Property name for the id field, derived from the generated AST. */
export const ID_PROPERTY = IdentifiedObject.id;

export type IdentifiableAstNode = AstNode & {
   id?: string;
};

export type IdentifiedAstNode = AstNode & {
   [ID_PROPERTY]: string;
};

export function hasId(node?: AstNode): node is IdentifiedAstNode {
   return !!node && ID_PROPERTY in node && typeof node[ID_PROPERTY] === 'string';
}

export function getId(node?: AstNode): string | undefined {
   return hasId(node) ? node[ID_PROPERTY] : undefined;
}

export interface IdProvider extends NameProvider {
   getNodeId(node?: AstNode): string | undefined;
   getLocalId(node?: AstNode): string | undefined;
   getGlobalId(node?: AstNode): string | undefined;
   getReferenceId(target?: AstNode, source?: AstNode): string | undefined;

   findNextInternalId(type: string, proposal: string, container: AstNode): string;
   findNextLocalId(type: string, proposal: string, uri: URI): string;
   findNextGlobalId(type: string, proposal: string): string;
}

export const QUALIFIED_ID_SEPARATOR = '.';

export function combineIds(...ids: string[]): string {
   return ids.join(QUALIFIED_ID_SEPARATOR);
}

/**
 * A name provider that returns the fully qualified ID of a node by default but also exposes methods to get other names:
 * - The Node ID is just the id of the node itself if it has an id.
 * - The Local ID is the Node ID itself plus the Node ID of all it's parents within the same document.
 * - The External ID is the Local ID prefixed with the datamodel reference.
 */
export class DefaultIdProvider implements IdProvider {
   constructor(
      protected services: CrossModelServices,
      protected dataModelManager = services.shared.workspace.DataModelManager
   ) {}

   /**
    * Returns the direct name of the node if it has one.
    *
    * @param node node
    * @returns direct, local name of the node if available
    */
   getNodeId(node?: AstNode): string | undefined {
      return getId(node);
   }

   /**
    * Returns the qualified name / document-local name, i.e., the local name of the node plus the local name of all it's named
    * parents within the document.
    *
    * @param node node
    * @returns qualified, document-local name
    */
   getLocalId(node?: AstNode): string | undefined {
      if (!node) {
         return undefined;
      }
      let id = this.getNodeId(node);
      if (!id) {
         return undefined;
      }
      let parent = this.getParent(node);
      // Recurse through the parents to get the full local id.
      // For example for custom property of an attribute its <entity-id.attribute-id.custom-property-id).
      while (parent) {
         const parentId = this.getNodeId(parent);
         if (parentId) {
            id = combineIds(parentId, id);
         }
         parent = this.getParent(parent);
      }
      return id;
   }

   /**
    * Returns the fully-qualified / datamodel-local name, i.e., the datamodel name plus the document-local name.
    *
    * @param node node
    * @param dataModelReference datamodel reference
    * @returns fully qualified, datamodel-local name
    */
   getGlobalId(node?: AstNode, dataModelReference = this.getDataModelReferenceName(node)): string | undefined {
      const localId = this.getLocalId(node);
      if (!localId) {
         return undefined;
      }
      if (isDataModel(node)) {
         // the datamodel id does not need to be prefixed with it's own name
         return dataModelReference;
      }
      return combineIds(dataModelReference, localId);
   }

   getReferenceId(target?: AstNode, source?: AstNode): string | undefined {
      if (!target) {
         return undefined;
      }
      const sourceDataModel = this.getDataModelReferenceId(source);
      const targetDataModel = this.getDataModelReferenceId(target);
      if (!this.dataModelManager.isVisible(sourceDataModel, targetDataModel, true)) {
         return undefined;
      }
      const id = sourceDataModel === targetDataModel ? this.getLocalId(target) : this.getGlobalId(target);
      return id ? toIdReference(id) : undefined;
   }

   getDataModelReferenceName(node?: AstNode): string {
      return this.dataModelManager.getDataModelInfoByDocument(findDocument(node))?.referenceName ?? UNKNOWN_DATAMODEL_REFERENCE;
   }

   getDataModelReferenceId(node?: AstNode): string {
      return this.dataModelManager.getDataModelInfoByDocument(findDocument(node))?.id ?? UNKNOWN_DATAMODEL_ID;
   }

   getName(node?: AstNode): string | undefined {
      return node ? this.getGlobalId(node) : undefined;
   }

   getNameNode(node: AstNode): CstNode | undefined {
      return GrammarUtils.findNodeForProperty(node.$cstNode, ID_PROPERTY);
   }

   protected getParent(node: AstNode): AstNode | undefined {
      return getOwner(node) ?? node.$container;
   }

   findNextInternalId(type: string, proposal: string, container: AstNode): string {
      const idProposal = proposal.replaceAll('.', '_');
      const knownIds = AstUtils.streamAst(container)
         .filter(node => node.$type === type)
         .map(this.getNodeId)
         .nonNullable()
         .toArray();
      return findNextUnique(idProposal, knownIds, identity);
   }

   findNextLocalId(type: string, proposal: string, uri: URI): string {
      const idProposal = proposal.replaceAll('.', '_');
      const dataModelId = this.dataModelManager.getDataModelIdByUri(uri);

      const knownIds = this.services.shared.workspace.IndexManager
         .allElementsInDataModelOfType(dataModelId, type)
         .map(element => element.name)
         .toArray();

      return findNextUnique(idProposal, knownIds, identity);
   }

   findNextGlobalId(type: string, proposal: string): string {
      const idProposal = proposal.replaceAll('.', '_');
      const knownIds = this.services.shared.workspace.IndexManager
         .allElements(type)
         .map(element => element.name)
         .toArray();

      return findNextUnique(idProposal, knownIds, identity);
   }
}

