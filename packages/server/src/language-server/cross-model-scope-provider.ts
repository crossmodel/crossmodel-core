/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import {
   CrossReference,
   CrossReferenceContainer,
   CrossReferenceContext,
   isGlobalElementReference,
   isRootElementReference,
   isSyntheticDocument,
   ReferenceableElement
} from '@crossmodel/protocol';
import {
   AstNode,
   AstNodeDescription,
   AstUtils,
   DefaultScopeProvider,
   EMPTY_SCOPE,
   LangiumDocument,
   MapScope,
   ReferenceInfo,
   Scope,
   stream,
   Stream,
   StreamScope,
   URI
} from 'langium';
import { CrossModelServices } from './cross-model-module.js';
import { QUALIFIED_ID_SEPARATOR } from './cross-model-naming.js';
import { DataModelScopedAstNodeDescription, GlobalAstNodeDescription, isGlobalDescriptionForDataModel } from './cross-model-scope.js';
import {
   DataModelDependency,
   isAttributeMapping,
   isDataModelDependency,
   isRelationshipAttribute,
   isSourceObject,
   isSourceObjectAttributeReference,
   isSourceObjectDependency
} from './generated/ast.js';
import { findDocument, fixDocument } from './util/ast-util.js';

/**
 * A custom scope provider that considers the dependencies between packages to indicate which elements form the global scope
 * are actually available from a certain document.
 */
export class PackageScopeProvider extends DefaultScopeProvider {
   constructor(
      protected services: CrossModelServices,
      protected dataModelManager = services.shared.workspace.DataModelManager,
      protected idProvider = services.references.IdProvider
   ) {
      super(services);
   }

   /**
    * Returns the package identifier for the given description.
    *
    * @param description node description
    * @returns package identifier
    */
   protected getDataModelId(description: AstNodeDescription): string {
      return description instanceof DataModelScopedAstNodeDescription
         ? description.dataModelId
         : this.dataModelManager.getDataModelIdByUri(description.documentUri);
   }

   protected override getGlobalScope(referenceType: string, context: ReferenceInfo): Scope {
      if (isAttributeMapping(context.container)) {
         // target attribute mappings should only access the local scope
         return EMPTY_SCOPE;
      }

      // the global scope contains all elements known to the language server
      const globalScope = this.getDefaultGlobalScope(referenceType, context);

      // if we are referencing from a datamodel, all elements are visible
      if (context.container.$type === DataModelDependency) {
         return globalScope;
      }

      // see from which package this request is coming from based on the given context
      const source = AstUtils.getDocument(context.container);
      const sourceDataModel = this.dataModelManager.getDataModelIdByUri(source.uri);

      // dependencyScope: hide those elements from the global scope that are not visible from the requesting package
      const dependencyScope = new StreamScope(
         globalScope
            .getAllElements()
            .filter(
               description =>
                  description instanceof GlobalAstNodeDescription &&
                  this.dataModelManager.isVisible(sourceDataModel, this.getDataModelId(description))
            )
      );

      // create a package-local scope that is considered first with the dependency scope being considered second
      // i.e., we build a hierarchy of scopes
      const packageScope = new StreamScope(
         globalScope.getAllElements().filter(description => sourceDataModel === this.getDataModelId(description)),
         dependencyScope
      );

      return packageScope;
   }

   protected getDefaultGlobalScope(referenceType: string, _context: ReferenceInfo): Scope {
      return this.globalScopeCache.get(referenceType, () => new GlobalScope(this.indexManager.allElements(referenceType).toArray()));
   }
}

export class GlobalScope extends MapScope {
   readonly allElements: Stream<AstNodeDescription>;

   constructor(elements: AstNodeDescription[]) {
      super(elements);
      this.allElements = stream(elements);
   }

   override getAllElements(): Stream<AstNodeDescription> {
      // ensure we return all elements even if they share the same name in different packages
      return this.allElements;
   }
}

export class CrossModelScopeProvider extends PackageScopeProvider {
   protected resolveCrossReferenceContainer(container: CrossReferenceContainer): AstNode | undefined {
      if (isSyntheticDocument(container)) {
         const document = this.services.shared.workspace.LangiumDocuments.createEmptyDocument(URI.parse(container.uri));
         return { $type: container.type, $container: document.parseResult.value };
      }
      if (isRootElementReference(container)) {
         return this.services.shared.workspace.IndexManager.resolveSemanticElement(URI.parse(container.uri));
      }
      if (isGlobalElementReference(container)) {
         return this.services.shared.workspace.IndexManager.resolveElementById(container.globalId, container.type);
      }
      return undefined;
   }

