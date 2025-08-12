/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { quote, toId, toIdReference } from '@crossmodel/protocol';
import { AstNode, GenericAstNode, Grammar, isAstNode, isReference } from 'langium';
import { collectAst } from 'langium/grammar';
import { Serializer } from '../model-server/serializer.js';
import {
   AttributeMapping,
   BooleanExpression,
   CrossModelRoot,
   CustomProperty,
   DataModel,
   DataModelDependency,
   InheritanceEdge,
   isAttributeMappingSource,
   isAttributeMappingTarget,
   isDataModel,
   isDataModelDependency,
   isJoinCondition,
   isLogicalAttribute,
   isLogicalIdentifier,
   isRelationship,
   isSourceObject,
   isSourceObjectDependency,
   JoinCondition,
   LogicalAttribute,
   LogicalEntity,
   LogicalEntityNode,
   LogicalIdentifier,
   Mapping,
   reflection,
   Relationship,
   RelationshipAttribute,
   RelationshipEdge,
   SourceObject,
   SourceObjectAttribute,
   SourceObjectAttributeReference,
   StringLiteral,
   SystemDiagram,
   TargetObject,
   TargetObjectAttribute
} from './generated/ast.js';
import { isImplicitProperty } from './util/ast-util.js';

const IDENTIFIED_PROPERTIES = ['id'];
const NAMED_OBJECT_PROPERTIES = [...IDENTIFIED_PROPERTIES, 'name', 'description'];
const CUSTOM_PROPERTIES = ['customProperties'];

/**
 * Hand-written map of the order of properties for serialization.
 * This must match the order in which the properties appear in the grammar.
 * It cannot be derived for interfaces as the interface order does not reflect property order in grammar due to inheritance.
 */
const PROPERTY_ORDER = new Map<string, string[]>([
   [LogicalEntity, [...NAMED_OBJECT_PROPERTIES, 'superEntities', 'attributes', 'identifiers', ...CUSTOM_PROPERTIES]],
   [LogicalAttribute, [...NAMED_OBJECT_PROPERTIES, 'datatype', 'length', 'precision', 'scale', 'identifier', ...CUSTOM_PROPERTIES]],
   [
      Relationship,
      [
         ...NAMED_OBJECT_PROPERTIES,
         'parent',
         'parentRole',
         'parentCardinality',
         'child',
         'childRole',
         'childCardinality',
         'attributes',
         ...CUSTOM_PROPERTIES
      ]
   ],
   [RelationshipAttribute, ['parent', 'child', ...CUSTOM_PROPERTIES]],
   [SystemDiagram, [...IDENTIFIED_PROPERTIES, 'nodes', 'edges']],
   [LogicalEntityNode, [...IDENTIFIED_PROPERTIES, 'entity', 'x', 'y', 'width', 'height']],
   [RelationshipEdge, [...IDENTIFIED_PROPERTIES, 'relationship', 'sourceNode', 'targetNode']],
   [InheritanceEdge, [...IDENTIFIED_PROPERTIES, 'baseNode', 'superNode']],
   [Mapping, [...IDENTIFIED_PROPERTIES, 'sources', 'target', ...CUSTOM_PROPERTIES]],
   [SourceObject, [...IDENTIFIED_PROPERTIES, 'entity', 'join', 'dependencies', 'conditions', ...CUSTOM_PROPERTIES]],
   [TargetObject, ['entity', 'mappings', ...CUSTOM_PROPERTIES]],
   [AttributeMapping, ['attribute', 'sources', 'expression', ...CUSTOM_PROPERTIES]],
   [CustomProperty, [...NAMED_OBJECT_PROPERTIES, 'value']],
   [LogicalIdentifier, [...NAMED_OBJECT_PROPERTIES, 'primary', 'attributes', ...CUSTOM_PROPERTIES]],
   [DataModel, [...NAMED_OBJECT_PROPERTIES, 'type', 'version', 'dependencies', ...CUSTOM_PROPERTIES]],
   [DataModelDependency, ['datamodel', 'version']]
]);
PROPERTY_ORDER.set(SourceObjectAttribute, PROPERTY_ORDER.get(LogicalAttribute) ?? []);
PROPERTY_ORDER.set(TargetObjectAttribute, PROPERTY_ORDER.get(LogicalAttribute) ?? []);

