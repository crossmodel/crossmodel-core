/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { AttributeMappingSourceType, TypeGuard, getSemanticRoot, toIdReference } from '@crossmodel/protocol';
import { Dimension, Point } from '@eclipse-glsp/server';
import { AstNode, AstNodeDescription, AstUtils, LangiumDocument, Reference, isAstNode, isAstNodeDescription } from 'langium';
import { ID_PROPERTY, IdProvider } from '../cross-model-naming.js';
import { getLocalName } from '../cross-model-scope.js';
import {
   AttributeMapping,
   AttributeMappingSource,
   AttributeMappingTarget,
   CrossModelRoot,
   DataModel,
   LogicalAttribute,
   LogicalEntity,
   LogicalEntityNode,
   LogicalEntityNodeAttribute,
   Mapping,
   Relationship,
   RelationshipEdge,
   SourceObject,
   SourceObjectAttribute,
   SystemDiagram,
   TargetObject,
   TargetObjectAttribute,
   isCrossModelRoot,
   isDataModel,
   isLogicalEntity,
   isMapping,
   isRelationship,
   isSystemDiagram
} from '../generated/ast.js';

export type RootContainer = {
   [Key in keyof CrossModelRoot as '$container' extends Key
      ? never
      : CrossModelRoot[Key] extends AstNode | undefined
        ? Key
        : never]-?: CrossModelRoot[Key];
};

export type SemanticRoot = RootContainer[keyof RootContainer];

export const IMPLICIT_ATTRIBUTES_PROPERTY = '$attributes';
export const IMPLICIT_OWNER_PROPERTY = '$owner';
export const IMPLICIT_ID_PROPERTY = '$id';

export function getAttributes(node: LogicalEntityNode): LogicalEntityNodeAttribute[];
export function getAttributes(node: SourceObject): SourceObjectAttribute[];
export function getAttributes(node: TargetObject): TargetObjectAttribute[];
export function getAttributes<T>(node: any): T[] {
   return (node[IMPLICIT_ATTRIBUTES_PROPERTY] as T[]) ?? [];
}

export function setAttributes(node: LogicalEntityNode, attributes: LogicalEntityNodeAttribute[]): void;
export function setAttributes(node: SourceObject, attributes: SourceObjectAttribute[]): void;
export function setAttributes(node: TargetObject, attributes: TargetObjectAttribute[]): void;
export function setAttributes(node: object, attributes: LogicalAttribute[]): void {
   (node as any)[IMPLICIT_ATTRIBUTES_PROPERTY] = attributes;
}

export function getOwner(node: LogicalEntityNodeAttribute): LogicalEntityNode;
export function getOwner(node: SourceObjectAttribute): SourceObject;
export function getOwner(node: TargetObjectAttribute): TargetObject;
export function getOwner(node?: AstNode): AstNode | undefined;
export function getOwner<T>(node: any): T | undefined {
   return node?.[IMPLICIT_OWNER_PROPERTY] as T;
}

export function setOwner(attribute: LogicalEntityNodeAttribute, owner: LogicalEntityNode): LogicalEntityNodeAttribute;
export function setOwner(attribute: SourceObjectAttribute, owner: SourceObject): SourceObjectAttribute;
export function setOwner(attribute: TargetObjectAttribute, owner: TargetObject): TargetObjectAttribute;
export function setOwner<T>(attribute: T, owner: object): T {
   (attribute as any)[IMPLICIT_OWNER_PROPERTY] = owner;
   return attribute;
}

export function setImplicitId(node: any, id: string): void {
   node[ID_PROPERTY] = id;
   node[IMPLICIT_ID_PROPERTY] = true;
}

export function removeImplicitProperties(node: any): void {
   delete node[IMPLICIT_ATTRIBUTES_PROPERTY];
   delete node[IMPLICIT_OWNER_PROPERTY];
   if (node[IMPLICIT_ID_PROPERTY] === true) {
      delete node[ID_PROPERTY];
      delete node[IMPLICIT_ID_PROPERTY];
   }
}

export function isImplicitProperty(prop: string, obj: any): boolean {
   return (
      prop === IMPLICIT_ATTRIBUTES_PROPERTY ||
      prop === IMPLICIT_OWNER_PROPERTY ||
      prop === IMPLICIT_ID_PROPERTY ||
      (obj[IMPLICIT_ID_PROPERTY] === true && prop === ID_PROPERTY)
   );
}

export function createLogicalEntity(
   container: CrossModelRoot,
   id: string,
   name: string,
   opts?: Partial<Omit<LogicalEntity, '$container' | '$type' | 'id' | 'name'>>
): LogicalEntity {
   return {
      $container: container,
      $type: 'LogicalEntity',
      id,
      name,
      attributes: [],
      identifiers: [],
      customProperties: [],
      superEntities: [],
      ...opts
   };
}

export function createLogicalAttribute(
   container: LogicalEntity,
   id: string,
   name: string,
   opts?: Partial<Omit<LogicalAttribute, '$container' | '$type' | 'id' | 'name'>>
): LogicalAttribute {
   return {
      $container: container,
      $type: 'LogicalAttribute',
      id,
      name,
      identifier: false,
      customProperties: [],
      ...opts
   };
}

