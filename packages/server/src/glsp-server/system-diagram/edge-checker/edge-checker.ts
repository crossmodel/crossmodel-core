/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { INHERITANCE_EDGE_TYPE } from '@crossmodel/protocol';
import { EdgeCreationChecker, GModelElement, ModelState, getOrThrow } from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import { LogicalEntity, LogicalEntityNode, isInheritanceEdge } from '../../../language-server/generated/ast.js';
import { SystemModelState } from '../model/system-model-state.js';

@injectable()
export class SystemEdgeCreationChecker implements EdgeCreationChecker {
   @inject(ModelState) protected modelState: SystemModelState;

   isValidSource(edgeType: string, sourceElement: GModelElement): boolean {
      return true;
   }
   isValidTarget(edgeType: string, sourceElement: GModelElement, targetElement: GModelElement): boolean {
      if (edgeType !== INHERITANCE_EDGE_TYPE) {
         return true;
      }
      const baseEntityNode = getOrThrow(this.modelState.index.findLogicalEntityNode(sourceElement.id), 'Base entity node not found');
      const superEntityNode = getOrThrow(this.modelState.index.findLogicalEntityNode(targetElement.id), 'Super entity node not found');
      if (!baseEntityNode.entity.ref || !superEntityNode.entity.ref) {
         return false;
      }
      // Don't allow creating an inheritance edge if it already exists
      if (this.hasExistingInheritanceEdge(baseEntityNode, superEntityNode)) {
         return false;
      }
      // Don't allow creating an inheritance edge if it would create a direct circular inheritance
      if (this.hasSuperEntity(superEntityNode.entity.ref, baseEntityNode.entity.ref)) {
         return false;
      }

      // Check if the given superEntity is valid i.e. in  the completion scope of the baseEntity
      const baseEntityGlobalId = this.modelState.idProvider.getGlobalId(baseEntityNode.entity.ref);
      const scope = this.modelState.services.language.references.ScopeProvider.getCompletionScope({
         container: { globalId: baseEntityGlobalId! },
         property: 'superEntities'
      });

      const superEntityGlobalId = this.modelState.idProvider.getGlobalId(superEntityNode.entity.ref)!;
      // If the id of the super entity is missing, we don't allow the edge creation
      if (!superEntityNode.entity.ref.id) {
         return false;
      }
      const isInScope = scope.elementScope.getElement(superEntityNode.entity.ref.id) ?? scope.elementScope.getElement(superEntityGlobalId);
      if (!isInScope) {
         return false;
      }
      return true;
   }

   protected hasExistingInheritanceEdge(baseEntityNode: LogicalEntityNode, superEntityNode: LogicalEntityNode): boolean {
      const existingInheritanceEdge = this.modelState.systemDiagram.edges.find(edge => {
         if (!isInheritanceEdge(edge)) {
            return false;
         }
         if (edge.baseNode.ref?.entity.ref === baseEntityNode.entity.ref && edge.superNode.ref?.entity.ref === superEntityNode.entity.ref) {
            return true;
         }
         return false;
      });
      return !!existingInheritanceEdge;
   }

   protected hasSuperEntity(baseEntity: LogicalEntity, superEntity: LogicalEntity): boolean {
      return baseEntity.superEntities.some(entity => entity.ref === superEntity);
   }
}