/**
 * Hand-written AST serializer as there is currently no out-of-the box serializer from Langium, but it is on the roadmap.
 * cf. https://github.com/langium/langium/discussions/683
 * cf. https://github.com/langium/langium/discussions/863
 */
export class CrossModelSerializer implements Serializer<CrossModelRoot> {
   // New line character.
   static readonly CHAR_NEWLINE = '\n';
   // Indentation character.
   static readonly CHAR_INDENTATION = ' ';
   // The amount of spaces to use to indent an object.
   static readonly INDENTATION_AMOUNT_OBJECT = 4;
   // The amount of spaces to use to indent an array.
   static readonly INDENTATION_AMOUNT_ARRAY = 2;

   private propertyCache = new Map<string, string[]>();

   constructor(
      readonly grammar: Grammar,
      readonly astTypes = collectAst(grammar)
   ) {}

   serialize(root: CrossModelRoot): string {
      return this.toYaml(root, '', root)?.trim() ?? '';
   }

   private toYaml(parent: AstNode | any[], key: string, value: any, indentationLevel = 0): string | undefined {
      if (key.startsWith('$') || isImplicitProperty(key, parent)) {
         return undefined;
      }
      if (isReference(value)) {
         return toIdReference(value.$refText ?? value.$nodeDescription?.name);
      }
      if (key === 'id') {
         // ensure we properly serialize IDs
         return toId(value);
      }
      if (
         (key === 'superEntities' && Array.isArray(parent)) ||
         (key === 'attributes' && Array.isArray(parent) && typeof parent?.[0] === 'string') ||
         (!Array.isArray(value) && this.isValidReference(parent, key, value))
      ) {
         // ensure we properly serialize ID references
         return toIdReference(value);
      }
      if (
         propertyOf(parent, key, isRelationship, 'parentCardinality') ||
         propertyOf(parent, key, isRelationship, 'childCardinality') ||
         propertyOf(parent, key, isSourceObject, 'join') ||
         propertyOf(parent, key, isDataModel, 'type') ||
         propertyOf(parent, key, isDataModel, 'version') ||
         propertyOf(parent, key, isDataModelDependency, 'version')
      ) {
         // values that we do not want to quote
         return value;
      }
      if (isAttributeMappingSource(value) || isAttributeMappingTarget(value)) {
         return toIdReference(value.value?.$refText ?? value.value);
      }
      if (isSourceObjectDependency(value)) {
         return toIdReference(value.source?.$refText ?? value.source);
      }
      if (isJoinCondition(value)) {
         return this.serializeJoinCondition(value);
      }
      if (isAstNode(value)) {
         let isFirstNested = isAstNode(parent);
         const properties = this.getPropertyNames(value.$type)
            .map(prop => {
               const propValue = (value as GenericAstNode)[prop];
               // eslint-disable-next-line no-null/no-null
               if (propValue === undefined || propValue === null) {
                  return undefined;
               }
               if (Array.isArray(propValue) && propValue.length === 0) {
                  // skip empty arrays
                  return undefined;
               }
               if (isLogicalAttribute(value) && prop === 'identifier' && propValue === false) {
                  // special: skip identifier property if it is false
                  return undefined;
               }
               if (isLogicalIdentifier(value) && prop === 'primary' && propValue === false) {
                  // special: skip primary property if it is false
                  return undefined;
               }
               // arrays and objects start on a new line -- skip some objects that we do not actually serialize in object structure
               const onNewLine =
                  Array.isArray(propValue) ||
                  (isAstNode(propValue) &&
                     !isAttributeMappingSource(propValue) &&
                     !isAttributeMappingTarget(propValue) &&
                     !isSourceObjectDependency(propValue) &&
                     !isJoinCondition(propValue));
               const serializedPropValue = this.toYaml(value, prop, propValue, onNewLine ? indentationLevel + 1 : 0);
               if (!serializedPropValue) {
                  return undefined;
               }
               const separator = onNewLine ? CrossModelSerializer.CHAR_NEWLINE : ' ';
               const serializedProp = `${this.toKeyword(prop)}:${separator}${serializedPropValue}`;
               const serialized = isFirstNested ? this.indent(serializedProp, indentationLevel) : serializedProp;
               isFirstNested = false;
               return serialized;
            })
            .filter(serializedProp => serializedProp !== undefined)
            .join(CrossModelSerializer.CHAR_NEWLINE + this.indent('', indentationLevel));
         return properties;
      }
      if (Array.isArray(value)) {
         return value
            .filter(item => item !== undefined)
            .map(item => this.toYaml(value, key, item, indentationLevel))
            .filter(serializedItem => serializedItem !== undefined)
            .map(serializedItem => this.indent(`  - ${serializedItem}`, indentationLevel - 1))
            .join(CrossModelSerializer.CHAR_NEWLINE);
      }
      return JSON.stringify(value);
   }

