/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { describe, expect, test } from '@jest/globals';
import { isReference } from 'langium';

import {
   relationship1,
   relationship2,
   relationship_with_attribute,
   relationship_with_attribute_wrong_entity,
   relationship_with_duplicate_attributes
} from './test-utils/test-documents/relationship/index.js';
import { createCrossModelTestServices, parseDocuments, parseRelationship, testUri } from './test-utils/utils.js';

import { ModelFileExtensions } from '@crossmodel/protocol';
import { address } from './test-utils/test-documents/entity/address.js';
import { customer } from './test-utils/test-documents/entity/customer.js';
import { order } from './test-utils/test-documents/entity/order.js';

const services = createCrossModelTestServices();

describe('CrossModel language Relationship', () => {
   beforeAll(async () => {
      await parseDocuments({ services, text: order }, { services, text: customer }, { services, text: address });
   });

   test('Simple file for relationship', async () => {
      const relationship = await parseRelationship({ services, text: relationship1 });

      expect(relationship.id).toBe('Order_Customer1');
      expect(relationship.name).toBe('Customer Order relationship');
      expect(relationship.description).toBe('A relationship between a customer and an order.');

      expect(isReference(relationship.parent)).toBe(true);
      expect(isReference(relationship.child)).toBe(true);
      expect(relationship.parent?.$refText).toBe('Customer');
      expect(relationship.child?.$refText).toBe('Order');
   });

   test('relationship with indentation error', async () => {
      await parseRelationship({ services, text: relationship2 }, { parserErrors: 1 });
   });

   test('relationship with attributes', async () => {
      const relationship = await parseRelationship({
         services,
         text: relationship_with_attribute,
         validation: true,
         documentUri: testUri('Order_CustomerWithAttribute' + ModelFileExtensions.Relationship)
      });

      expect(relationship.attributes).toHaveLength(1);
      expect(relationship.$document.diagnostics).toHaveLength(0);
   });

   test('relationship with wrong entity', async () => {
      const relationship = await parseRelationship({
         services,
         text: relationship_with_attribute_wrong_entity,
         validation: true,
         documentUri: testUri('Order_CustomerWithAttributeWrongEntity' + ModelFileExtensions.Relationship)
      });
      expect(relationship.$document.diagnostics).toHaveLength(1);
   });

   test('relationship with duplicates', async () => {
      const relationship = await parseRelationship({
         services,
         text: relationship_with_duplicate_attributes,
         validation: true,
         documentUri: testUri('Order_CustomerWithDuplicateAttributes' + ModelFileExtensions.Relationship)
      });
      expect(relationship.$document.diagnostics).toHaveLength(2);
   });
});
