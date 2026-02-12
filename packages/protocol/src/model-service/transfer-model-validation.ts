/********************************************************************************
 * Copyright (c) 2026 CrossBreeze.
 ********************************************************************************/
export interface ModelDiagnostic {
   type: 'lexing-error' | 'parsing-error' | 'validation-error';
   element: string;
   property?: string;
   message: string;
   severity: 'error' | 'warning' | 'info';
   code?: number | string;
}

export namespace ModelDiagnostic {
   // should match the separators used in AstNodeLocator on the server side
   export const ELEMENT_SEGMENT_SEPARATOR = '/';
   export const ELEMENT_INDEX_SEPARATOR = '@';
   export const ELEMENT_PROPERTY_SEPARATOR = '^';

   export function isError(diagnostic: ModelDiagnostic): boolean {
      return diagnostic.severity === 'error';
   }

   export function isParseError(diagnostic: ModelDiagnostic): boolean {
      return diagnostic.type === 'parsing-error';
   }

   export function getPath(diagnostic: ModelDiagnostic): string {
      return diagnostic.property ? `${diagnostic.element}${ELEMENT_PROPERTY_SEPARATOR}${diagnostic.property}` : diagnostic.element;
   }

   export function errors(diagnostics: ModelDiagnostic[]): ModelDiagnostic[] {
      return diagnostics.filter(isError);
   }

   export function hasErrors(diagnostics: ModelDiagnostic[]): boolean {
      return diagnostics.some(isError);
   }

   export function hasParseErrors(diagnostics: ModelDiagnostic[]): boolean {
      return diagnostics.some(isParseError);
   }
}

export namespace CrossModelValidationErrors {
   export const FilenameNotMatching = 'filename-not-matching';

   export const toMissing = (field: string): string => `missing-${field}`;
   export const toMalformed = (field: string): string => `malformed-${field}`;
   export const isMissing = (code?: string | number): string | false =>
      typeof code === 'string' && code.startsWith('missing-') && code.slice(8);
   export const isMalformed = (code?: string | number): string | false =>
      typeof code === 'string' && code.startsWith('malformed-') && code.slice(10);
}
