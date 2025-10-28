/*******************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { describe, expect, test } from '@jest/globals';
import { URI } from 'vscode-uri';
import { createSourceObject } from '../../../src/language-server/util/ast-util';
import { customer } from '../test-utils/test-documents/entity/customer';
import { createCrossModelTestServices, parseLogicalEntity, parseMapping, testUri } from '../test-utils/utils';

const services = createCrossModelTestServices();

describe('createSourceObject', () => {
   describe('Join type assignment', () => {
      test('Simple mapping with first source', async () => {
         const mapping = await parseMapping({
            services,
            text: `mapping:
    id: OrderMapping
    target:
        entity: Orders`
         });
         const entity = await parseLogicalEntity({ services, text: customer });

         const result = createSourceObject(entity, mapping, services.references.IdProvider);

         expect(result.join).toBe('from');
      });

      test('With entity reference', async () => {
         const mapping = await parseMapping({
            services,
            text: `mapping:
    id: OrderMapping  
    target:
        entity: Orders`
         });

         const entityRef = {
            name: 'Customer',
            type: 'LogicalEntity',
            documentUri: URI.parse(testUri('customer.entity.cm')),
            path: '/Customer'
         };

         const result = createSourceObject(entityRef, mapping, services.references.IdProvider);
         expect(result.join).toBe('from');
      });

      test('mapping with existing from source', async () => {
         const mapping = await parseMapping({
            services,
            text: `mapping:
    id: OrderMapping
    sources:
      - id: CustomerSource
        entity: Customer
        join: from
    target:
        entity: Orders`
         });
         const entity = await parseLogicalEntity({ services, text: customer });

         const result = createSourceObject(entity, mapping, services.references.IdProvider);
         expect(result.join).toBe('left-join');
      });

      test('mapping with multiple sources but no from', async () => {
         const mapping = await parseMapping({
            services,
            text: `mapping:
    id: OrderMapping
    sources:
      - id: ProductSource
        entity: Product
        join: left-join
    target:
        entity: Orders`
         });

         const entityRef = {
            name: 'Customer',
            type: 'LogicalEntity',
            documentUri: URI.parse(testUri('customer.entity.cm')),
            path: '/Customer'
         };

         const result = createSourceObject(entityRef, mapping, services.references.IdProvider);
         expect(result.join).toBe('from');
      });
   });
});
