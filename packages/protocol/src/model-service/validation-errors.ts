/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

export namespace CrossModelValidationErrors {
   export const FilenameNotMatching = 'filename-not-matching';

   export const toMissing = (field: string): string => `missing-${field}`;
   export const toMalformed = (field: string): string => `malformed-${field}`;
   export const isMissing = (code?: string | number): string | false =>
      typeof code === 'string' && code.startsWith('missing-') && code.slice(8);
   export const isMalformed = (code?: string | number): string | false =>
      typeof code === 'string' && code.startsWith('malformed-') && code.slice(10);
}
