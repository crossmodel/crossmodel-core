/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { describe, expect, test } from '@jest/globals';
import { resolveId } from '../../src/reflection/ids';

describe('resolveId', () => {
   test('uses id property when available', () => {
      const node = {
         $type: 'LogicalEntity',
         id: 'Customer',
         name: 'Customer'
      };

      const result = resolveId(node);

      expect(result).toBe('Customer');
   });

   test('falls back to synthesized key when id is missing', () => {
      const node = {
         $type: 'Attribute',
         name: 'firstName',
         datatype: 'String'
      };

      const result = resolveId(node);

      expect(result).toContain('Attribute');
      expect(result).toContain('firstName');
   });

   test('uses keyProp hint when provided', () => {
      const node = {
         $type: 'CustomNode',
         customId: 'custom123',
         name: 'Test'
      };

      const hint = { keyProp: 'customId' };

      const result = resolveId(node, hint);

      expect(result).toBe('custom123');
   });

   test('handles nodes without name property', () => {
      const node = {
         $type: 'UnnamedNode',
         value: 'testValue'
      };

      const result = resolveId(node);

      expect(result).toContain('UnnamedNode');
      expect(result).toContain('testValue');
   });

   test('creates unique ids for similar nodes', () => {
      const node1 = {
         $type: 'Attribute',
         name: 'attr1',
         datatype: 'String'
      };

      const node2 = {
         $type: 'Attribute',
         name: 'attr2',
         datatype: 'String'
      };

      const id1 = resolveId(node1);
      const id2 = resolveId(node2);

      expect(id1).not.toBe(id2);
   });

   test('handles empty objects', () => {
      const node = {
         $type: 'EmptyNode'
      };

      const result = resolveId(node);

      expect(result).toContain('EmptyNode');
      expect(result.length).toBeGreaterThan('EmptyNode'.length);
   });

   test('returns same id for identical nodes', () => {
      const node = {
         $type: 'LogicalEntity',
         id: 'Product',
         name: 'Product'
      };

      const id1 = resolveId(node);
      const id2 = resolveId(node);

      expect(id1).toBe(id2);
   });
});
