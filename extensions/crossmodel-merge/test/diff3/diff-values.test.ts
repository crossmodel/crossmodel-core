/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { describe, expect, test } from '@jest/globals';
import { diffScalarProps, hasConflicts } from '../../src/diff3/diff-values';

describe('diffScalarProps', () => {
   test('detects no changes when all values are equal', () => {
      const base = { name: 'Customer', description: 'A customer' };
      const ours = { name: 'Customer', description: 'A customer' };
      const theirs = { name: 'Customer', description: 'A customer' };

      const result = diffScalarProps(base, ours, theirs, new Set());

      expect(Object.keys(result)).toHaveLength(0);
   });

   test('detects update in ours only', () => {
      const base = { name: 'Customer', description: 'A customer' };
      const ours = { name: 'Customer', description: 'Updated description' };
      const theirs = { name: 'Customer', description: 'A customer' };

      const result = diffScalarProps(base, ours, theirs, new Set());

      expect(result.description).toEqual({
         base: 'A customer',
         ours: 'Updated description',
         theirs: 'A customer'
      });
      expect(hasConflicts(result)).toBe(false);
   });

   test('detects update in theirs only', () => {
      const base = { name: 'Customer', description: 'A customer' };
      const ours = { name: 'Customer', description: 'A customer' };
      const theirs = { name: 'Customer', description: 'Modified description' };

      const result = diffScalarProps(base, ours, theirs, new Set());

      expect(result.description).toEqual({
         base: 'A customer',
         ours: 'A customer',
         theirs: 'Modified description'
      });
      expect(hasConflicts(result)).toBe(false);
   });

   test('detects conflict when both sides change the same property differently', () => {
      const base = { name: 'Customer', description: 'A customer' };
      const ours = { name: 'Customer', description: 'Our description' };
      const theirs = { name: 'Customer', description: 'Their description' };

      const result = diffScalarProps(base, ours, theirs, new Set());

      expect(result.description).toEqual({
         base: 'A customer',
         ours: 'Our description',
         theirs: 'Their description'
      });
      expect(hasConflicts(result)).toBe(true);
   });

   test('detects non-conflict when both sides make the same change', () => {
      const base = { name: 'Customer', description: 'A customer' };
      const ours = { name: 'Customer', description: 'Same new description' };
      const theirs = { name: 'Customer', description: 'Same new description' };

      const result = diffScalarProps(base, ours, theirs, new Set());

      expect(Object.keys(result)).toHaveLength(0);
   });

   test('detects addition of new property', () => {
      const base = { name: 'Customer' };
      const ours = { name: 'Customer' };
      const theirs = { name: 'Customer', description: 'New description' };

      const result = diffScalarProps(base, ours, theirs, new Set());

      expect(result.description).toEqual({
         base: undefined,
         ours: undefined,
         theirs: 'New description'
      });
      expect(hasConflicts(result)).toBe(false);
   });

   test('detects removal of property', () => {
      const base = { name: 'Customer', description: 'A customer' };
      const ours = { name: 'Customer', description: 'A customer' };
      const theirs = { name: 'Customer' };

      const result = diffScalarProps(base, ours, theirs, new Set());

      expect(result.description).toEqual({
         base: 'A customer',
         ours: 'A customer',
         theirs: undefined
      });
      expect(hasConflicts(result)).toBe(false);
   });

   test('ignores hidden properties', () => {
      const base = { name: 'Customer', $type: 'LogicalEntity', description: 'A customer' };
      const ours = { name: 'Customer', $type: 'LogicalEntity', description: 'Updated' };
      const theirs = { name: 'Customer', $type: 'LogicalEntity', description: 'A customer' };

      const result = diffScalarProps(base, ours, theirs, new Set(['$type']));

      expect(result.$type).toBeUndefined();
      expect(result.description).toBeDefined();
   });

   test('handles multiple property changes', () => {
      const base = { name: 'Customer', description: 'A customer', active: true };
      const ours = { name: 'Customer', description: 'Updated description', active: false };
      const theirs = { name: 'Client', description: 'A customer', active: true };

      const result = diffScalarProps(base, ours, theirs, new Set());

      expect(Object.keys(result)).toHaveLength(3);
      expect(result.name).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.active).toBeDefined();
   });

   test('detects conflict with null values', () => {
      const base = { name: 'Customer', description: null };
      const ours = { name: 'Customer', description: 'Ours' };
      const theirs = { name: 'Customer', description: 'Theirs' };

      const result = diffScalarProps(base, ours, theirs, new Set());

      expect(hasConflicts(result)).toBe(true);
   });
});

describe('hasConflicts', () => {
   test('returns false for empty details', () => {
      expect(hasConflicts({})).toBe(false);
   });

   test('returns false when no conflicts exist', () => {
      const details = {
         prop1: { base: 'a', ours: 'b', theirs: 'a' },
         prop2: { base: 'x', ours: 'x', theirs: 'y' }
      };
      expect(hasConflicts(details)).toBe(false);
   });

   test('returns true when a conflict exists', () => {
      const details = {
         prop1: { base: 'a', ours: 'b', theirs: 'c' }
      };
      expect(hasConflicts(details)).toBe(true);
   });

   test('returns false when both sides made the same change', () => {
      const details = {
         prop1: { base: 'a', ours: 'b', theirs: 'b' }
      };
      expect(hasConflicts(details)).toBe(false);
   });

   test('handles undefined base value', () => {
      const details = {
         prop1: { base: undefined, ours: 'a', theirs: 'b' }
      };
      expect(hasConflicts(details)).toBe(true);
   });
});
