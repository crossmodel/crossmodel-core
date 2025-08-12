/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { quote, toIdReference } from '@crossmodel/protocol';
import { AstNodeDescription, AstUtils, GrammarAST, GrammarUtils, MaybePromise, ReferenceInfo, Stream } from 'langium';
import { CompletionAcceptor, CompletionContext, CompletionValueItem, DefaultCompletionProvider, NextFeature } from 'langium/lsp';
import { v4 as uuid } from 'uuid';
import { CompletionItemKind, InsertTextFormat, TextEdit } from 'vscode-languageserver-protocol';
import type { Range } from 'vscode-languageserver-types';
import { CrossModelServices } from './cross-model-module.js';
import { CrossModelScopeProvider } from './cross-model-scope-provider.js';
import { AttributeMapping, isAttributeMapping, RelationshipAttribute } from './generated/ast.js';
import { fixDocument } from './util/ast-util.js';

/**
 * Custom completion provider that only shows the short options to the user if a longer, fully-qualified version is also available.
 */
export class CrossModelCompletionProvider extends DefaultCompletionProvider {
   protected packageId?: string;

   override readonly completionOptions = {
      triggerCharacters: ['\n', ' ', '{']
   };

   declare protected readonly scopeProvider: CrossModelScopeProvider;

   constructor(
      protected services: CrossModelServices,
      protected dataModelManager = services.shared.workspace.DataModelManager
   ) {
      super(services);
   }

   protected override completionFor(
      context: CompletionContext,
      next: NextFeature<GrammarAST.AbstractElement>,
      acceptor: CompletionAcceptor
   ): MaybePromise<void> {
      this.fixCompletionNode(context);
      const assignment = AstUtils.getContainerOfType(next.feature, GrammarAST.isAssignment);
      if (!GrammarAST.isCrossReference(next.feature) && assignment) {
         return this.completionForAssignment(context, next, assignment, acceptor);
      }
      return super.completionFor(context, next, acceptor);
   }

   protected fixCompletionNode(context: CompletionContext): CompletionContext {
      // for some reason the document is not always properly set on the node
      fixDocument(context.node, context.document);
      return context;
   }

   protected override filterKeyword(context: CompletionContext, keyword: GrammarAST.Keyword): boolean {
      return true;
   }

   protected completionForAssignment(
      context: CompletionContext,
      next: NextFeature<GrammarAST.AbstractElement>,
      assignment: GrammarAST.Assignment,
      acceptor: CompletionAcceptor
   ): MaybePromise<void> {
      if (assignment.feature === 'id') {
         return this.completionForId(context, assignment, acceptor);
      }
      if (isAttributeMapping(context.node) && assignment.feature === 'expression') {
         return this.completeAttributeMappingExpression(context, context.node, acceptor);
      }
      if (GrammarAST.isRuleCall(assignment.terminal) && assignment.terminal.rule.ref) {
         const type = this.getRuleType(assignment.terminal.rule.ref);
         switch (type) {
            case 'string':
               return this.completionForString(context, assignment, acceptor);
            case 'number':
               return this.completionForNumber(context, assignment, acceptor);
            case 'boolean':
               return this.completionForBoolean(context, assignment, acceptor);
         }
      }
      return super.completionFor(context, next, acceptor);
   }

   protected completeAttributeMappingExpression(
      context: CompletionContext,
      mapping: AttributeMapping,
      acceptor: CompletionAcceptor
   ): MaybePromise<void> {
      const text = context.textDocument.getText();
      const expressionUpToCursor = text.substring(context.tokenOffset, context.offset);
      const referenceStart = expressionUpToCursor.lastIndexOf('{{');
      const referenceEnd = expressionUpToCursor.lastIndexOf('}}');
      if (referenceEnd >= referenceStart) {
         // we are not within a reference part
         return;
      }
      const start = context.textDocument.positionAt(context.tokenOffset + referenceStart + '{{'.length);
      const end = context.textDocument.positionAt(context.offset);
      const reference = context.textDocument.getText({ start, end }).trim();
      mapping.sources
         .filter(source => reference.length === 0 || source.value.$refText.startsWith(reference))
         .forEach(source => {
            acceptor(context, {
               label: source.value.$refText,
               textEdit: TextEdit.replace({ start, end }, source.value.$refText)
            });
         });
   }