   protected toKeyword(prop: string): string {
      if (prop === 'superEntities') {
         return 'inherits';
      }
      return prop;
   }

   protected indent(text: string, level: number): string {
      return `${CrossModelSerializer.CHAR_INDENTATION.repeat(level * CrossModelSerializer.INDENTATION_AMOUNT_OBJECT)}${text}`;
   }

   protected isValidReference(node: AstNode | any[], key: string, value: any): value is string {
      if (!isAstNode(node)) {
         return false;
      }
      try {
         // if finding the reference type fails, is it not a valid reference
         reflection.getReferenceType({ container: node, property: key, reference: { $refText: toIdReference(value) } });
         return true;
      } catch (error) {
         return false;
      }
   }

   protected getPropertyNames(elementType: string, kind: 'all' | 'mandatory' | 'optional' = 'all'): string[] {
      const key = elementType + '$' + kind;
      let cachedProperties = this.propertyCache.get(key);
      if (!cachedProperties) {
         cachedProperties = this.calcProperties(elementType, kind);
         this.propertyCache.set(key, cachedProperties);
      }
      return cachedProperties;
   }

   protected calcProperties(elementType: string, kind: 'all' | 'mandatory' | 'optional'): string[] {
      const interfaceType = this.astTypes.interfaces.find(type => type.name === elementType);
      const allProperties = interfaceType?.allProperties;
      const order = PROPERTY_ORDER.get(elementType);
      if (order) {
         allProperties?.sort((left, right) => order.indexOf(left.name) - order.indexOf(right.name));
      }
      return !allProperties
         ? []
         : kind === 'all'
           ? allProperties.map(prop => prop.name)
           : kind === 'optional'
             ? allProperties.filter(prop => prop.optional).map(prop => prop.name)
             : allProperties.filter(prop => !prop.optional).map(prop => prop.name);
   }

   private serializeJoinCondition(obj: JoinCondition): any {
      const text = obj.$cstNode?.text?.trim();
      if (text) {
         return text;
      }
      const left = this.serializeBooleanExpression(obj.expression.left);
      const right = this.serializeBooleanExpression(obj.expression.right);
      return [left, obj.expression.op, right].join(' ');
   }

   private serializeBooleanExpression(obj: BooleanExpression): string {
      if (obj.$type === StringLiteral) {
         return quote(obj.value);
      }
      if (obj.$type === SourceObjectAttributeReference) {
         return toIdReference(obj.value as unknown as string);
      }
      return obj.value.toString();
   }
}

function propertyOf<T extends AstNode, K extends keyof T>(
   obj: unknown,
   key: string,
   guard: (type: unknown) => type is T,
   property: K
): obj is T {
   // type-safe check for a specific property
   return guard(obj) && key === property;
}
