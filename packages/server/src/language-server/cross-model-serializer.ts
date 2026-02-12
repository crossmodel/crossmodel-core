/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { quote, toId, toIdReference } from '@crossmodel/protocol';
import { AstNode, GenericAstNode, Grammar, isAstNode } from 'langium';
import { collectAst } from 'langium/grammar';
import { Serializer } from '../model-server/serializer.js';
import {
   BooleanExpression,
   CrossModelRoot,
   IdentifiedObject,
   JoinCondition,
   LogicalEntity,
   isJoinCondition,
   isSourceObjectAttributeReference,
   isStringLiteral,
   reflection
} from './generated/ast.js';
import { isImplicitProperty } from './util/ast-util.js';
import {
   getPropertyKeyword,
   getReferenceText,
   getReferenceWrapperProperty,
   isDefaultValue,
   isInlineSerializedType,
   isUnquotedProperty,
   sortPropertiesByGrammarOrder
} from './util/serialization-util.js';

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
   // The amount of spaces to use for indentation.
   static readonly INDENTATION_AMOUNT = 4;

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
      // Handle reference objects (Langium Reference or plain objects with $refText)
      const reference = getReferenceText(value);
      if (reference !== undefined) {
         return toIdReference(reference);
      }
      if (key === IdentifiedObject.id) {
         // ensure we properly serialize IDs
         return toId(value);
      }
      if (
         (key === LogicalEntity.superEntities && Array.isArray(parent)) ||
         (key === LogicalEntity.attributes && Array.isArray(parent) && typeof parent?.[0] === 'string') ||
         (!Array.isArray(value) && this.isValidReference(parent, key, value))
      ) {
         // ensure we properly serialize ID references
         return toIdReference(value);
      }
      if (isAstNode(parent) && isUnquotedProperty(parent.$type, key)) {
         // values that we do not want to quote
         return value;
      }
      if (isAstNode(value)) {
         const refProperty = getReferenceWrapperProperty(value.$type);
         if (refProperty) {
            const refValue = (value as GenericAstNode)[refProperty];
            const propertyReference = getReferenceText(refValue);
            if (propertyReference || typeof refValue === 'string') {
               return toIdReference(propertyReference ?? (refValue as string));
            }
         }
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
               if (isDefaultValue(value.$type, prop, propValue)) {
                  return undefined;
               }
               // arrays and objects start on a new line -- skip some objects that we do not actually serialize in object structure
               const onNewLine = Array.isArray(propValue) || (isAstNode(propValue) && !isInlineSerializedType(propValue.$type));
               const serializedPropValue = this.toYaml(value, prop, propValue, onNewLine ? indentationLevel + 1 : 0);
               if (!serializedPropValue) {
                  return undefined;
               }
               const separator = onNewLine ? CrossModelSerializer.CHAR_NEWLINE : ' ';
               const serializedProp = `${getPropertyKeyword(prop)}:${separator}${serializedPropValue}`;
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

   protected indent(text: string, level: number): string {
      return `${CrossModelSerializer.CHAR_INDENTATION.repeat(level * CrossModelSerializer.INDENTATION_AMOUNT)}${text}`;
   }

   protected isValidReference(node: AstNode | any[], key: string, value: any): value is string {
      if (!isAstNode(node)) {
         return false;
      }
      try {
         // if finding the reference type fails, is it not a valid reference
         reflection.getReferenceType({ container: node, property: key, reference: { $refText: toIdReference(value), ref: undefined } });
         return true;
      } catch (error) {
         return false;
      }
   }

   protected getPropertyNames(elementType: string): string[] {
      let cachedProperties = this.propertyCache.get(elementType);
      if (!cachedProperties) {
         cachedProperties = this.calcPropertyNames(elementType);
         this.propertyCache.set(elementType, cachedProperties);
      }
      return cachedProperties;
   }

   protected calcPropertyNames(elementType: string): string[] {
      const interfaceType = this.astTypes.interfaces.find(type => type.name === elementType);
      const allProperties = interfaceType?.allProperties;
      if (allProperties) {
         sortPropertiesByGrammarOrder(elementType, allProperties);
      }
      return allProperties?.map(prop => prop.name) ?? [];
   }

   private serializeJoinCondition(obj: JoinCondition): string {
      const text = obj.$cstNode?.text?.trim();
      if (text) {
         return text;
      }
      const left = this.serializeBooleanExpression(obj.expression.left);
      const right = this.serializeBooleanExpression(obj.expression.right);
      return [left, obj.expression.op, right].join(' ');
   }

   private serializeBooleanExpression(obj: BooleanExpression): string {
      if (isStringLiteral(obj)) {
         return quote(obj.value);
      }
      if (isSourceObjectAttributeReference(obj)) {
         return getReferenceText(obj.value) ?? '_';
      }
      // NumberLiteral
      return obj.value.toString();
   }
}