   protected getRuleType(rule: GrammarAST.AbstractRule): string | undefined {
      if (GrammarAST.isTerminalRule(rule)) {
         return rule.type?.name ?? 'string';
      }
      const explicitType = GrammarUtils.getExplicitRuleType(rule);
      return explicitType ?? rule.name;
   }

   protected completionForId(
      context: CompletionContext,
      _assignment: GrammarAST.Assignment,
      acceptor: CompletionAcceptor
   ): MaybePromise<void> {
      const generatedId = 'id_' + uuid();
      acceptor(context, {
         label: 'Generated ID: ' + generatedId,
         textEdit: {
            newText: generatedId,
            range: this.getCompletionRange(context)
         },
         kind: CompletionItemKind.Value,
         sortText: '0'
      });
   }

   protected completionForString(
      context: CompletionContext,
      assignment: GrammarAST.Assignment,
      acceptor: CompletionAcceptor
   ): MaybePromise<void> {
      acceptor(context, {
         label: 'String Value',
         textEdit: {
            newText: quote('${1:' + assignment.feature + '}'),
            range: this.getCompletionRange(context)
         },
         insertTextFormat: InsertTextFormat.Snippet,
         kind: CompletionItemKind.Snippet,
         sortText: '0'
      });
   }

   protected completionForNumber(
      context: CompletionContext,
      _assignment: GrammarAST.Assignment,
      acceptor: CompletionAcceptor
   ): MaybePromise<void> {
      acceptor(context, {
         label: 'Number Value',
         textEdit: {
            newText: '${1:0}',
            range: this.getCompletionRange(context)
         },
         insertTextFormat: InsertTextFormat.Snippet,
         kind: CompletionItemKind.Snippet,
         sortText: '0'
      });
   }

   protected completionForBoolean(
      context: CompletionContext,
      _assignment: GrammarAST.Assignment,
      acceptor: CompletionAcceptor
   ): MaybePromise<void> {
      acceptor(context, {
         label: 'Boolean Value',
         textEdit: {
            newText: '${true:0}',
            range: this.getCompletionRange(context)
         },
         insertTextFormat: InsertTextFormat.Snippet,
         kind: CompletionItemKind.Snippet,
         sortText: '0'
      });
   }

   protected getCompletionRange(context: CompletionContext): Range {
      const text = context.textDocument.getText();
      const existingText = text.substring(context.tokenOffset, context.offset);
      let range: Range = {
         start: context.position,
         end: context.position
      };
      if (existingText.length > 0) {
         // FIXME: Completely replace the current token
         const start = context.textDocument.positionAt(context.tokenOffset + 1);
         const end = context.textDocument.positionAt(context.tokenEndOffset - 1);
         range = {
            start,
            end
         };
      }
      return range;
   }

   protected override completionForCrossReference(
      context: CompletionContext,
      crossRef: NextFeature<GrammarAST.CrossReference>,
      acceptor: CompletionAcceptor
   ): MaybePromise<void> {
      this.packageId = this.dataModelManager.getDataModelIdByDocument(context.document);
      try {
         super.completionForCrossReference(context, crossRef, acceptor);
      } finally {
         this.packageId = undefined;
      }
   }

   protected override getReferenceCandidates(refInfo: ReferenceInfo, context: CompletionContext): Stream<AstNodeDescription> {
      return this.services.references.ScopeProvider.getCompletionScope(refInfo).elementScope.getAllElements();
   }

   protected filterRelationshipAttribute(node: RelationshipAttribute, context: CompletionContext, desc: AstNodeDescription): boolean {
      // only show relevant attributes depending on the parent or child context
      if (context.features.find(feature => feature.property === 'child')) {
         return desc.name.startsWith(node.$container.child?.$refText + '.');
      }
      if (context.features.find(feature => feature.property === 'parent')) {
         return desc.name.startsWith(node.$container.parent?.$refText + '.');
      }
      return true;
   }

   protected override createReferenceCompletionItem(description: AstNodeDescription): CompletionValueItem {
      const item = super.createReferenceCompletionItem(description);
      return {
         ...item,
         sortText: this.scopeProvider.sortText(description),
         insertText: toIdReference(description.name)
      };
   }
}