export function createRelationship(
   container: CrossModelRoot,
   id: string,
   name: string,
   parent: Reference<LogicalEntity>,
   child: Reference<LogicalEntity>,
   opts?: Partial<Omit<Relationship, '$container' | '$type' | 'id' | 'name' | 'parent' | 'child'>>
): Relationship {
   return {
      $container: container,
      $type: 'Relationship',
      id,
      name,
      parent,
      child,
      attributes: [],
      customProperties: [],
      ...opts
   };
}

export function createSystemDiagram(
   container: CrossModelRoot,
   id: string,
   opts?: Partial<Omit<SystemDiagram, '$container' | '$type' | 'id'>>
): SystemDiagram {
   return {
      $container: container,
      $type: 'SystemDiagram',
      id,
      nodes: [],
      edges: [],
      ...opts
   };
}

export function createEntityNode(
   container: SystemDiagram,
   id: string,
   entity: Reference<LogicalEntity>,
   position: Point,
   dimension: Dimension,
   opts?: Partial<Omit<LogicalEntityNode, '$container' | '$type' | 'id' | 'entity'>>
): LogicalEntityNode {
   return {
      $container: container,
      $type: 'LogicalEntityNode',
      id,
      entity,
      ...position,
      ...dimension,
      ...opts
   };
}

export function createRelationshipEdge(
   container: SystemDiagram,
   id: string,
   relationship: Reference<Relationship>,
   sourceNode: Reference<LogicalEntityNode>,
   targetNode: Reference<LogicalEntityNode>,
   opts?: Partial<Omit<RelationshipEdge, '$container' | '$type' | 'id' | 'relationship' | 'sourceNode' | 'targetNode'>>
): RelationshipEdge {
   return {
      $container: container,
      $type: 'RelationshipEdge',
      id,
      relationship,
      sourceNode,
      targetNode,
      ...opts
   };
}

export function createSourceObject(entity: LogicalEntity | AstNodeDescription, container: Mapping, idProvider: IdProvider): SourceObject {
   const entityId = isAstNodeDescription(entity)
      ? getLocalName(entity)
      : (entity.id ?? idProvider.getLocalId(entity) ?? entity.name ?? 'unknown');
   const ref = isAstNodeDescription(entity) ? undefined : entity;
   const $refText = isAstNodeDescription(entity) ? entity.name : idProvider.getGlobalId(entity) || entity.id || '';
   return {
      $type: SourceObject,
      $container: container,
      id: idProvider.findNextId(SourceObject, entityId + 'SourceObject', container),
      entity: { $refText, ref },
      join: 'from',
      dependencies: [],
      conditions: [],
      customProperties: []
   };
}

export function createAttributeMapping(container: TargetObject, source: string | undefined, targetId: string): AttributeMapping {
   const mapping = {
      $type: AttributeMapping,
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
      value: { $refText: toIdReference(sourceId) }
   };
}

export function createAttributeMappingTarget(container: AttributeMapping, targetId: string): AttributeMappingTarget {
   return {
      $container: container,
      $type: AttributeMappingTarget,
      value: { $refText: toIdReference(targetId) }
   };
}

/**
 * Retrieve the document in which the given AST node is contained. A reference to the document is
 * usually held by the root node of the AST.
 */
export function findDocument<T extends AstNode = AstNode>(node?: AstNode): LangiumDocument<T> | undefined {
   if (!node) {
      return undefined;
   }
   const rootNode = AstUtils.findRootNode(node);
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
      (rootNode as any).$document = document;
   }
   return node;
}

export type WithDocument<T> = T & { $document: LangiumDocument<CrossModelRoot> };
export type DocumentContent = LangiumDocument | AstNode;

export function isSemanticRoot(element: unknown): element is SemanticRoot {
   return isLogicalEntity(element) || isMapping(element) || isRelationship(element) || isSystemDiagram(element);
}

export function findSemanticRoot(input: DocumentContent): SemanticRoot | undefined;
export function findSemanticRoot<T extends SemanticRoot>(input: DocumentContent, guard: TypeGuard<T>): T | undefined;
export function findSemanticRoot<T extends SemanticRoot>(input: DocumentContent, guard?: TypeGuard<T>): SemanticRoot | T | undefined {
   const root = isAstNode(input) ? (input.$document?.parseResult?.value ?? AstUtils.findRootNode(input)) : input.parseResult?.value;
   if (!isCrossModelRoot(root)) {
      return undefined;
   }
   return getSemanticRoot(root);
}

export function findEntity(input: DocumentContent): LogicalEntity | undefined {
   return findSemanticRoot(input, isLogicalEntity);
}

export function findRelationship(input: DocumentContent): Relationship | undefined {
   return findSemanticRoot(input, isRelationship);
}

export function findSystemDiagram(input: DocumentContent): SystemDiagram | undefined {
   return findSemanticRoot(input, isSystemDiagram);
}

export function findMapping(input: DocumentContent): Mapping | undefined {
   return findSemanticRoot(input, isMapping);
}

export function findDataModel(input: DocumentContent): DataModel | undefined {
   return findSemanticRoot(input, isDataModel);
}

export function hasSemanticRoot<T extends SemanticRoot>(document: LangiumDocument<any>, guard: (item: unknown) => item is T): boolean {
   return guard(findSemanticRoot(document));
}
