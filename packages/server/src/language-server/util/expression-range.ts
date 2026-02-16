/********************************************************************************
 * Copyright (c) 2026 CrossBreeze.
 ********************************************************************************/
import { getExpression, getExpressionPosition } from '@crossmodel/protocol';
import type { Range } from 'vscode-languageserver-protocol';
import type { AttributeMappingExpression } from '../ast.js';
import { findDocument } from './ast-util.js';

/**
 * Compute a document Range for a specific reference match (e.g., {{ref}})
 * within an AttributeMappingExpression.expression string.
 * Returns undefined if offsets cannot be determined reliably.
 */
export function getAttributeMappingExpressionRefRange(
   expr: AttributeMappingExpression,
   expressionMatch: RegExpMatchArray
): Range | undefined {
   const doc = findDocument(expr);
   const text = doc?.textDocument.getText();
   const cst = expr.$cstNode as any;
   if (!doc || !text || !cst || typeof cst.offset !== 'number') {
      return undefined;
   }

   const startOffset: number = cst.offset;
   const segment = text.substring(startOffset);

   const keywordMatch = /expression\s*:\s*/.exec(segment);
   if (!keywordMatch) {
      return undefined;
   }

   const firstQuoteRel = segment.indexOf('"', keywordMatch.index);
   if (firstQuoteRel < 0) {
      return undefined;
   }

   const contentStartAbs = startOffset + firstQuoteRel + 1;
   const completeExpression = getExpression(expressionMatch);
   const relativePos = getExpressionPosition(expressionMatch);
   const invalidStartAbs = contentStartAbs + relativePos;
   const invalidEndAbs = invalidStartAbs + completeExpression.length;

   return {
      start: doc.textDocument.positionAt(invalidStartAbs),
      end: doc.textDocument.positionAt(invalidEndAbs)
   };
}
