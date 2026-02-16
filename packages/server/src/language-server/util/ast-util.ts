/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { AttributeMappingSourceType, TypeGuard, toIdReference } from '@crossmodel/protocol';
import { AstNode, AstNodeDescription, AstUtils, LangiumDocument, isAstNode, isAstNodeDescription } from 'langium';
import {
   AttributeMapping,
   AttributeMappingSource,
   AttributeMappingTarget,
   CrossModelRoot,
   DataModel,
   LogicalEntity,
   Mapping,
   Relationship,
   SourceObject,
   SystemDiagram,
   TargetObject,
   isCrossModelRoot,
   isDataModel,
   isLogicalEntity,
   isMapping,
   isRelationship,
   isSystemDiagram
} from '../ast.js';
import { IdProvider } from '../cross-model-naming.js';
import { getLocalName } from '../cross-model-scope.js';

export function createSourceObject(entity: LogicalEntity | AstNodeDescription, container: Mapping, idProvider: IdProvider): SourceObject {
   const entityId = isAstNodeDescription(entity)
      ? getLocalName(entity)
      : (entity.id ?? idProvider.getLocalId(entity) ?? entity.name ?? 'unknown');
   const ref = isAstNodeDescription(entity) ? undefined : entity;
   const $refText = isAstNodeDescription(entity) ? entity.name : idProvider.getGlobalId(entity) || entity.id || '';

   const hasFromJoin = container.sources.some(source => source.join === 'from');
   const joinType = hasFromJoin ? 'left-join' : 'from';
   return {
      $type: SourceObject.$type,
      $container: container,
      _attributes: [],
      id: idProvider.findNextInternalId(SourceObject.$type, entityId + 'SourceObject', container),
      entity: { $refText, ref },
      join: joinType,
      dependencies: [],
      conditions: [],
      customProperties: []
   };
}

export function createAttributeMapping(container: TargetObject, source: string | undefined, targetId: string): AttributeMapping {
   const mapping = {
      $type: AttributeMapping.$type,
      $container: container
   } as AttributeMapping;
   mapping.sources = source ? [createAttributeMappingSource(mapping, source)] : [];
   mapping.attribute = createAttributeMappingTarget(mapping, targetId);
   return mapping;
}

export function createAttributeMappingSource(container: AttributeMapping, sourceId: string): AttributeMappingSource {
   return {
      $container: container,
      $type: AttributeMappingSourceType,
      value: { $refText: toIdReference(sourceId), ref: undefined }
   };
}

export function createAttributeMappingTarget(container: AttributeMapping, targetId: string): AttributeMappingTarget {
   return {
      $container: container,
      $type: AttributeMappingTarget.$type,
      value: { $refText: toIdReference(targetId), ref: undefined }
   };
}

/**
 * Retrieve the document in which the given AST node is contained. A reference to the document is
 * usually held by the root node of the AST.
 */
export function findDocument<T extends AstNode = CrossModelRoot>(node?: AstNode): LangiumDocument<T> | undefined {
   if (!node) {
      return undefined;
   }
   const rootNode = findDocumentRoot(node);
   const result = rootNode.$document;
   return result ? <LangiumDocument<T>>result : undefined;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function fixDocument<T extends AstNode = AstNode, R extends AstNode = AstNode>(
   node: undefined,
   document: LangiumDocument<R> | undefined
): undefined;
export function fixDocument<T extends AstNode = AstNode, R extends AstNode = AstNode>(node: T, document: LangiumDocument<R> | undefined): T;
export function fixDocument<T extends AstNode = AstNode, R extends AstNode = AstNode>(
   node: T | undefined,
   document: LangiumDocument<R> | undefined
): T | undefined;
export function fixDocument<T extends AstNode = AstNode, R extends AstNode = AstNode>(
   node: T | undefined,
   document: LangiumDocument<R> | undefined
): T | undefined {
   if (!node || !document) {
      return node;
   }
   const rootNode = AstUtils.findRootNode(node);
   if (!rootNode.$document) {
      console.warn('Fixing AST node without document reference. This should only happen for test data or in very specific edge cases.');
      (rootNode as any).$document = document;
   }
   return node;
}

export type SemanticRoot = DataModel | LogicalEntity | Mapping | Relationship | SystemDiagram;
export type WithDocument<T> = T & { $document: LangiumDocument<CrossModelRoot> };
export type DocumentContent = LangiumDocument | AstNode;

export function findDocumentRoot(node: AstNode): CrossModelRoot;
export function findDocumentRoot(node?: AstNode): CrossModelRoot | undefined;
export function findDocumentRoot(node?: AstNode): CrossModelRoot | undefined {
   if (!node) {
      return undefined;
   }
   const rootNode = AstUtils.findRootNode(node);
   return isCrossModelRoot(rootNode) ? rootNode : undefined;
}

export function isSemanticRoot(element?: unknown): element is SemanticRoot {
   if (!element) {
      return false;
   }
   return isDataModel(element) || isLogicalEntity(element) || isMapping(element) || isRelationship(element) || isSystemDiagram(element);
}

export function findSemanticRoot(input?: DocumentContent): SemanticRoot | undefined;
export function findSemanticRoot<T extends SemanticRoot>(input: DocumentContent | undefined, guard: TypeGuard<T>): T | undefined;
export function findSemanticRoot<T extends SemanticRoot>(input: DocumentContent, guard: TypeGuard<T>): T | undefined;
export function findSemanticRoot<T extends SemanticRoot>(input?: DocumentContent, guard?: TypeGuard<T>): SemanticRoot | T | undefined {
   if (!input) {
      return undefined;
   }
   const root = isAstNode(input) ? findDocumentRoot(input) : (input?.parseResult?.value as CrossModelRoot);
   const semanticRoot = root?.datamodel || root?.entity || root?.mapping || root?.relationship || root?.systemDiagram;
   return guard ? (guard(semanticRoot) ? semanticRoot : undefined) : semanticRoot;
}

export function findDataModel(input: DocumentContent): DataModel | undefined {
   return findSemanticRoot(input, isDataModel);
}

export function hasSemanticRoot<T extends SemanticRoot>(document: LangiumDocument<any>, guard: (item: unknown) => item is T): boolean {
   return guard(findSemanticRoot(document));
}
