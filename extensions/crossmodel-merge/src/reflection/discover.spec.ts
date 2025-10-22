import { describe, expect, it } from '@jest/globals';
import type { AstNode, AstReflection } from 'langium';
import { discoverProps, isAstNode } from './discover.js';

// Mock AstReflection
const mockReflection: AstReflection = {
   isSubtype(typeA: string, typeB: string): boolean {
      return typeA === typeB;
   },
   getAllTypes(): string[] {
      return ['Entity', 'Attribute'];
   },
   getReferenceType(_refInfo: unknown): string {
      return 'unknown';
   },
   getTypeMetaData(type: string) {
      if (type === 'Entity') {
         return {
            name: 'Entity',
            mandatory: [],
            properties: [
               { name: 'id', type: 'string' },
               { name: 'name', type: 'string' },
               { name: 'description', type: 'string' },
               { name: 'attributes', type: 'Attribute', isArray: true }
            ]
         };
      }
      if (type === 'Attribute') {
         return {
            name: 'Attribute',
            mandatory: [],
            properties: [
               { name: 'id', type: 'string' },
               { name: 'name', type: 'string' },
               { name: 'datatype', type: 'string' }
            ]
         };
      }
      return { name: type, mandatory: [], properties: [] };
   }
} as unknown as AstReflection;

describe('isAstNode', () => {
   it('should return true for objects with $type property', () => {
      const node = { $type: 'Entity', id: 'test' };
      expect(isAstNode(node)).toBe(true);
   });

   it('should return false for null', () => {
      expect(isAstNode(null)).toBe(false);
   });

   it('should return false for undefined', () => {
      expect(isAstNode(undefined)).toBe(false);
   });

   it('should return false for primitives', () => {
      expect(isAstNode('string')).toBe(false);
      expect(isAstNode(42)).toBe(false);
      expect(isAstNode(true)).toBe(false);
   });

   it('should return false for objects without $type', () => {
      expect(isAstNode({ id: 'test', name: 'foo' })).toBe(false);
   });

   it('should return false for arrays', () => {
      expect(isAstNode([1, 2, 3])).toBe(false);
   });
});

describe('discoverProps', () => {
   it('should separate scalars from child nodes', () => {
      const node = {
         $type: 'Entity',
         id: 'customer',
         name: 'Customer',
         description: 'A customer entity',
         attributes: [{ $type: 'Attribute', id: 'age', name: 'age', datatype: 'int' }]
      } as unknown as AstNode;

      const result = discoverProps(node, mockReflection, {});

      expect(Array.from(result.scalars.keys())).toEqual(['id', 'name', 'description']);
      expect(Array.from(result.singletons.keys())).toEqual([]);
      expect(Array.from(result.arrays.keys())).toEqual(['attributes']);
   });

   it('should filter out properties starting with $', () => {
      const node = {
         $type: 'Entity',
         $container: {},
         $cstNode: {},
         id: 'test',
         name: 'Test'
      } as unknown as AstNode;

      const result = discoverProps(node, mockReflection, {});

      expect(Array.from(result.scalars.keys())).toEqual(['id', 'name']);
      expect(Array.from(result.scalars.keys())).not.toContain('$container');
      expect(Array.from(result.scalars.keys())).not.toContain('$cstNode');
   });

   it('should identify singleton child nodes', () => {
      const node = {
         $type: 'Entity',
         id: 'test',
         owner: { $type: 'User', id: 'user1' }
      } as unknown as AstNode;

      const result = discoverProps(node, mockReflection, {});

      expect(Array.from(result.singletons.keys())).toEqual(['owner']);
      expect(Array.from(result.scalars.keys())).toEqual(['id']);
   });

   it('should identify array child nodes', () => {
      const node = {
         $type: 'Entity',
         id: 'test',
         attributes: [
            { $type: 'Attribute', id: 'attr1' },
            { $type: 'Attribute', id: 'attr2' }
         ]
      } as unknown as AstNode;

      const result = discoverProps(node, mockReflection, {});

      expect(Array.from(result.arrays.keys())).toEqual(['attributes']);
      expect(Array.from(result.scalars.keys())).toEqual(['id']);
   });

   it('should handle empty arrays as arrays not scalars', () => {
      const node = {
         $type: 'Entity',
         id: 'test',
         attributes: []
      } as unknown as AstNode;

      const result = discoverProps(node, mockReflection, {});

      expect(Array.from(result.arrays.keys())).toEqual(['attributes']);
      expect(Array.from(result.scalars.keys())).toEqual(['id']);
   });

   it('should hide properties specified in hints', () => {
      const node = {
         $type: 'Entity',
         id: 'test',
         name: 'Test',
         internal: 'hidden'
      } as unknown as AstNode;

      const hints = {
         Entity: { hiddenProps: ['internal'] }
      };

      const result = discoverProps(node, mockReflection, hints);

      expect(Array.from(result.scalars.keys())).toEqual(['id', 'name']);
      expect(Array.from(result.scalars.keys())).not.toContain('internal');
   });

   it('should handle null and undefined properties', () => {
      const node = {
         $type: 'Entity',
         id: 'test',
         name: null,
         description: undefined
      } as unknown as AstNode;

      const result = discoverProps(node, mockReflection, {});

      const scalarKeys = Array.from(result.scalars.keys());
      expect(scalarKeys).toContain('id');
      expect(scalarKeys).toContain('name');
      expect(scalarKeys).toContain('description');
   });

   it('should handle mixed property types', () => {
      const node = {
         $type: 'Entity',
         id: 'test',
         name: 'Test',
         count: 42,
         active: true,
         owner: { $type: 'User', id: 'user1' },
         attributes: [{ $type: 'Attribute', id: 'attr1' }]
      } as unknown as AstNode;

      const result = discoverProps(node, mockReflection, {});

      expect(Array.from(result.scalars.keys())).toEqual(['id', 'name', 'count', 'active']);
      expect(Array.from(result.singletons.keys())).toEqual(['owner']);
      expect(Array.from(result.arrays.keys())).toEqual(['attributes']);
   });
});
