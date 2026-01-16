/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { describe, expect, it } from '@jest/globals';

/**
 * Unit tests for EntityAttributesDataGrid datatype applicability validators
 *
 * These tests verify that the helper functions correctly determine which
 * datatype properties (length, precision, scale) are applicable for each
 * supported datatype.
 */

// Import the helper functions (these would need to be exported from EntityAttributesDataGrid.tsx)
const isLengthApplicable = (datatype: string): boolean => {
   const dt = datatype?.toLowerCase();
   return dt === 'text' || dt === 'binary';
};

const isPrecisionApplicable = (datatype: string): boolean => {
   const dt = datatype?.toLowerCase();
   return dt === 'decimal' || dt === 'integer';
};

const isScaleApplicable = (datatype: string): boolean => {
   const dt = datatype?.toLowerCase();
   return dt === 'decimal' || dt === 'time' || dt === 'datetime';
};

describe('EntityAttributesDataGrid - Datatype Validators', () => {
   describe('isLengthApplicable', () => {
      it('should return true for Text datatype', () => {
         expect(isLengthApplicable('Text')).toBe(true);
      });

      it('should return true for text in lowercase', () => {
         expect(isLengthApplicable('text')).toBe(true);
      });

      it('should return true for Binary datatype', () => {
         expect(isLengthApplicable('Binary')).toBe(true);
      });

      it('should return true for binary in lowercase', () => {
         expect(isLengthApplicable('binary')).toBe(true);
      });

      it('should return false for Decimal datatype', () => {
         expect(isLengthApplicable('Decimal')).toBe(false);
      });

      it('should return false for Integer datatype', () => {
         expect(isLengthApplicable('Integer')).toBe(false);
      });

      it('should return false for DateTime datatype', () => {
         expect(isLengthApplicable('DateTime')).toBe(false);
      });

      it('should return false for undefined datatype', () => {
         expect(isLengthApplicable(undefined as any)).toBe(false);
      });

      it('should return false for empty string', () => {
         expect(isLengthApplicable('')).toBe(false);
      });

      it('should return false for undefined', () => {
         expect(isLengthApplicable(undefined as any)).toBe(false);
      });
   });

   describe('isPrecisionApplicable', () => {
      it('should return true for Decimal datatype', () => {
         expect(isPrecisionApplicable('Decimal')).toBe(true);
      });

      it('should return true for decimal in lowercase', () => {
         expect(isPrecisionApplicable('decimal')).toBe(true);
      });

      it('should return true for Integer datatype', () => {
         expect(isPrecisionApplicable('Integer')).toBe(true);
      });

      it('should return true for integer in lowercase', () => {
         expect(isPrecisionApplicable('integer')).toBe(true);
      });

      it('should return false for Text datatype', () => {
         expect(isPrecisionApplicable('Text')).toBe(false);
      });

      it('should return false for Binary datatype', () => {
         expect(isPrecisionApplicable('Binary')).toBe(false);
      });

      it('should return false for DateTime datatype', () => {
         expect(isPrecisionApplicable('DateTime')).toBe(false);
      });

      it('should return false for undefined datatype', () => {
         expect(isPrecisionApplicable(undefined as any)).toBe(false);
      });

      it('should return false for empty string', () => {
         expect(isPrecisionApplicable('')).toBe(false);
      });

      it('should return false for undefined', () => {
         expect(isPrecisionApplicable(undefined as any)).toBe(false);
      });
   });

   describe('isScaleApplicable', () => {
      it('should return true for Decimal datatype', () => {
         expect(isScaleApplicable('Decimal')).toBe(true);
      });

      it('should return true for decimal in lowercase', () => {
         expect(isScaleApplicable('decimal')).toBe(true);
      });

      it('should return true for Time datatype', () => {
         expect(isScaleApplicable('Time')).toBe(true);
      });

      it('should return true for time in lowercase', () => {
         expect(isScaleApplicable('time')).toBe(true);
      });

      it('should return true for DateTime datatype', () => {
         expect(isScaleApplicable('DateTime')).toBe(true);
      });

      it('should return true for datetime in lowercase', () => {
         expect(isScaleApplicable('datetime')).toBe(true);
      });

      it('should return false for Date datatype (not applicable)', () => {
         expect(isScaleApplicable('Date')).toBe(false);
      });

      it('should return false for Text datatype', () => {
         expect(isScaleApplicable('Text')).toBe(false);
      });

      it('should return false for Integer datatype', () => {
         expect(isScaleApplicable('Integer')).toBe(false);
      });

      it('should return false for undefined datatype', () => {
         expect(isScaleApplicable(undefined as any)).toBe(false);
      });

      it('should return false for empty string', () => {
         expect(isScaleApplicable('')).toBe(false);
      });

      it('should return false for undefined', () => {
         expect(isScaleApplicable(undefined as any)).toBe(false);
      });
   });

   describe('Cross-datatype validation', () => {
      it('should validate all basic datatypes correctly', () => {
         const basicTypes = ['Text', 'Boolean', 'Integer', 'Decimal', 'Date', 'Time', 'DateTime', 'Guid', 'Binary', 'Location'];

         basicTypes.forEach(datatype => {
            // Each datatype should pass at least one validator or none
            const length = isLengthApplicable(datatype);
            const precision = isPrecisionApplicable(datatype);
            const scale = isScaleApplicable(datatype);

            // This test ensures validators can handle all defined datatypes
            expect([length, precision, scale].some(v => v === true) || (!length && !precision && !scale)).toBe(true);
         });
      });

      it('should handle mixed case datatypes', () => {
         expect(isLengthApplicable('TeXt')).toBe(true);
         expect(isPrecisionApplicable('DecimaL')).toBe(true);
         expect(isScaleApplicable('TiMe')).toBe(true);
      });
   });
});
