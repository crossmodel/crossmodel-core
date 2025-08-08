/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { describe, expect, test } from '@jest/globals';

import { entity1, entity2, entity3, entity4, entityWithCustomProperties } from './test-utils/test-documents/entity/index.js';
import { createCrossModelTestServices, parseLogicalEntity } from './test-utils/utils.js';

const services = createCrossModelTestServices();

describe('CrossModel language Entity', () => {
   describe('Without attributes', () => {
      test('Simple file for entity', async () => {
         const entity = await parseLogicalEntity({ services, text: entity1 });
         expect(entity.id).toBe('Customer');
         expect(entity.name).toBe('Customer');
         expect(entity.description).toBe('A customer with whom a transaction has been made.');
      });

      test('With custom properties', async () => {
         const entity = await parseLogicalEntity({ services, text: entityWithCustomProperties });
         expect(entity.id).toBe('Customer');
         expect(entity.name).toBe('Customer');
         expect(entity.customProperties[0].id).toBe('customProperty1');
         expect(entity.customProperties[0].name).toBe('Custom Property 1');
         expect(entity.customProperties[0].value).toBe('Value 1');
      });
   });

   describe('With attributes', () => {
      test('entity with attributes', async () => {
         const entity = await parseLogicalEntity({ services, text: entity2 });
         expect(entity.attributes.length).toBe(6);
         expect(entity.attributes[0].id).toBe('Id');
         expect(entity.attributes[0].name).toBe('Id');
         expect(entity.attributes[0].datatype).toBe('Integer');
      });

      test('entity with indentation error', async () => {
         await parseLogicalEntity({ services, text: entity3 }, { parserErrors: 1 });
      });

      test('entity with attributes coming before the description and name', async () => {
         const entity = await parseLogicalEntity({ services, text: entity4 }, { parserErrors: 1 });
         expect(entity.id).toBe('Customer');
         expect(entity.name).toBeUndefined();
         expect(entity.description).toBeUndefined();

         expect(entity.attributes.length).toBe(6);
         expect(entity.attributes[0].id).toBe('Id');
         expect(entity.attributes[0].name).toBe('Id');
         expect(entity.attributes[0].datatype).toBe('Integer');
      });
   });
});
