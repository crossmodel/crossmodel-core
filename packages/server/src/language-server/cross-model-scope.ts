/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { AstNode, AstNodeDescription, AstUtils, DefaultScopeComputation, LangiumDocument, PrecomputedScopes, Reference } from 'langium';
import { CancellationToken } from 'vscode-jsonrpc';
import { CrossModelDataModelManager, UNKNOWN_DATAMODEL_ID, UNKNOWN_DATAMODEL_REFERENCE } from './cross-model-datamodel-manager.js';
import { CrossModelServices } from './cross-model-module.js';
import { DefaultIdProvider, combineIds } from './cross-model-naming.js';
import {
   LogicalEntity,
   LogicalEntityNode,
   LogicalEntityNodeAttribute,
   SourceObject,
   SourceObjectAttribute,
   TargetObject,
   TargetObjectAttribute,
   isLogicalEntityNode,
   isSourceObject,
   isTargetObject
} from './generated/ast.js';
import { fixDocument, setAttributes, setImplicitId, setOwner } from './util/ast-util.js';

/**
 * Custom node description that wraps a given description under a potentially new name and also stores the datamodel id for faster access.
 */
export class DataModelScopedAstNodeDescription implements AstNodeDescription {
   constructor(
      public dataModelId: string,
      public name: string,
      public delegate: AstNodeDescription,
      public node = delegate.node,
      public nameSegment = delegate.nameSegment,
      public selectionSegment = delegate.selectionSegment,
      public type = delegate.type,
      public documentUri = delegate.documentUri,
      public path = delegate.path
   ) {}
}

/**
 * Custom class to represent datamodel-local descriptions without the datamodel name so we can do easier instanceof checks.
 */
export class LocalAstNodeDescription extends DataModelScopedAstNodeDescription {
   constructor(dataModelId: string, name: string, delegate: AstNodeDescription) {
      super(dataModelId, name, delegate);
   }
}

/**
 * Custom class to represent datamodel-external descriptions with the datamodel name so we can do easier instanceof checks.
 */
export class GlobalAstNodeDescription extends DataModelScopedAstNodeDescription {
   constructor(dataModelId: string, name: string, delegate: AstNodeDescription) {
      super(dataModelId, name, delegate);
   }
}

export function isGlobalDescriptionForDataModel(description: AstNodeDescription, dataModelId?: string): boolean {
   return dataModelId !== undefined && description instanceof GlobalAstNodeDescription && description.dataModelId === dataModelId;
}

export function getLocalName(description: AstNodeDescription): string {
   return description instanceof GlobalAstNodeDescription ? (getLocalName(description.delegate) ?? description.name) : description.name;
}

/**
 * A scope computer that performs the following customizations:
 * - Avoid exporting any nodes from diagrams, they are self-contained and do not need to be externally accessible.
 * - Store the datamodel id for each node so we can do faster dependency calculation.
 * - Export nodes twice: Once for external usage with the fully-qualified name and once for datamodel-local usage.
 */
export class CrossModelScopeComputation extends DefaultScopeComputation {
   protected idProvider: DefaultIdProvider;
   protected dataModelManager: CrossModelDataModelManager;

   constructor(services: CrossModelServices) {
      super(services);
      this.idProvider = services.references.IdProvider;
      this.dataModelManager = services.shared.workspace.DataModelManager;
   }

   // overridden because we use 'streamAllContents' as children retrieval instead of 'streamContents'
   override async computeExportsForNode(
      parentNode: AstNode,
      document: LangiumDocument<AstNode>,
      children: (root: AstNode) => Iterable<AstNode> = AstUtils.streamAllContents,
      cancelToken: CancellationToken = CancellationToken.None
   ): Promise<AstNodeDescription[]> {
      return super.computeExportsForNode(parentNode, document, children, cancelToken);
   }

