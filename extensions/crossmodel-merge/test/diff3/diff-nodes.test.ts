/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { describe, expect, test } from '@jest/globals';
import type { AstNode, AstReflection } from 'langium';
import { URI } from 'vscode-uri';
import { diff3Node } from '../../src/diff3/diff-nodes.js';

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
               { name: 'description', type: 'string' }
            ]
         };
      }
      return { name: type, mandatory: [], properties: [] };
   }
} as unknown as AstReflection;

const mockUri = URI.file('/test/file.cm');
const hints = {};

describe('diff3Node - 2-way diff scenarios', () => {
   test('unchanged file: base=HEAD, ours=working(same), theirs=HEAD should return undefined', () => {
      const headNode: AstNode = {
         $type: 'Entity',
         id: 'Customer',
         name: 'Customer',
         description: 'A customer entity'
      } as AstNode;

      const workingNode: AstNode = {
         $type: 'Entity',
         id: 'Customer',
         name: 'Customer',
         description: 'A customer entity'
      } as AstNode;

      // 2-way diff: base=HEAD, ours=working, theirs=HEAD
      const result = diff3Node(headNode, workingNode, headNode, mockUri, mockReflection, hints);

      // Should return undefined because nothing changed
      expect(result).toBeUndefined();
   });

   test('modified file: base=HEAD, ours=working(modified), theirs=HEAD should return update', () => {
      const headNode: AstNode = {
         $type: 'Entity',
         id: 'Customer',
         name: 'Customer',
         description: 'A customer entity'
      } as AstNode;

      const workingNode: AstNode = {
         $type: 'Entity',
         id: 'Customer',
         name: 'Customer',
         description: 'An updated customer entity'
      } as AstNode;

      // 2-way diff: base=HEAD, ours=working(modified), theirs=HEAD
      const result = diff3Node(headNode, workingNode, headNode, mockUri, mockReflection, hints);

      // Should return update change
      expect(result).toBeDefined();
      expect(result?.kind).toBe('update');
      expect(result?.details).toBeDefined();
      expect(result?.details?.description).toBeDefined();
      expect(result?.details?.description.ours).toBe('An updated customer entity');
      expect(result?.details?.description.theirs).toBe('A customer entity');
   });

   test('new file: base=undefined, ours=working, theirs=undefined should return add', () => {
      const workingNode: AstNode = {
         $type: 'Entity',
         id: 'NewEntity',
         name: 'NewEntity',
         description: 'A new entity'
      } as AstNode;

      // 2-way diff: new file not in HEAD
      const result = diff3Node(undefined, workingNode, undefined, mockUri, mockReflection, hints);

      // Should return add change
      expect(result).toBeDefined();
      expect(result?.kind).toBe('add');
      expect(result?.label).toBe('NewEntity');
   });

   test('deleted file: base=HEAD, ours=undefined, theirs=HEAD should return remove', () => {
      const headNode: AstNode = {
         $type: 'Entity',
         id: 'DeletedEntity',
         name: 'DeletedEntity',
         description: 'An entity to be deleted'
      } as AstNode;

      // 2-way diff: file deleted from working tree
      const result = diff3Node(headNode, undefined, headNode, mockUri, mockReflection, hints);

      // Should return remove change
      expect(result).toBeDefined();
      expect(result?.kind).toBe('remove');
      expect(result?.label).toBe('DeletedEntity');
   });
});

describe('diff3Node - issue diagnosis', () => {
   test('WRONG PARAMS: base=HEAD, ours=HEAD, theirs=working returns undefined (both sides same)', () => {
      const headNode: AstNode = {
         $type: 'Entity',
         id: 'Customer',
         name: 'Customer',
         description: 'A customer entity'
      } as AstNode;

      const workingNode: AstNode = {
         $type: 'Entity',
         id: 'Customer',
         name: 'Customer',
         description: 'A customer entity'
      } as AstNode;

      // WRONG: This is the OLD incorrect parameter order
      // When base and ours are identical (both HEAD), and theirs is working (also identical),
      // the algorithm correctly returns undefined (no change)
      const result = diff3Node(headNode, headNode, workingNode, mockUri, mockReflection, hints);

      // Returns undefined because there's no difference
      // This documents that the OLD parameter order was confusing but not necessarily causing the bug
      expect(result).toBeUndefined();
   });

   test('file exists in working tree but base is parsed as undefined', () => {
      const workingNode: AstNode = {
         $type: 'Entity',
         id: 'Customer',
         name: 'Customer',
         description: 'A customer entity'
      } as AstNode;

      // If HEAD parsing fails but file exists in working tree
      // base=undefined, ours=working, theirs=undefined
      const result = diff3Node(undefined, workingNode, undefined, mockUri, mockReflection, hints);

      // This would show as "add" even if file hasn't actually changed
      expect(result).toBeDefined();
      expect(result?.kind).toBe('add');
      console.log('⚠️  If HEAD parse fails, file shows as "add" even if unchanged');
   });
});

