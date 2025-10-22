/**
 * Unit tests for ID resolution functions.
 */

import { describe, it, expect } from '@jest/globals';
import { resolveId } from './ids.js';
import type { Hints } from './hints.js';

describe('resolveId', () => {
   it('should use node.id from IdentifiedObject when present', () => {
      const node = { $type: 'LogicalEntity', id: 'customer-entity', name: 'Customer' };
      const id = resolveId(node);
      expect(id).toBe('customer-entity');
   });

   it('should synthesize ID from $type and name when id is missing', () => {
      const node = { $type: 'Attribute', name: 'firstName' };
      const id = resolveId(node);
      expect(id).toBe('Attribute:firstName');
   });

   it('should use custom key property from hints when specified', () => {
      const node = { $type: 'CustomNode', customKey: 'my-key', name: 'Node' };
      const hints: Hints = {
         CustomNode: { keyProp: 'customKey' }
      };
      const id = resolveId(node, hints.CustomNode);
      expect(id).toBe('my-key');
   });

   it('should handle nodes without name property', () => {
      const node = { $type: 'UnnamedNode', value: 'test' };
      const id = resolveId(node);
      expect(id).toMatch(/^UnnamedNode:/);
   });

   it('should create stable IDs for same node content', () => {
      const node1 = { $type: 'Attribute', name: 'lastName' };
      const node2 = { $type: 'Attribute', name: 'lastName' };
      const id1 = resolveId(node1);
      const id2 = resolveId(node2);
      expect(id1).toBe(id2);
   });

   it('should create different IDs for different node content', () => {
      const node1 = { $type: 'Attribute', name: 'firstName' };
      const node2 = { $type: 'Attribute', name: 'lastName' };
      const id1 = resolveId(node1);
      const id2 = resolveId(node2);
      expect(id1).not.toBe(id2);
   });
});
