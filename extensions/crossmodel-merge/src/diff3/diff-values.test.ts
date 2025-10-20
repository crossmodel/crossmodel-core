/**
 * Unit tests for scalar value diffing.
 */

import { describe, it, expect } from '@jest/globals';
import { diffScalarProps, hasConflicts } from './diff-values.js';

describe('diffScalarProps', () => {
   it('should detect no changes when all versions are identical', () => {
      const base = { name: 'Customer', age: 25 };
      const ours = { name: 'Customer', age: 25 };
      const theirs = { name: 'Customer', age: 25 };
      const deltas = diffScalarProps(base, ours, theirs, new Set());
      expect(Object.keys(deltas)).toHaveLength(0);
   });

   it('should detect ours-only changes', () => {
      const base = { name: 'Customer', age: 25 };
      const ours = { name: 'Customer', age: 30 };
      const theirs = { name: 'Customer', age: 25 };
      const deltas = diffScalarProps(base, ours, theirs, new Set());
      expect(deltas.age).toEqual({ base: 25, ours: 30, theirs: 25 });
      expect(hasConflicts(deltas)).toBe(false);
   });

   it('should detect theirs-only changes', () => {
      const base = { name: 'Customer', description: 'Original' };
      const ours = { name: 'Customer', description: 'Original' };
      const theirs = { name: 'Customer', description: 'Updated' };
      const deltas = diffScalarProps(base, ours, theirs, new Set());
      expect(deltas.description).toEqual({ base: 'Original', ours: 'Original', theirs: 'Updated' });
      expect(hasConflicts(deltas)).toBe(false);
   });

   it('should detect conflicts when both sides change the same property differently', () => {
      const base = { name: 'Customer', status: 'draft' };
      const ours = { name: 'Customer', status: 'active' };
      const theirs = { name: 'Customer', status: 'pending' };
      const deltas = diffScalarProps(base, ours, theirs, new Set());
      expect(deltas.status).toEqual({ base: 'draft', ours: 'active', theirs: 'pending' });
      expect(hasConflicts(deltas)).toBe(true);
   });

   it('should not conflict when both sides make the same change', () => {
      const base = { name: 'Customer', version: '1.0' };
      const ours = { name: 'Customer', version: '2.0' };
      const theirs = { name: 'Customer', version: '2.0' };
      const deltas = diffScalarProps(base, ours, theirs, new Set());
      // When both sides change to the same value, it's not a conflict
      expect(Object.keys(deltas)).toHaveLength(0);
   });

   it('should ignore properties in the hidden set', () => {
      const base = { name: 'Customer', $type: 'Entity', id: '123' };
      const ours = { name: 'UpdatedCustomer', $type: 'Entity', id: '123' };
      const theirs = { name: 'Customer', $type: 'Entity', id: '456' };
      const hidden = new Set(['$type', 'id']);
      const deltas = diffScalarProps(base, ours, theirs, hidden);
      expect(deltas.name).toBeDefined();
      expect(deltas.$type).toBeUndefined();
      expect(deltas.id).toBeUndefined();
   });

   it('should handle properties added in ours or theirs', () => {
      const base = { name: 'Customer' };
      const ours = { name: 'Customer', description: 'Added in ours' };
      const theirs = { name: 'Customer', tags: ['new'] };
      const deltas = diffScalarProps(base, ours, theirs, new Set());
      expect(deltas.description).toEqual({ base: undefined, ours: 'Added in ours', theirs: undefined });
      expect(deltas.tags).toBeDefined();
   });

   it('should handle properties removed in ours or theirs', () => {
      const base = { name: 'Customer', deprecated: true };
      const ours = { name: 'Customer' }; // removed deprecated
      const theirs = { name: 'Customer', deprecated: true };
      const deltas = diffScalarProps(base, ours, theirs, new Set());
      expect(deltas.deprecated).toEqual({ base: true, ours: undefined, theirs: true });
   });
});

describe('hasConflicts', () => {
   it('should return false for empty deltas', () => {
      expect(hasConflicts({})).toBe(false);
   });

   it('should return false when only one side changes', () => {
      const deltas = {
         prop1: { base: 'a', ours: 'b', theirs: 'a' }
      };
      expect(hasConflicts(deltas)).toBe(false);
   });

   it('should return true when both sides change differently', () => {
      const deltas = {
         prop1: { base: 'a', ours: 'b', theirs: 'c' }
      };
      expect(hasConflicts(deltas)).toBe(true);
   });

   it('should return true if any property conflicts', () => {
      const deltas = {
         prop1: { base: 'a', ours: 'b', theirs: 'a' }, // no conflict
         prop2: { base: 'x', ours: 'y', theirs: 'z' }  // conflict
      };
      expect(hasConflicts(deltas)).toBe(true);
   });
});
