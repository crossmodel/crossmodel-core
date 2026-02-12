/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { AstNode, AstNodeDescription, AstUtils, DefaultScopeComputation, LangiumDocument, MultiMap } from 'langium';
import { CrossModelDataModelManager, UNKNOWN_DATAMODEL_ID, UNKNOWN_DATAMODEL_REFERENCE } from './cross-model-datamodel-manager.js';
import { CrossModelServices } from './cross-model-module.js';
import { DefaultIdProvider } from './cross-model-naming.js';

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

   constructor(protected services: CrossModelServices) {
      super(services);
      this.idProvider = services.references.IdProvider;
      this.dataModelManager = services.shared.workspace.DataModelManager;
   }

   /**
    * Override to export all nested nodes (like LogicalEntityAttribute within LogicalEntity)
    * so they can be referenced from other documents using qualified names.
    */
   override async collectExportedSymbols(document: LangiumDocument): Promise<AstNodeDescription[]> {
      return this.collectExportedSymbolsForNode(document.parseResult.value, document, AstUtils.streamAllContents);
   }

   protected override addExportedSymbol(node: AstNode, exports: AstNodeDescription[], document: LangiumDocument): void {
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

   protected override addLocalSymbol(node: AstNode, document: LangiumDocument, symbols: MultiMap<AstNode, AstNodeDescription>): void {
      super.addLocalSymbol(node, document, symbols);

      const container = node.$container;
      if (container) {
         const id = this.idProvider.getNodeId(node);
         if (id) {
            symbols.add(container, this.descriptions.createDescription(node, id, document));
         }

         // we extend the ast node here as we are already iterating over the complete document and we have access to the local symbols
         this.services.shared.ast.AstExtensionService.extendLocalAstNode(node, id, document).forEach(description =>
            symbols.add(container, description)
         );
      }
   }
}
