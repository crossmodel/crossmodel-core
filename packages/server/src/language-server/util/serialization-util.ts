/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { isReference } from 'langium';
import {
   AttributeMapping,
   AttributeMappingExpression,
   AttributeMappingSource,
   AttributeMappingTarget,
   CustomProperty,
   DataModel,
   DataModelDependency,
   IdentifiedObject,
   InheritanceEdge,
   JoinCondition,
   LogicalAttribute,
   LogicalEntity,
   LogicalEntityNode,
   LogicalIdentifier,
   Mapping,
   NamedObject,
   Relationship,
   RelationshipAttribute,
   RelationshipEdge,
   SourceObject,
   SourceObjectAttribute,
   SourceObjectDependency,
   SystemDiagram,
   TargetObject,
   TargetObjectAttribute,
   WithCustomProperties,
   reflection
} from '../generated/ast.js';

/**
 * Map of property names to their corresponding keywords in the serialized output.
 * Required because the grammar uses different keywords than the AST property names (e.g., 'inherits' vs 'superEntities').
 */
const PROPERTY_KEYWORDS = new Map<string, string>([[LogicalEntity.superEntities, 'inherits']]);

/**
 * Get the keyword for a property, or the property name itself if no keyword mapping exists.
 */
export function getPropertyKeyword(property: string): string {
   return PROPERTY_KEYWORDS.get(property) ?? property;
}

/**
 * Properties whose values should not be quoted during serialization.
 * Required for enum-like values (cardinalities, join types, data model types) and version strings.
 */
const UNQUOTED_PROPERTIES = new Set<string>([
   `${Relationship.$type}.${Relationship.parentCardinality}`,
   `${Relationship.$type}.${Relationship.childCardinality}`,
   `${SourceObject.$type}.${SourceObject.join}`,
   `${DataModel.$type}.${DataModel.type}`,
   `${DataModel.$type}.${DataModel.version}`,
   `${DataModelDependency.$type}.${DataModelDependency.version}`
]);

/**
 * Check if a property should be serialized without quotes.
 */
export function isUnquotedProperty(type: string, property: string): boolean {
   return UNQUOTED_PROPERTIES.has(`${type}.${property}`);
}

/**
 * Check if a property value equals its default value (and should be skipped during serialization).
 * Uses Langium's reflection API to get default values from the generated AST metadata.
 */
export function isDefaultValue(type: string, property: string, value: unknown): boolean {
   const typeMetaData = reflection.getTypeMetaData(type);
   const propertyMetaData = typeMetaData.properties[property];
   const defaultValue = propertyMetaData?.defaultValue;
   return defaultValue !== undefined && value === defaultValue;
}

/**
 * Types that are serialized inline (on the same line) rather than as nested YAML objects.
 * These are simple wrapper types that don't need their own indented block structure.
 */
const INLINE_SERIALIZED_TYPES = new Set<string>([
   AttributeMappingSource.$type,
   AttributeMappingTarget.$type,
   SourceObjectDependency.$type,
   JoinCondition.$type
]);

/**
 * Check if a type should be serialized inline.
 */
export function isInlineSerializedType(type: string): boolean {
   return INLINE_SERIALIZED_TYPES.has(type);
}

/**
 * AST types that exist only to wrap a single reference and should serialize as just the reference ID.
 * Maps type name to the property containing the reference. Cannot be derived since other types may also have single references.
 */
const REFERENCE_WRAPPER_TYPES = new Map<string, string>([
   [AttributeMappingSource.$type, AttributeMappingSource.value],
   [AttributeMappingTarget.$type, AttributeMappingTarget.value],
   [SourceObjectDependency.$type, SourceObjectDependency.source]
]);

/**
 * Get the reference property for a wrapper type, or undefined if not a wrapper type.
 */
export function getReferenceWrapperProperty(type: string): string | undefined {
   return REFERENCE_WRAPPER_TYPES.get(type);
}

interface RefTextObject {
   $refText: string;
}

function isRefTextObject(value: unknown): value is RefTextObject {
   // eslint-disable-next-line no-null/no-null
   return typeof value === 'object' && value !== null && '$refText' in value && typeof value.$refText === 'string';
}

/**
 * Gets the local qualified ID from a resolved reference target by traversing its parent chain.
 */
function getLocalIdFromNode(node: unknown): string | undefined {
   // eslint-disable-next-line no-null/no-null
   if (typeof node !== 'object' || node === null) {
      return undefined;
   }
   const record = node as Record<string, unknown>;
   if (typeof record.id !== 'string') {
      return undefined;
   }
   let id = record.id;
   let parent = record.$container;
   while (parent && typeof parent === 'object') {
      const parentRecord = parent as Record<string, unknown>;
      if (typeof parentRecord.id === 'string') {
         id = `${parentRecord.id}.${id}`;
      }
      parent = parentRecord.$container;
   }
   return id;
}

/**
 * Extracts reference text from Langium References or plain objects with $refText.
 */
