/********************************************************************************
 * Copyright (c) 2026 CrossBreeze.
 ********************************************************************************/

import * as transfer from '@crossmodel/protocol';
import { beforeAll, describe, expect, test } from '@jest/globals';
import { CrossModelRoot } from '../../../src/language-server/ast';
import { CrossModelClientConverter } from '../../../src/language-server/cross-model-document-converter';
import { customer } from '../test-utils/test-documents/entity/customer';
import { entityWithCustomProperties } from '../test-utils/test-documents/entity/entity-with-custom-properties';
import { order } from '../test-utils/test-documents/entity/order';
import { test_mapping } from '../test-utils/test-documents/mappings/test_mapping';
import { relationship_with_attribute } from '../test-utils/test-documents/relationship/relationship_attribute';
import {
   createCrossModelTestServices,
   entityDocumentUri,
   mappingDocumentUri,
   parseDocument,
   parseLogicalEntity,
   parseMapping,
   relationshipDocumentUri
} from '../test-utils/utils';

const services = createCrossModelTestServices();

describe('CrossModelClientConverter', () => {
   let converter: CrossModelClientConverter;

   beforeAll(() => {
      converter = services.shared.client.Converter;
   });

   describe('toTransfer — entity', () => {
      test('converts entity with attributes, stripping $ properties', async () => {
         const entity = await parseLogicalEntity({
            services,
            text: customer,
            documentUri: entityDocumentUri('customer')
         });
         const root = entity.$document.parseResult.value;
         const result = converter.toTransfer(root);

         // $type is preserved
         expect(result.$type).toBe('CrossModelRoot');
         expect(result.entity).toBeDefined();
         expect(result.entity!.$type).toBe('LogicalEntity');

         // Grammar-defined properties are copied
         expect(result.entity!.id).toBe('Customer');
         expect(result.entity!.name).toBe('Customer');
         expect(result.entity!.attributes).toHaveLength(7);
         expect(result.entity!.attributes[0].id).toBe('Id');
         expect(result.entity!.attributes[0].datatype).toBe('Integer');

         // Langium internals ($container, $document, $cstNode) are stripped
         const entityRecord = result.entity as unknown as Record<string, unknown>;
         expect(entityRecord.$container).toBeUndefined();
         expect(entityRecord.$document).toBeUndefined();
         expect(entityRecord.$cstNode).toBeUndefined();
      });

      test('converts entity with custom properties', async () => {
         const entity = await parseLogicalEntity({
            services,
            text: entityWithCustomProperties,
            documentUri: entityDocumentUri('entity_custom_props')
         });
         const root = entity.$document.parseResult.value;
         const result = converter.toTransfer(root);

         expect(result.entity!.customProperties).toHaveLength(1);
         const prop = result.entity!.customProperties[0];
         expect(prop.$type).toBe('CustomProperty');
         expect(prop.id).toBe('customProperty1');
         expect(prop.name).toBe('Custom Property 1');
         expect(prop.value).toBe('Value 1');
      });
   });

   describe('toTransfer — references', () => {
      test('converts Reference<T> objects to $refText strings', async () => {
         await parseDocument({
            services,
            text: customer,
            documentUri: entityDocumentUri('ref_test_customer')
         });
         await parseDocument({
            services,
            text: order,
            documentUri: entityDocumentUri('ref_test_order')
         });
         const doc = await parseDocument({
            services,
            text: relationship_with_attribute,
            documentUri: relationshipDocumentUri('ref_test_rel')
         });
         const root = doc.parseResult.value;
         const result = converter.toTransfer(root);

         // Parent and child references are converted to strings
         expect(result.relationship).toBeDefined();
         expect(typeof result.relationship!.parent).toBe('string');
         expect(typeof result.relationship!.child).toBe('string');

         // Relationship attributes contain reference strings
         expect(result.relationship!.attributes).toHaveLength(1);
         expect(typeof result.relationship!.attributes[0].parent).toBe('string');
         expect(typeof result.relationship!.attributes[0].child).toBe('string');
      });
   });

   describe('toTransfer — derived properties', () => {
      test('sets _globalId only on IdentifiedObject subtypes', async () => {
         const entity = await parseLogicalEntity({
            services,
            text: customer,
            documentUri: entityDocumentUri('globalId_test_customer')
         });
         const root = entity.$document.parseResult.value;
         const result = converter.toTransfer(root);

         // Entity is an IdentifiedObject — should have _globalId
         expect(result.entity!._globalId).toBeDefined();
         expect(typeof result.entity!._globalId).toBe('string');

         // Attributes are also IdentifiedObjects — should have _globalId
         expect(result.entity!.attributes[0]._globalId).toBeDefined();
      });

      test('does not set _globalId on non-IdentifiedObject types', async () => {
         const mapping = await parseMapping({
            services,
            text: test_mapping,
            documentUri: mappingDocumentUri('globalId_test_mapping')
         });
         const root = mapping.$document.parseResult.value;
         const result = converter.toTransfer(root);

         // JoinCondition is not an IdentifiedObject — should not have _globalId
         const sourceWithCondition = result.mapping!.sources[1];
         expect(sourceWithCondition.conditions).toHaveLength(1);
         const condition = sourceWithCondition.conditions[0] as unknown as Record<string, unknown>;
         expect(condition._globalId).toBeUndefined();

         // BinaryExpression is not an IdentifiedObject — should not have _globalId
         const expression = sourceWithCondition.conditions[0].expression as unknown as Record<string, unknown>;
         expect(expression._globalId).toBeUndefined();
      });

      test('provides _attributes with [] fallback for types with entity references', async () => {
         const mapping = await parseMapping({
            services,
            text: test_mapping,
            documentUri: mappingDocumentUri('attrs_test_mapping')
         });
         const root = mapping.$document.parseResult.value;
         const result = converter.toTransfer(root);

         // SourceObject should have _attributes array (possibly empty if entity ref is unresolved)
         for (const source of result.mapping!.sources) {
            expect(Array.isArray(source._attributes)).toBe(true);
         }

         // TargetObject should have _attributes array
         expect(Array.isArray(result.mapping!.target!._attributes)).toBe(true);
      });

      test('provides _id on TargetObject', async () => {
         const mapping = await parseMapping({
            services,
            text: test_mapping,
            documentUri: mappingDocumentUri('id_test_mapping')
         });
         const root = mapping.$document.parseResult.value;
         const result = converter.toTransfer(root);

         // _id should be present on TargetObject (may be undefined if entity ref is unresolved)
         expect('_id' in result.mapping!.target!).toBe(true);
      });
   });

   describe('toTransfer — mapping with nested structures', () => {
      test('converts mapping sources, target, and attribute mappings', async () => {
         const mapping = await parseMapping({
            services,
            text: test_mapping,
            documentUri: mappingDocumentUri('full_mapping_test')
         });
         const root = mapping.$document.parseResult.value;
         const result = converter.toTransfer(root);

         expect(result.mapping).toBeDefined();
         expect(result.mapping!.id).toBe('TestMapping');
         expect(result.mapping!.sources).toHaveLength(2);

         // First source
         const source1 = result.mapping!.sources[0];
         expect(source1.id).toBe('CustomerSource');
         expect(typeof source1.entity).toBe('string');
         expect(source1.join).toBe('from');

         // Second source with dependencies and conditions
         const source2 = result.mapping!.sources[1];
         expect(source2.id).toBe('OrderSource');
         expect(source2.join).toBe('inner-join');
         expect(source2.dependencies).toHaveLength(1);
         expect(typeof source2.dependencies[0].source).toBe('string');

         // Join condition — expression tree is fully converted
         expect(source2.conditions).toHaveLength(1);
         const condition = source2.conditions[0] as transfer.JoinCondition;
         expect(condition.$type).toBe('JoinCondition');
         expect(condition.expression.$type).toBe('BinaryExpression');
         expect(condition.expression.op).toBe('=');
         expect(condition.expression.left.$type).toBe('SourceObjectAttributeReference');
         expect(condition.expression.right.$type).toBe('SourceObjectAttributeReference');

         // Target with attribute mappings
         const target = result.mapping!.target!;
         expect(typeof target.entity).toBe('string');
         expect(target.mappings).toHaveLength(2);

         // Attribute mapping sources are reference wrapper types — converted to strings
         const attrMapping = target.mappings[0];
         expect(typeof attrMapping.attribute?.value).toBe('string');
         expect(attrMapping.sources).toHaveLength(2);
         expect(typeof attrMapping.sources[0].value).toBe('string');

         // Attribute mapping expressions
         expect(attrMapping.expressions).toHaveLength(1);
         expect(attrMapping.expressions[0].language).toBe('SQL');
      });
   });

   describe('toTransfer — undefined handling', () => {
      test('returns undefined for undefined input', () => {
         const result = converter.toTransfer(undefined);
         expect(result).toBeUndefined();
      });

      test('handles empty root', async () => {
         // A CrossModelRoot with no semantic content
         const root: CrossModelRoot = { $type: 'CrossModelRoot' } as CrossModelRoot;
         const result = converter.toTransfer(root);
         expect(result.$type).toBe('CrossModelRoot');
      });
   });

   describe('toAstText', () => {
      test('returns string input as-is', () => {
         const text = 'entity:\n    id: Test';
         expect(converter.toAstText(text)).toBe(text);
      });

      test('serializes transfer model root to text', async () => {
         const entity = await parseLogicalEntity({
            services,
            text: customer,
            documentUri: entityDocumentUri('toAstText_test')
         });
         const root = entity.$document.parseResult.value;
         const transferRoot = converter.toTransfer(root);

         // Round-trip: AST → transfer → text should produce valid text
         const text = converter.toAstText(transferRoot);
         expect(typeof text).toBe('string');
         expect(text.length).toBeGreaterThan(0);
         expect(text).toContain('entity:');
         expect(text).toContain('id: Customer');
      });
   });
});
