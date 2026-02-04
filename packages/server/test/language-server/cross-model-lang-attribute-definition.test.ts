/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { describe, expect, test } from '@jest/globals';
import { CrossModelSerializer } from '../../src/language-server/cross-model-serializer';
import { CrossModelRoot, isAttributeDefinition, isObjectDefinition } from '../../src/language-server/generated/ast';
import { createCrossModelTestServices, definitionDocumentUri, parseDocument, parseObjectDefinition } from './test-utils/utils';

const services = createCrossModelTestServices();

describe('AttributeDefinition Grammar', () => {
   describe('Parsing', () => {
      test('should parse a basic attributeDefinition', async () => {
         const def = await parseObjectDefinition({
            services,
            text: basicAttributeDefinition,
            documentUri: definitionDocumentUri('TestAttribute')
         });
         expect(def).toBeDefined();
         expect(isAttributeDefinition(def)).toBe(true);
         expect(def.id).toBe('TestAttribute');
         expect(def.name).toBe('Test Attribute');
         expect(def.description).toBe('A test attribute definition');
      });

      test('should parse an attributeDefinition with datatype properties', async () => {
         const def = await parseObjectDefinition({
            services,
            text: attributeDefinitionWithDatatype,
            documentUri: definitionDocumentUri('TextAttribute')
         });
         expect(def).toBeDefined();
         expect(isAttributeDefinition(def)).toBe(true);
         if (isAttributeDefinition(def)) {
            expect(def.datatype).toBe('Text');
            expect(def.length).toBe(255);
         }
      });

      test('should parse an attributeDefinition with all datatype properties', async () => {
         const def = await parseObjectDefinition({
            services,
            text: fullAttributeDefinitionInput,
            documentUri: definitionDocumentUri('DecimalAttribute')
         });
         expect(def).toBeDefined();
         expect(isAttributeDefinition(def)).toBe(true);
         if (isAttributeDefinition(def)) {
            expect(def.datatype).toBe('Decimal');
            expect(def.precision).toBe(10);
            expect(def.scale).toBe(2);
            expect(def.mandatory).toBe(true);
         }
      });

      test('should parse an attributeDefinition with extends', async () => {
         const def = await parseObjectDefinition({
            services,
            text: attributeDefinitionWithExtends,
            documentUri: definitionDocumentUri('ExtendedAttribute')
         });
         expect(def).toBeDefined();
         expect(isAttributeDefinition(def)).toBe(true);
         expect(def.extends?.$refText).toBe('Attribute');
      });

      test('should parse an abstract attributeDefinition', async () => {
         const def = await parseObjectDefinition({
            services,
            text: abstractAttributeDefinition,
            documentUri: definitionDocumentUri('AbstractAttribute')
         });
         expect(def).toBeDefined();
         expect(isAttributeDefinition(def)).toBe(true);
         expect(def.abstract).toBe(true);
      });

      test('isObjectDefinition should return true for AttributeDefinition', async () => {
         const def = await parseObjectDefinition({
            services,
            text: basicAttributeDefinition,
            documentUri: definitionDocumentUri('TestAttr2')
         });
         expect(isObjectDefinition(def)).toBe(true);
         expect(isAttributeDefinition(def)).toBe(true);
      });

      test('should still parse a regular objectDefinition', async () => {
         const def = await parseObjectDefinition({
            services,
            text: regularObjectDefinition,
            documentUri: definitionDocumentUri('RegularDef')
         });
         expect(def).toBeDefined();
         expect(isObjectDefinition(def)).toBe(true);
         expect(isAttributeDefinition(def)).toBe(false);
         expect(def.id).toBe('RegularDef');
      });
   });

   describe('Serialization', () => {
      let serializer: CrossModelSerializer;

      test('should serialize attributeDefinition with correct keyword', async () => {
         serializer = services.serializer.Serializer;
         const document = await parseDocument({
            services,
            text: basicAttributeDefinition,
            documentUri: definitionDocumentUri('TestSerialize')
         });
         const root = document.parseResult.value as CrossModelRoot;
         const result = serializer.serialize(root);
         expect(result.startsWith('attributeDefinition:')).toBe(true);
         expect(result).not.toContain('objectDefinition:');
      });

      test('should serialize attributeDefinition with datatype properties', async () => {
         serializer = services.serializer.Serializer;
         const document = await parseDocument({
            services,
            text: attributeDefinitionWithDatatype,
            documentUri: definitionDocumentUri('TestSerialize2')
         });
         const root = document.parseResult.value as CrossModelRoot;
         const result = serializer.serialize(root);
         expect(result.startsWith('attributeDefinition:')).toBe(true);
         expect(result).toContain('datatype: "Text"');
         expect(result).toContain('length: 255');
      });

      test('should roundtrip attributeDefinition with all properties', async () => {
         serializer = services.serializer.Serializer;
         const document = await parseDocument({
            services,
            text: fullAttributeDefinitionInput,
            documentUri: definitionDocumentUri('TestRoundtrip')
         });
         const root = document.parseResult.value as CrossModelRoot;
         const result = serializer.serialize(root);
         expect(result).toBe(fullAttributeDefinitionExpected);
      });

      test('should still serialize objectDefinition with correct keyword', async () => {
         serializer = services.serializer.Serializer;
         const document = await parseDocument({
            services,
            text: regularObjectDefinition,
            documentUri: definitionDocumentUri('TestSerialize3')
         });
         const root = document.parseResult.value as CrossModelRoot;
         const result = serializer.serialize(root);
         expect(result.startsWith('objectDefinition:')).toBe(true);
         expect(result).not.toContain('attributeDefinition:');
      });
   });
});

// --- Test Documents ---

const basicAttributeDefinition = `attributeDefinition:
    id: TestAttribute
    name: "Test Attribute"
    description: "A test attribute definition"`;

const attributeDefinitionWithDatatype = `attributeDefinition:
    id: TextAttribute
    name: "Text Attribute"
    datatype: "Text"
    length: 255`;

const fullAttributeDefinitionInput = `attributeDefinition:
    id: DecimalAttribute
    name: "Decimal Attribute"
    datatype: "Decimal"
    precision: 10
    scale: 2
    mandatory: TRUE`;

// The serializer outputs 'true' (lowercase) since mandatory is a boolean flag in the grammar
const fullAttributeDefinitionExpected = `attributeDefinition:
    id: DecimalAttribute
    name: "Decimal Attribute"
    datatype: "Decimal"
    precision: 10
    scale: 2
    mandatory: true`;

const attributeDefinitionWithExtends = `attributeDefinition:
    id: ExtendedAttribute
    name: "Extended Attribute"
    extends: Attribute`;

const abstractAttributeDefinition = `attributeDefinition:
    id: AbstractAttribute
    name: "Abstract Attribute"
    abstract: TRUE`;

const regularObjectDefinition = `objectDefinition:
    id: RegularDef
    name: "Regular Definition"`;
