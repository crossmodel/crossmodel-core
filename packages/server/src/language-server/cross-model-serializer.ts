/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import * as transfer from '@crossmodel/protocol';
import { quote, toId, toIdReference } from '@crossmodel/protocol';
import { AstNode, GenericAstNode, isAstNode } from 'langium';
import { Serializer } from '../model-server/serializer.js';
import * as ast from './ast.js';
import {
   getOrderedPropertyNames,
   getReferenceText,
   getReferenceWrapperProperty,
   isDefaultValue,
   isInlineSerializedType,
   isReferenceProperty,
   isUnquotedProperty
} from './util/serialization-util.js';

/**
 * Hand-written AST serializer as there is currently no out-of-the box serializer from Langium, but it is on the roadmap.
 * cf. https://github.com/langium/langium/discussions/683
 * cf. https://github.com/langium/langium/discussions/863
 *
 * Handles both Langium AST nodes (with Reference objects) and transfer model objects (with plain string references).
 * Property order is determined by the PROPERTY_ORDER map in serialization-util, matching the grammar's property order.
 */
export class CrossModelSerializer implements Serializer<ast.CrossModelRoot | transfer.CrossModelRoot> {
   // New line character.
   static readonly CHAR_NEWLINE = '\n';
   // Indentation character.
   static readonly CHAR_INDENTATION = ' ';
   // The amount of spaces to use for indentation.
   static readonly INDENTATION_AMOUNT = 4;

   serialize(root: ast.CrossModelRoot | transfer.CrossModelRoot): string {
      return this.serializeNode(root, 0)?.trim() ?? '';
   }

   /**
    * Serializes an AST or transfer model node by iterating its properties in grammar order.
    * @param indentFirstProperty When true, the first property is indented at the given level (nested node context).
    *   When false, the first property is not indented (array element context, where the `- ` prefix handles alignment).
    */
   protected serializeNode(node: AstNode | Record<string, unknown>, indentationLevel: number, indentFirstProperty = true): string {
      const nodeType = (node as AstNode).$type;
      let isFirst = indentFirstProperty;

      return getOrderedPropertyNames(nodeType)
         .map(prop => {
            const propValue = (node as GenericAstNode)[prop];
            // eslint-disable-next-line no-null/no-null
            if (propValue === undefined || propValue === null) {
               return undefined;
            }
            if (Array.isArray(propValue) && propValue.length === 0) {
               return undefined;
            }
            if (isDefaultValue(nodeType, prop, propValue)) {
               return undefined;
            }
            if (typeof propValue === 'string' && propValue.trim() === '') {
               return undefined;
            }

            // Arrays and non-inline objects start on a new line after the keyword
            const onNewLine = Array.isArray(propValue) || (isAstNode(propValue) && !isInlineSerializedType(propValue.$type));
            const serialized = this.serializePropertyValue(nodeType, prop, propValue, onNewLine ? indentationLevel + 1 : 0);
            if (!serialized) {
               return undefined;
            }

            const separator = onNewLine ? CrossModelSerializer.CHAR_NEWLINE : ' ';
            const line = `${prop}:${separator}${serialized}`;
            const result = isFirst ? this.indent(line, indentationLevel) : line;
            isFirst = false;
            return result;
         })
         .filter((s): s is string => s !== undefined)
         .join(CrossModelSerializer.CHAR_NEWLINE + this.indent('', indentationLevel));
   }

   /**
    * Serializes a single property value, dispatching based on property metadata (from the generated AST reflection)
    * and value type. Uses the node type and property name to determine reference properties, unquoted properties, etc.
    *
    * @param isArrayElement When true, nested nodes won't indent their first property (array `- ` prefix handles alignment).
    */
   protected serializePropertyValue(
      nodeType: string,
      key: string,
      value: unknown,
      indentationLevel: number,
      isArrayElement = false
   ): string | undefined {
      if (key.startsWith('$')) {
         return undefined;
      }

      // Langium Reference objects (AST mode): extract $refText and serialize as ID reference
      const reference = getReferenceText(value);
      if (reference !== undefined) {
         return toIdReference(reference);
      }

      // ID property: ensure proper ID formatting
      if (key === ast.IdentifiedObject.id) {
         return toId(value as string);
      }

      // Reference properties: scalar strings (transfer mode) or reference arrays (both modes)
      if (isReferenceProperty(nodeType, key)) {
         if (Array.isArray(value)) {
            return this.serializeReferenceArray(value, indentationLevel);
         }
         if (typeof value === 'string') {
            return toIdReference(value);
         }
      }

      // Unquoted enum-like values (cardinalities, join types, data model types, versions)
      if (isUnquotedProperty(nodeType, key)) {
         return String(value);
      }

      // Reference wrapper types (e.g., AttributeMappingSource wraps a single reference as a node)
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

      // JoinCondition: special inline serialization from CST text or reconstructed expression
      if (ast.isJoinCondition(value)) {
         return this.serializeJoinCondition(value);
      }

      // Nested AST node: recurse into its properties
      if (isAstNode(value)) {
         return this.serializeNode(value, indentationLevel, !isArrayElement);
      }

      // Arrays of non-reference values (nodes, join conditions, etc.)
      if (Array.isArray(value)) {
         return this.serializeArray(value, nodeType, key, indentationLevel);
      }

      // Primitive values (strings, numbers, booleans)
      return JSON.stringify(value);
   }

   /** Serializes an array of reference values (Langium References or plain strings from the transfer model). */
   protected serializeReferenceArray(items: unknown[], indentationLevel: number): string {
      return items
         .filter(item => item !== undefined)
         .map(item => {
            const refText = getReferenceText(item);
            if (refText !== undefined) {
               return toIdReference(refText);
            }
            if (typeof item === 'string') {
               return toIdReference(item);
            }
            return undefined;
         })
         .filter((s): s is string => s !== undefined)
         .map(s => this.indent(`  - ${s}`, indentationLevel - 1))
         .join(CrossModelSerializer.CHAR_NEWLINE);
   }

   /** Serializes an array of non-reference values (nodes, join conditions, primitives). */
   protected serializeArray(items: unknown[], nodeType: string, key: string, indentationLevel: number): string {
      return items
         .filter(item => item !== undefined)
         .map(item => this.serializePropertyValue(nodeType, key, item, indentationLevel, /* isArrayElement */ true))
         .filter((s): s is string => s !== undefined)
         .map(s => this.indent(`  - ${s}`, indentationLevel - 1))
         .join(CrossModelSerializer.CHAR_NEWLINE);
   }

   protected indent(text: string, level: number): string {
      return `${CrossModelSerializer.CHAR_INDENTATION.repeat(level * CrossModelSerializer.INDENTATION_AMOUNT)}${text}`;
   }

   protected serializeJoinCondition(obj: ast.JoinCondition | transfer.JoinCondition): string {
      const text = (obj as ast.JoinCondition).$cstNode?.text?.trim();
      if (text) {
         return text;
      }
      const left = this.serializeBooleanExpression(obj.expression.left);
      const right = this.serializeBooleanExpression(obj.expression.right);
      return [left, obj.expression.op, right].join(' ');
   }

   protected serializeBooleanExpression(obj: ast.BooleanExpression | transfer.BooleanExpression): string {
      if (ast.isStringLiteral(obj)) {
         return quote(obj.value);
      }
      if (ast.isSourceObjectAttributeReference(obj)) {
         return getReferenceText(obj.value) ?? (typeof obj.value === 'string' ? toIdReference(obj.value) : '');
      }
      return obj.value.toString();
   }
}
