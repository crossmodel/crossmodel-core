import { describe, it, expect } from '@jest/globals';
import { diffScalarProps, hasConflicts } from './diff-values.js';

describe('diffScalarProps', () => {
   it('should detect no changes when all versions are identical', () => {
      const base = { name: 'test', value: 42 };
      const ours = { name: 'test', value: 42 };
      const theirs = { name: 'test', value: 42 };

      const result = diffScalarProps(base, ours, theirs, new Set());

      expect(result).toEqual({});
   });

   it('should detect update when only ours changed', () => {
      const base = { name: 'test', value: 42 };
      const ours = { name: 'changed', value: 42 };
      const theirs = { name: 'test', value: 42 };

      const result = diffScalarProps(base, ours, theirs, new Set());

      expect(result).toEqual({
         name: { base: 'test', ours: 'changed', theirs: 'test' },
      });
      expect(hasConflicts(result)).toBe(false);
   });

   it('should detect update when only theirs changed', () => {
      const base = { name: 'test', value: 42 };
      const ours = { name: 'test', value: 42 };
      const theirs = { name: 'modified', value: 42 };

      const result = diffScalarProps(base, ours, theirs, new Set());

      expect(result).toEqual({
         name: { base: 'test', ours: 'test', theirs: 'modified' },
      });
      expect(hasConflicts(result)).toBe(false);
   });

   it('should detect conflict when both changed differently', () => {
      const base = { name: 'test', value: 42 };
      const ours = { name: 'changed-ours', value: 42 };
      const theirs = { name: 'changed-theirs', value: 42 };

      const result = diffScalarProps(base, ours, theirs, new Set());

      expect(result).toEqual({
         name: { base: 'test', ours: 'changed-ours', theirs: 'changed-theirs' },
      });
      expect(hasConflicts(result)).toBe(true);
   });

   it('should not detect conflict when both changed to same value', () => {
      const base = { name: 'test', value: 42 };
      const ours = { name: 'same', value: 42 };
      const theirs = { name: 'same', value: 42 };

      const result = diffScalarProps(base, ours, theirs, new Set());

      expect(result).toEqual({});
   });

   it('should handle multiple property changes', () => {
      const base = { name: 'test', value: 42, description: 'old' };
      const ours = { name: 'test', value: 100, description: 'ours' };
      const theirs = { name: 'test', value: 42, description: 'theirs' };

      const result = diffScalarProps(base, ours, theirs, new Set());

      expect(result).toEqual({
         value: { base: 42, ours: 100, theirs: 42 },
         description: { base: 'old', ours: 'ours', theirs: 'theirs' },
      });
      expect(hasConflicts(result)).toBe(true);
   });

   it('should hide properties in hidden set', () => {
      const base = { name: 'test', $type: 'Entity', id: '123' };
      const ours = { name: 'changed', $type: 'Entity', id: '123' };
      const theirs = { name: 'test', $type: 'Entity', id: '123' };

      const hidden = new Set(['$type', 'id']);
      const result = diffScalarProps(base, ours, theirs, hidden);

      expect(result).toEqual({
         name: { base: 'test', ours: 'changed', theirs: 'test' },
      });
   });

   it('should handle added properties', () => {
      const base = { name: 'test' };
      const ours = { name: 'test', description: 'added' };
      const theirs = { name: 'test' };

      const result = diffScalarProps(base, ours, theirs, new Set());

      expect(result).toEqual({
         description: { base: undefined, ours: 'added', theirs: undefined },
      });
   });

   it('should handle removed properties', () => {
      const base = { name: 'test', description: 'old' };
      const ours = { name: 'test' };
      const theirs = { name: 'test', description: 'old' };

      const result = diffScalarProps(base, ours, theirs, new Set());

      expect(result).toEqual({
         description: { base: 'old', ours: undefined, theirs: 'old' },
      });
   });

   it('should handle null and undefined values', () => {
      const base = { value: null };
      const ours = { value: undefined };
      const theirs = { value: null };

      const result = diffScalarProps(base, ours, theirs, new Set());

      expect(result).toEqual({
         value: { base: null, ours: undefined, theirs: null },
      });
   });
});

describe('hasConflicts', () => {
   it('should return false for empty details', () => {
      expect(hasConflicts({})).toBe(false);
   });

   it('should return false when no conflicts exist', () => {
      const details = {
         name: { base: 'test', ours: 'changed', theirs: 'test' },
      };
      expect(hasConflicts(details)).toBe(false);
   });

   it('should return true when conflicts exist', () => {
      const details = {
         name: { base: 'test', ours: 'a', theirs: 'b' },
      };
      expect(hasConflicts(details)).toBe(true);
   });

   it('should return true when any property has conflict', () => {
      const details = {
         name: { base: 'test', ours: 'changed', theirs: 'test' },
         value: { base: 1, ours: 2, theirs: 3 },
      };
      expect(hasConflicts(details)).toBe(true);
   });
});
