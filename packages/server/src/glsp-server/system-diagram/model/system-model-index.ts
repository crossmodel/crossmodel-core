/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { injectable } from 'inversify';
import { AstNode } from 'langium';
import {
   InheritanceEdge,
   LogicalEntity,
   LogicalEntityNode,
   Relationship,
   RelationshipEdge,
   isInheritanceEdge,
   isLogicalEntity,
   isLogicalEntityNode,
   isRelationship,
   isRelationshipEdge
} from '../../../language-server/generated/ast.js';
import { CrossModelIndex } from '../../common/cross-model-index.js';

@injectable()
export class SystemModelIndex extends CrossModelIndex {
   findLogicalEntity(id: string): LogicalEntity | undefined {
      return this.findSemanticElement(id, isLogicalEntity);
   }

   findRelationship(id: string): Relationship | undefined {
      return this.findSemanticElement(id, isRelationship);
   }

   findLogicalEntityNode(id: string): LogicalEntityNode | undefined {
      return this.findSemanticElement(id, isLogicalEntityNode);
   }

   findRelationshipEdge(id: string): RelationshipEdge | undefined {
      return this.findSemanticElement(id, isRelationshipEdge);
   }

   findInheritanceEdge(id: string): InheritanceEdge | undefined {
      return this.findSemanticElement(id, isInheritanceEdge);
   }

   protected override indexAstNode(node: AstNode): void {
      super.indexAstNode(node);
      if (isLogicalEntityNode(node)) {
         this.indexSemanticElement(`${this.createId(node)}_label`, node);
      }
   }
}
