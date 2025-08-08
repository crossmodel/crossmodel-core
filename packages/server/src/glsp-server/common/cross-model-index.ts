/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { GModelElement, GModelIndex } from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import { AstNode, AstUtils } from 'langium';
import * as uuid from 'uuid';
import { CrossModelLSPServices } from '../../integration.js';
import { CrossModelRoot } from '../../language-server/generated/ast.js';

/**
 * Custom model index that not only indexes the GModel elements but also the semantic elements (AstNodes) they represent.
 */
@injectable()
export class CrossModelIndex extends GModelIndex {
   @inject(CrossModelLSPServices) services!: CrossModelLSPServices;

   protected idToSemanticNode = new Map<string, AstNode>();

   findId(node: AstNode | undefined, fallback: () => string): string;
   findId(node: AstNode | undefined, fallback?: () => string | undefined): string | undefined;
   findId(node: AstNode | undefined, fallback: () => string | undefined = () => undefined): string | undefined {
      return this.doFindId(node) ?? fallback();
   }

   protected doFindId(node?: AstNode): string | undefined {
      return this.services.language.references.IdProvider.getLocalId(node);
   }

   createId(node?: AstNode): string {
      return this.findId(node, () => 'fallback_' + uuid.v4());
   }

   assertId(node?: AstNode): string {
      const id = this.findId(node);
      if (!id) {
         throw new Error('Could not create ID for: ' + node?.$cstNode?.text);
      }
      return id;
   }

   indexSemanticRoot(root: CrossModelRoot): void {
      this.idToSemanticNode.clear();
      AstUtils.streamAst(root).forEach(node => this.indexAstNode(node));
   }

   protected indexAstNode(node: AstNode): void {
      const id = this.findId(node);
      if (id) {
         this.indexSemanticElement(id, node);
      }
   }

   indexSemanticElement<T extends AstNode>(id: string, element: T): void {
      this.idToSemanticNode.set(id, element);
   }

   findSemanticElement(id: string): AstNode | undefined;
   findSemanticElement<T extends AstNode>(id: string, guard: (item: unknown) => item is T): T | undefined;
   findSemanticElement<T extends AstNode>(id: string, guard?: (item: unknown) => item is T): T | AstNode | undefined {
      const semanticNode = this.idToSemanticNode.get(id);
      if (guard) {
         return guard(semanticNode) ? semanticNode : undefined;
      }
      return semanticNode;
   }

   protected override doIndex(element: GModelElement): void {
      if (this.idToElement.has(element.id)) {
         // super method throws error which is a bit too extreme, simply log the error to the client
         this.services.shared.logger.ClientLogger.error('Duplicate element id in graph: ' + element.id);
         return;
      }
      super.doIndex(element);
   }
}
