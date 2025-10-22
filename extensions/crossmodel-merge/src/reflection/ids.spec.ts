import { describe, it, expect } from '@jest/globals';
import { resolveId } from './ids.js';
import type { AstNode } from 'langium';

describe('resolveId', () => {
   it('should use id property when available', () => {
      const node = {
         $type: 'Entity',
         id: 'customer-123',
         name: 'Customer',
      } as unknown as AstNode;

      const result = resolveId(node, {});

      expect(result).toBe('customer-123');
   });

   it('should use hint keyProp when specified', () => {
      const node = {
         $type: 'Attribute',
         customId: 'attr-456',
         name: 'age',
      } as unknown as AstNode;

      const hint = { keyProp: 'customId' };
      const result = resolveId(node, hint);

      expect(result).toBe('attr-456');
   });

   it('should synthesize key from $type and name when no id', () => {
      const node = {
         $type: 'Relationship',
         name: 'hasMany',
      } as unknown as AstNode;

      const result = resolveId(node, {});

      expect(result).toBe('Relationship:hasMany');
   });

   it('should synthesize key with index when name is missing', () => {
      const node = {
         $type: 'Note',
         text: 'Some note',
      } as unknown as AstNode;

      const result = resolveId(node, {});

      // Should start with $type and have some suffix
      expect(result).toMatch(/^Note:/);
   });

   it('should handle nodes without name or id', () => {
      const node = {
         $type: 'Item',
         value: 42,
      } as unknown as AstNode;

      const result = resolveId(node, {});

      expect(result).toMatch(/^Item:/);
   });

   it('should use keyProp over id when hint is provided', () => {
      const node = {
         $type: 'Entity',
         id: 'old-id',
         customId: 'new-id',
         name: 'Test',
      } as unknown as AstNode;

      const hint = { keyProp: 'customId' };
      const result = resolveId(node, hint);

      expect(result).toBe('new-id');
   });

   it('should handle empty string as valid id', () => {
      const node = {
         $type: 'Entity',
         id: '',
         name: 'Test',
      } as unknown as AstNode;

      const result = resolveId(node, {});

      // Empty string is falsy, so should fall back to synthesis
      expect(result).toMatch(/^Entity:/);
   });

   it('should handle numeric ids', () => {
      const node = {
         $type: 'Entity',
         id: 42,
         name: 'Test',
      } as unknown as AstNode;

      const result = resolveId(node, {});

      expect(result).toBe('42');
   });
});