describe('diff3Node - label generation', () => {
   test('label uses id property when available', () => {
      const node: AstNode = {
         $type: 'Entity',
         id: 'Customer',
         name: 'Customer Entity',
         description: 'A customer'
      } as AstNode;

      const result = diff3Node(undefined, node, undefined, mockUri, mockReflection, hints);

      expect(result).toBeDefined();
      expect(result?.label).toBe('Customer');
   });

   test('label uses first property reference text when id is missing', () => {
      const node: AstNode = {
         $type: 'AttributeMappingSource',
         value: {
            $refText: 'Customer.First_Name'
         },
         someOtherProperty: 'value'
      } as AstNode;

      const result = diff3Node(undefined, node, undefined, mockUri, mockReflection, hints);

      expect(result).toBeDefined();
      expect(result?.label).toBe('Customer.First_Name');
   });

   test('label uses $refText for Target with entity reference', () => {
      const node: AstNode = {
         $type: 'Target',
         entity: {
            $refText: 'CompleteCustomer'
         }
      } as AstNode;

      const result = diff3Node(undefined, node, undefined, mockUri, mockReflection, hints);

      expect(result).toBeDefined();
      expect(result?.label).toBe('CompleteCustomer');
   });

   test('label uses $refText for AttributeMapping with attribute reference', () => {
      const node: AstNode = {
         $type: 'AttributeMapping',
         attribute: {
            $refText: 'Name'
         }
      } as AstNode;

      const result = diff3Node(undefined, node, undefined, mockUri, mockReflection, hints);

      expect(result).toBeDefined();
      expect(result?.label).toBe('Name');
   });

   test('label falls back to type name when id and reference are missing', () => {
      const node: AstNode = {
         $type: 'SomeType',
         someProperty: 'value',
         anotherProperty: 123
      } as AstNode;

      const result = diff3Node(undefined, node, undefined, mockUri, mockReflection, hints);

      expect(result).toBeDefined();
      expect(result?.label).toBe('SomeType');
   });

   test('label uses id even if first property is a reference', () => {
      const node: AstNode = {
         $type: 'Mapping',
         id: 'CustomerMapping',
         source: {
            $refText: 'SourceEntity'
         }
      } as AstNode;

      const result = diff3Node(undefined, node, undefined, mockUri, mockReflection, hints);

      expect(result).toBeDefined();
      expect(result?.label).toBe('CustomerMapping');
   });

   test('label ignores $-prefixed properties when finding first property', () => {
      const node: AstNode = {
         $type: 'Target',
         $container: {} as AstNode,
         $document: {} as any,
         entity: {
            $refText: 'TargetEntity'
         }
      } as AstNode;

      const result = diff3Node(undefined, node, undefined, mockUri, mockReflection, hints);

      expect(result).toBeDefined();
      expect(result?.label).toBe('TargetEntity');
   });

   test('label works for update changes', () => {
      const baseNode: AstNode = {
         $type: 'Entity',
         id: 'Customer',
         description: 'Old description'
      } as AstNode;

      const oursNode: AstNode = {
         $type: 'Entity',
         id: 'Customer',
         description: 'New description'
      } as AstNode;

      const result = diff3Node(baseNode, oursNode, baseNode, mockUri, mockReflection, hints);

      expect(result).toBeDefined();
      expect(result?.kind).toBe('update');
      expect(result?.label).toBe('Customer');
   });

   test('label works for remove changes', () => {
      const node: AstNode = {
         $type: 'Entity',
         id: 'DeletedEntity'
      } as AstNode;

      const result = diff3Node(node, undefined, node, mockUri, mockReflection, hints);

      expect(result).toBeDefined();
      expect(result?.kind).toBe('remove');
      expect(result?.label).toBe('DeletedEntity');
   });

   test('label uses first non-reference property as fallback if not a reference', () => {
      const node: AstNode = {
         $type: 'CustomType',
         normalProperty: 'not a reference',
         anotherProperty: 'value'
      } as AstNode;

      const result = diff3Node(undefined, node, undefined, mockUri, mockReflection, hints);

      expect(result).toBeDefined();
      // Should fall back to type name since first property is not a reference
      expect(result?.label).toBe('CustomType');
   });
});