   protected override exportNode(node: AstNode, exports: AstNodeDescription[], document: LangiumDocument<AstNode>): void {
      const dataModelInfo = this.dataModelManager.getDataModelInfoByDocument(document);
      const dataModelId = dataModelInfo?.id ?? UNKNOWN_DATAMODEL_ID;
      const dataModelReference = dataModelInfo?.referenceName ?? UNKNOWN_DATAMODEL_REFERENCE;

      // Export nodes twice: Once for external usage with the fully-qualified name and once for datamodel-local usage.
      // To avoid duplicates in the UI but still allow access to the node through both names we filter the
      // external usage descriptions in the CrossModelCompletionProvider if datamodel-local usage is also available

      let description: AstNodeDescription | undefined;
      const localId = this.idProvider.getLocalId(node);
      if (localId) {
         description = this.descriptions.createDescription(node, localId, document);
         exports.push(new LocalAstNodeDescription(dataModelId, localId, description));
      }

      const globalId = this.idProvider.getGlobalId(node, dataModelReference);
      if (globalId && description) {
         exports.push(new GlobalAstNodeDescription(dataModelId, globalId, description));
      }
   }

   protected override processNode(node: AstNode, document: LangiumDocument, scopes: PrecomputedScopes): void {
      const container = node.$container;
      if (container) {
         const id = this.idProvider.getNodeId(node);
         if (id) {
            scopes.add(container, this.descriptions.createDescription(node, id, document));
            if (isLogicalEntityNode(node)) {
               this.processEntityNode(node, id, document).forEach(description => scopes.add(container, description));
            } else if (isSourceObject(node)) {
               this.processSourceObject(node, id, document).forEach(description => scopes.add(container, description));
            }
         }
         if (isTargetObject(node)) {
            const entity = this.getLogicalEntity(node, document);
            if (entity?.id) {
               this.processTargetObject(node, entity.id, document).forEach(description => scopes.add(container, description));
            }
         }
      }
   }

   protected processEntityNode(node: LogicalEntityNode, nodeId: string, document: LangiumDocument): AstNodeDescription[] {
      const entity = this.getLogicalEntity(node, document);
      if (!entity) {
         return [];
      }
      const attributes =
         entity.attributes.map<LogicalEntityNodeAttribute>(attribute =>
            setOwner({ ...attribute, $type: LogicalEntityNodeAttribute }, node)
         ) ?? [];
      setAttributes(node, attributes);
      return attributes
         .filter(attribute => attribute.id !== undefined) // Only process attributes with an id
         .map(attribute => this.descriptions.createDescription(attribute, combineIds(nodeId, attribute.id!), document));
   }

   protected getLogicalEntity(node: AstNode & { entity?: Reference<LogicalEntity> }, document: LangiumDocument): LogicalEntity | undefined {
      try {
         return fixDocument(node, document).entity?.ref;
      } catch (error) {
         console.error(error);
         return undefined;
      }
   }

   protected processSourceObject(node: SourceObject, nodeId: string, document: LangiumDocument): AstNodeDescription[] {
      const entity = this.getLogicalEntity(node, document);
      if (!entity) {
         return [];
      }
      const attributes =
         entity.attributes.map<SourceObjectAttribute>(attribute => setOwner({ ...attribute, $type: SourceObjectAttribute }, node)) ?? [];
      setAttributes(node, attributes);
      return attributes
         .filter(attribute => attribute.id !== undefined) // Ensure attribute.id is defined
         .map(attribute => this.descriptions.createDescription(attribute, combineIds(nodeId, attribute.id!), document));
   }

   protected processTargetObject(node: TargetObject, nodeId: string, document: LangiumDocument): AstNodeDescription[] {
      const entity = this.getLogicalEntity(node, document);
      if (!entity) {
         return [];
      }
      const attributes =
         entity.attributes.map<TargetObjectAttribute>(attribute => setOwner({ ...attribute, $type: TargetObjectAttribute }, node)) ?? [];
      setImplicitId(node, nodeId);
      setAttributes(node, attributes);
      // for target attributes, we use simple names and not object-qualified ones
      return attributes.map(attribute => this.descriptions.createDescription(attribute, attribute.id, document));
   }
}
