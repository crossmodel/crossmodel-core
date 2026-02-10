/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { CrossModelRegex, IdentifiedObject } from './model-service/protocol';

/** created from the CrossModelKeywordNames in the generated ast.ts. */
export const RESERVED_KEYWORDS = [
   '!=',
   '.',
   '0..1',
   '0..N',
   '1..1',
   '1..N',
   ':',
   '<',
   '<=',
   '=',
   '>',
   '>=',
   'TRUE',
   'apply',
   'attribute',
   'attributes',
   'baseNode',
   'backgroundColor',
   'borderColor',
   'borderStyle',
   'borderWeight',
   'child',
   'childCardinality',
   'childRole',
   'conceptual',
   'conditions',
   'crossmodel',
   'cross-join',
   'customProperties',
   'datamodel',
   'datatype',
   'dependencies',
   'description',
   'diagram',
   'edges',
   'entity',
   'expression',
   'expressions',
   'from',
   'height',
   'id',
   'identifiers',
   'inherits',
   'inner-join',
   'join',
   'language',
   'left-join',
   'length',
   'logical',
   'mandatory',
   'mapping',
   'mappings',
   'name',
   'nodes',
   'fontColor',
   'parent',
   'parentCardinality',
   'parentRole',
   'precision',
   'primary',
   'relational',
   'relationship',
   'scale',
   'sourceNode',
   'sources',
   'superNode',
   'systemDiagram',
   'target',
   'targetNode',
   'true',
   'type',
   'value',
   'version',
   'width',
   'x',
   'y'
];

export function quote(text: string, quoteChar = '"', replaceChar = "'"): string {
   if (text.length === 0) {
      return quoteChar + quoteChar;
   }
   let quoted = text;
   if (!quoted.startsWith(quoteChar)) {
      quoted = quoteChar + quoted;
   }
   if (!quoted.endsWith(quoteChar)) {
      quoted += quoteChar;
   }
   // escape any occurrence of quote char within the quoted text
   return (
      quoteChar +
      quoted
         .substring(1, quoted.length - 1)
         .split(quoteChar)
         .join(replaceChar) +
      quoteChar
   );
}

export function unquote(text: string, quoteChar = '"'): string {
   const start = text.startsWith(quoteChar) ? 1 : undefined;
   const end = text.endsWith(quoteChar) ? -1 : undefined;
   return text.slice(start, end);
}

export function toPascal(input: string): string {
   return input.charAt(0).toLocaleUpperCase() + input.slice(1);
}

export const ID_ESCAPE_CHAR = '^'; // needs to match the character used in Langium ValueConverter for IDs

export function toId(text: string): string {
   let id = text;
   // remove diacritics for nicer conversion (e.g., ä to a) and then replace all non-matching characters with '_'
   id = convertId(id)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w_\-~$#@/\d]/g, '_');
   // escape reserved keywords
   if (RESERVED_KEYWORDS.includes(id)) {
      id = ID_ESCAPE_CHAR + id;
   }
   if (CrossModelRegex.ID.test(id)) {
      return id;
   }
   // prefix with '_' if necessary
   return '_' + id;
}

export function toIdReference(text: string): string {
   return text.split('.').map(toId).join('.');
}

export function convertId(input: string): string {
   return input.charAt(0) === ID_ESCAPE_CHAR ? input.substring(1) : input;
}

export function codiconCSSString(icon: string): string {
   return `codicon codicon-${icon}`;
}

export function identity<T>(value: T): T {
   return value;
}

export function identifier<T extends IdentifiedObject>(value: T): string {
   return value.id;
}

export function findNextUnique<T>(suggestion: string, existing: T[], nameGetter: (element: T) => string): string {
   const names = existing.map(nameGetter);
   let name = suggestion;
   let index = 1;
   while (names.includes(name)) {
      name = suggestion + index++;
   }
   return name;
}

/** taken from the generated ast.ts. */
export const ID_REGEX = /\^?[_a-zA-Z][\w_\-~$#@/\d]*$/;
export const NPM_PACKAGE_NAME_REGEX = /^(?:(?:@(?:[a-z0-9-*~][a-z0-9-*._~]*)?\/[a-z0-9-._~])|[a-z0-9-~])[a-z0-9-._~]*$/;

export function packageNameToId(input: string): string {
   const unscoped = input.split('/').at(-1)!;
   return unscoped.split(/[~.-]/).map(toPascal).join('');
}

export function computeRelationshipName(parentName: string | undefined | null, childName: string | undefined | null): string {
   return `${parentName || '<Parent>'} to ${childName || '<Child>'}`;
}

export function unreachable(input: never): never {
   throw new Error('Value detected in unreachable assertion: ' + `${input}`);
}
