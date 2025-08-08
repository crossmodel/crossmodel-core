/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { AstNode } from 'langium';
import { AbstractFormatter } from 'langium/lsp';

export class CrossModelModelFormatter extends AbstractFormatter {
   protected format(node: AstNode): void {
      return;
   }
}