export function getReferenceText(value: unknown): string | undefined {
   if (isReference(value)) {
      return value.$refText ?? value.$nodeDescription?.name ?? getLocalIdFromNode(value.ref);
   }
   if (isRefTextObject(value)) {
      return value.$refText;
   }
   return undefined;
}

const IDENTIFIED_PROPERTIES = [IdentifiedObject.id];
const NAMED_OBJECT_PROPERTIES = [...IDENTIFIED_PROPERTIES, NamedObject.name, NamedObject.description];
const CUSTOM_PROPERTIES = [WithCustomProperties.customProperties];

/**
 * Property serialization order for each AST type, matching the grammar's property order.
 * Required because interface property order in the generated AST doesn't reflect grammar order due to inheritance.
 */
const PROPERTY_ORDER = new Map<string, string[]>([
   [
      LogicalEntity.$type,
      [...NAMED_OBJECT_PROPERTIES, LogicalEntity.superEntities, LogicalEntity.attributes, LogicalEntity.identifiers, ...CUSTOM_PROPERTIES]
   ],
   [
      LogicalAttribute.$type,
      [
         ...NAMED_OBJECT_PROPERTIES,
         LogicalAttribute.datatype,
         LogicalAttribute.length,
         LogicalAttribute.precision,
         LogicalAttribute.scale,
         LogicalAttribute.mandatory,
         ...CUSTOM_PROPERTIES
      ]
   ],
   [
      Relationship.$type,
      [
         ...NAMED_OBJECT_PROPERTIES,
         Relationship.parent,
         Relationship.parentRole,
         Relationship.parentCardinality,
         Relationship.child,
         Relationship.childRole,
         Relationship.childCardinality,
         Relationship.attributes,
         ...CUSTOM_PROPERTIES
      ]
   ],
   [RelationshipAttribute.$type, [RelationshipAttribute.parent, RelationshipAttribute.child, ...CUSTOM_PROPERTIES]],
   [SystemDiagram.$type, [...IDENTIFIED_PROPERTIES, SystemDiagram.nodes, SystemDiagram.edges]],
   [
      LogicalEntityNode.$type,
      [
         ...IDENTIFIED_PROPERTIES,
         LogicalEntityNode.entity,
         LogicalEntityNode.x,
         LogicalEntityNode.y,
         LogicalEntityNode.width,
         LogicalEntityNode.height
      ]
   ],
   [
      RelationshipEdge.$type,
      [
         ...IDENTIFIED_PROPERTIES,
         RelationshipEdge.relationship,
         RelationshipEdge.sourceNode,
         RelationshipEdge.targetNode,
         RelationshipEdge.routingPoints
      ]
   ],
   [InheritanceEdge.$type, [...IDENTIFIED_PROPERTIES, InheritanceEdge.baseNode, InheritanceEdge.superNode, InheritanceEdge.routingPoints]],
   [Mapping.$type, [...IDENTIFIED_PROPERTIES, Mapping.sources, Mapping.target, ...CUSTOM_PROPERTIES]],
   [
      SourceObject.$type,
      [
         ...IDENTIFIED_PROPERTIES,
         SourceObject.entity,
         SourceObject.join,
         SourceObject.dependencies,
         SourceObject.conditions,
         ...CUSTOM_PROPERTIES
      ]
   ],
   [TargetObject.$type, [TargetObject.entity, TargetObject.mappings, ...CUSTOM_PROPERTIES]],
   [AttributeMapping.$type, [AttributeMapping.attribute, AttributeMapping.sources, AttributeMapping.expressions, ...CUSTOM_PROPERTIES]],
   [AttributeMappingExpression.$type, [AttributeMappingExpression.language, AttributeMappingExpression.expression]],
   [CustomProperty.$type, [...NAMED_OBJECT_PROPERTIES, CustomProperty.value]],
   [LogicalIdentifier.$type, [...NAMED_OBJECT_PROPERTIES, LogicalIdentifier.primary, LogicalIdentifier.attributes, ...CUSTOM_PROPERTIES]],
   [DataModel.$type, [...NAMED_OBJECT_PROPERTIES, DataModel.type, DataModel.version, DataModel.dependencies, ...CUSTOM_PROPERTIES]],
   [DataModelDependency.$type, [DataModelDependency.datamodel, DataModelDependency.version]]
]);
PROPERTY_ORDER.set(SourceObjectAttribute.$type, PROPERTY_ORDER.get(LogicalAttribute.$type) ?? []);
PROPERTY_ORDER.set(TargetObjectAttribute.$type, PROPERTY_ORDER.get(LogicalAttribute.$type) ?? []);

/**
 * Sorts properties in place according to the grammar's property order for the given type.
 * Properties not in the order list will have index -1, sorting them to the beginning.
 */
export function sortPropertiesByGrammarOrder<T extends { name: string }>(type: string, properties: T[]): void {
   const order = PROPERTY_ORDER.get(type);
   if (order) {
      properties.sort((left, right) => order.indexOf(left.name) - order.indexOf(right.name));
   }
}
