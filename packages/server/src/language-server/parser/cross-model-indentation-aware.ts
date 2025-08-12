/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
/* eslint-disable no-null/no-null */

import { createTokenInstance, IToken, TokenType } from 'chevrotain';
import { IndentationAwareTokenBuilder } from 'langium';
import { CrossModelTerminals } from '../generated/ast.js';

export class CrossModelTokenBuilder extends IndentationAwareTokenBuilder {
   protected readonly listItemRegExp = new RegExp(CrossModelTerminals.LIST_ITEM.source, CrossModelTerminals.LIST_ITEM.flags + 'y');

   protected _isFlushing = false;

   protected override matchWhitespace(
      text: string,
      offset: number,
      tokens: IToken[],
      groups: Record<string, IToken[]>
   ): { currIndentLevel: number; prevIndentLevel: number; match: RegExpExecArray | null } {
      const match = super.matchWhitespace(text, offset, tokens, groups);
      if (!match.match) {
         return match;
      }
      // list items should be part of the indentation so we try to match them after the general whitespace characters
      // this ensures that the next line must be indented to match the character after the list item marker as is common in YAML.
      this.listItemRegExp.lastIndex = offset + match.currIndentLevel;
      const listItemMatch = this.listItemRegExp.exec(text);
      if (listItemMatch !== null) {
         // we have a list item so we extend the indentation level by the marker
         match.currIndentLevel += listItemMatch[0].length;
      }
      return match;
   }

   override flushRemainingDedents(text: string): IToken[] {
      this._isFlushing = true;
      try {
         return super.flushRemainingDedents(text);
      } finally {
         this._isFlushing = false;
      }
   }

   protected override createIndentationTokenInstance(tokenType: TokenType, text: string, image: string, offset: number): IToken {
      if (!this._isFlushing) {
         return super.createIndentationTokenInstance(tokenType, text, image, offset);
      }
      // Bug in Langium:
      // Dedentation tokens are created at the beginning of the last line which might not be empty.
      // We always want to create dedentations at the end of the text when flushing
      const lastPosition = this.getPositionAfterText(text, offset);
      return createTokenInstance(
         tokenType,
         image,
         offset,
         offset + image.length,
         lastPosition.line,
         lastPosition.line,
         lastPosition.column,
         lastPosition.column + image.length
      );
   }

   protected getLines(text: string, offset: number): string[] {
      return text.substring(0, offset).split(/\r\n|\r|\n/);
   }

   protected getPositionAfterText(text: string, offset: number): { line: number; column: number } {
      const lines = this.getLines(text, offset);
      return { line: lines.length, column: lines[lines.length - 1].length + 1 };
   }
}
