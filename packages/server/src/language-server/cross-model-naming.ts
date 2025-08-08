/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { findNextUnique, identity } from '@crossmodel/protocol';
import { AstNode, AstUtils, CstNode, GrammarUtils, isAstNode, NameProvider } from 'langium';
import { URI } from 'vscode-uri';
import { UNKNOWN_DATAMODEL_REFERENCE } from './cross-model-datamodel-manager.js';
import { CrossModelServices } from './cross-model-module.js';
import { isDataModel } from './generated/ast.js';
import { findDocument, getOwner } from './util/ast-util.js';
import { Utils } from './util/uri-util.js';

export const ID_PROPERTY = 'id';

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

   findNextId(type: string, proposal: string | undefined, container?: AstNode): string;
   findNextLocalId(type: string, proposal: string | undefined, container: AstNode): string;
   findNextGlobalId(type: string, proposal: string | undefined): string;
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
export class DefaultIdProvider implements NameProvider, IdProvider {
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
   getGlobalId(node?: AstNode, dataModelReference = this.getDataModelId(node)): string | undefined {
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

   getDataModelId(node?: AstNode): string {
      return this.dataModelManager.getDataModelInfoByDocument(findDocument(node))?.referenceName ?? UNKNOWN_DATAMODEL_REFERENCE;
   }

   getName(node?: AstNode): string | undefined {
      return node ? this.getGlobalId(node) : undefined;
   }

   getNameNode(node: AstNode): CstNode | undefined {
      return GrammarUtils.findNodeForProperty(node.$cstNode, ID_PROPERTY);
   }

   findNextId(type: string, proposal: string | undefined): string;
   findNextId(type: string, proposal: string | undefined, uri: URI): string;
   findNextId(type: string, proposal: string | undefined, container: AstNode): string;
   findNextId(type: string, proposal: string | undefined, container?: AstNode | URI): string {
      const idProposal = proposal?.replaceAll('.', '_');
      return isAstNode(container) ? this.findNextLocalId(type, idProposal, container) : this.findNextGlobalId(type, idProposal, container);
   }

   protected getParent(node: AstNode): AstNode | undefined {
      return getOwner(node) ?? node.$container;
   }

   findNextLocalId(type: string, proposal: string | undefined = 'Element', container: AstNode): string {
      const knownIds = AstUtils.streamAst(container)
         .filter(node => node.$type === type)
         .map(this.getNodeId)
         .nonNullable()
         .toArray();
      return findNextUnique(proposal, knownIds, identity);
   }

   findNextGlobalId(type: string, proposal: string | undefined = 'Element', uri?: URI): string {
      const knownIds = this.services.shared.workspace.IndexManager.allElements(type)
         .filter(candidate => !uri || !Utils.areEqual(uri, candidate.documentUri))
         .map(element => element.name)
         .toArray();
      return findNextUnique(proposal, knownIds, identity);
   }
}
