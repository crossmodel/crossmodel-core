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
   CustomProperty,
   DataModel,
   LogicalAttribute,
   LogicalEntity,
   LogicalEntityNode,
   LogicalEntityNodeAttribute,
   Mapping,
   ObjectDefinition,
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
   isObjectDefinition,
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
      $type: LogicalEntity.$type,
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
      $type: LogicalAttribute.$type,
      id,
      name,
      customProperties: [],
      mandatory: false,
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
      $type: Relationship.$type,
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
      $type: SystemDiagram.$type,
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
      $type: LogicalEntityNode.$type,
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
      $type: RelationshipEdge.$type,
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

   const hasFromJoin = container.sources.some(source => source.join === 'from');
   const joinType = hasFromJoin ? 'left-join' : 'from';
   return {
      $type: SourceObject.$type,
      $container: container,
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
   return isLogicalEntity(element) || isMapping(element) || isRelationship(element) || isSystemDiagram(element) || isObjectDefinition(element);
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

export function findObjectDefinition(input: DocumentContent): ObjectDefinition | undefined {
   return findSemanticRoot(input, isObjectDefinition);
}

export function hasSemanticRoot<T extends SemanticRoot>(document: LangiumDocument<any>, guard: (item: unknown) => item is T): boolean {
   return guard(findSemanticRoot(document));
}

/**
 * A resolved custom property tagged with its source ObjectDefinition.
 */
export interface ResolvedPropertyDefinition {
   definition: CustomProperty;
   sourceDefinitionId: string;
   inherited: boolean;
   /** When a child overrides a parent's property (same ID), this holds the ancestor's definition for metadata fallback. */
   baseDefinition?: CustomProperty;
}

/**
 * Collects all custom properties from an ObjectDefinition and its
 * extends chain, from root ancestor down to the given definition.
 * Each entry is tagged with the source definition ID and whether it is inherited.
 * Uses a visited set to prevent infinite loops from circular extends chains.
 *
 * When a child definition declares a custom property with the same ID as one
 * from an ancestor, the child's entry replaces the ancestor's (most-specific wins).
 */
export function resolveAllPropertyDefinitions(
   objectDef: ObjectDefinition,
   visited?: Set<string>
): ResolvedPropertyDefinition[] {
   const _visited = visited ?? new Set<string>();
   const defId = objectDef.id ?? objectDef.name ?? '';
   if (_visited.has(defId)) {
      return [];
   }
   _visited.add(defId);

   // Collect all properties in order: root ancestor → leaf definition.
   // We use a Map keyed by property ID to deduplicate: later entries (more specific) override earlier ones.
   const propsById = new Map<string, ResolvedPropertyDefinition>();
   // Track insertion order separately so the final array preserves the order
   // in which each property ID was first introduced.
   const insertionOrder: string[] = [];

   // Recursively collect parent definitions first
   const parentDef = objectDef.extends?.ref;
   if (parentDef) {
      const parentProps = resolveAllPropertyDefinitions(parentDef, _visited);
      for (const prop of parentProps) {
         const propId = prop.definition.id ?? prop.definition.name ?? '';
         if (propId) {
            if (!propsById.has(propId)) {
               insertionOrder.push(propId);
            }
            propsById.set(propId, prop);
         }
      }
   }

   // Add this definition's own custom properties (override any parent with the same ID)
   for (const propDef of objectDef.customProperties) {
      const propId = propDef.id ?? propDef.name ?? '';
      const existing = propsById.get(propId);
      if (!existing) {
         insertionOrder.push(propId);
      }
      propsById.set(propId, {
         definition: propDef,
         sourceDefinitionId: defId,
         inherited: false,
         // Preserve the ancestor's definition for metadata fallback (name, description, etc.)
         baseDefinition: existing?.baseDefinition ?? existing?.definition
      });
   }

   // Build result in insertion order
   const result = insertionOrder
      .map(id => propsById.get(id))
      .filter((p): p is ResolvedPropertyDefinition => p !== undefined);

   // Mark all properties from ancestors as inherited relative to the original caller
   // Only the properties directly from objectDef are not inherited
   if (!visited) {
      for (const prop of result) {
         if (prop.sourceDefinitionId !== defId) {
            prop.inherited = true;
         }
      }
   }

   return result;
}