   referenceContextToInfo(ctx: CrossReferenceContext): ReferenceInfo {
      let container = this.resolveCrossReferenceContainer(ctx.container);
      if (!container) {
         throw Error('Invalid CrossReference Container');
      }
      for (const segment of ctx.syntheticElements ?? []) {
         container = {
            ...segment,
            $container: container,
            $containerProperty: segment.property,
            $type: segment.type
         };
      }
      const referenceInfo: ReferenceInfo = {
         reference: { $refText: '' },
         container: container,
         property: ctx.property
      };
      return referenceInfo;
   }

   resolveCrossReference(reference: CrossReference): AstNode | undefined {
      const description = this.getScope(this.referenceContextToInfo(reference))
         .getAllElements()
         .find(desc => desc.name === reference.value);
      return this.services.shared.workspace.IndexManager.resolveElement(description);
   }

   override getScope(context: ReferenceInfo): Scope {
      try {
         return super.getScope(this.fixContext(context));
      } catch (error) {
         return EMPTY_SCOPE;
      }
   }

   protected fixContext(context: ReferenceInfo): ReferenceInfo {
      // for some reason the document is not always properly set on the container node
      const cstNode = context.container.$cstNode ?? context.reference.$refNode;
      fixDocument(context.container, findDocument(cstNode?.astNode));
      return context;
   }

   getCompletionScope(ctx: CrossReferenceContext | ReferenceInfo): CompletionScope {
      const referenceInfo = 'reference' in ctx ? ctx : this.referenceContextToInfo(ctx);
      const document = AstUtils.getDocument(referenceInfo.container);
      const dataModelId = this.dataModelManager.getDataModelIdByDocument(document);
      const filteredDescriptions = this.getScope(referenceInfo)
         .getAllElements()
         .filter(description => this.filterCompletion(description, document, dataModelId, referenceInfo.container, referenceInfo.property))
         .distinct(description => description.name)
         .toArray()
         .sort((left, right) => this.sortText(left).localeCompare(this.sortText(right)));
      const elementScope = this.createScope(filteredDescriptions);
      return { elementScope, source: referenceInfo };
   }

   sortText(description: AstNodeDescription): string {
      // prefix with number of segments in the qualified name to ensure that local names are sorted first
      return description.name.split(QUALIFIED_ID_SEPARATOR).length + '_' + description.name;
   }

   complete(ctx: CrossReferenceContext): ReferenceableElement[] {
      return this.getCompletionScope(ctx)
         .elementScope.getAllElements()
         .map<ReferenceableElement>(description => ({
            uri: description.documentUri.toString(),
            type: description.type,
            label: description.name
         }))
         .toArray();
   }

   filterCompletion(
      description: AstNodeDescription,
      document: LangiumDocument<AstNode>,
      dataModelId: string,
      container?: AstNode,
      property?: string
   ): boolean {
      if (isRelationshipAttribute(container)) {
         // only show relevant attributes depending on the parent or child context
         if (property === 'child') {
            return description.name.startsWith(container.$container.child?.$refText + '.');
         }
         if (property === 'parent') {
            return description.name.startsWith(container.$container.parent?.$refText + '.');
         }
      }
      if (
         isSourceObject(container) &&
         property === 'entity' &&
         container.$container.target.entity &&
         container.$container.target.entity.ref
      ) {
         const targetEntity = container.$container.target.entity.ref;
         if (description instanceof GlobalAstNodeDescription) {
            return description.name !== this.idProvider.getGlobalId(targetEntity);
         }
         return description.name !== this.idProvider.getLocalId(targetEntity);
      }
      if (isSourceObjectDependency(container) || (isSourceObject(container) && property === 'dependencies')) {
         const sourceObject = isSourceObjectDependency(container) ? container.$container : container;
         return (
            !(description instanceof GlobalAstNodeDescription) &&
            !(description instanceof DataModelScopedAstNodeDescription) &&
            !(description.name === sourceObject.id) &&
            description.documentUri.toString() === document.uri.toString()
         );
      }
      if (isSourceObjectAttributeReference(container)) {
         // we are in a join condition of a source object, only show our own and our dependent source object references
         const sourceObject = container.$container.$container.$container;
         const dependencies = sourceObject.dependencies ?? [];
         const allowedOwners = [sourceObject.id, ...dependencies.map(dependency => dependency.source.$refText)];
         return !!allowedOwners.find(allowedOwner => description.name.startsWith(allowedOwner + '.'));
      }
      if (isDataModelDependency(container)) {
         // filter ourselves out as we do not want to depend on ourselves
         const ourselves = container.$container;
         return !isGlobalDescriptionForDataModel(description, dataModelId) && ourselves.id !== description.name;
      }
      return !isGlobalDescriptionForDataModel(description, dataModelId);
   }
}

export interface CompletionScope {
   source: ReferenceInfo;
   elementScope: Scope;
}
