/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { toIdReference } from '@crossmodel/protocol';
import { injectable } from 'inversify';
import { Relationship, SystemDiagram, isRelationshipEdge } from '../../../language-server/generated/ast.js';
import { CrossModelState } from '../../common/cross-model-state.js';
import { SystemModelIndex } from './system-model-index.js';

@injectable()
export class SystemModelState extends CrossModelState {
   declare readonly index: SystemModelIndex;

   get systemDiagram(): SystemDiagram {
      return this.semanticRoot.systemDiagram!;
   }

   override setSemanticRoot(uri: string, semanticRoot: any): void {
      super.setSemanticRoot(uri, semanticRoot);
      try {
         this.reconcileRelationshipEdges();
      } catch (e) {
         // ignore reconciliation errors
      }
   }

   protected reconcileRelationshipEdges(): void {
      const diagram = this.systemDiagram;
      if (!diagram) {
         return;
      }
      const indexManager = this.services.shared.workspace.IndexManager as any;
      const relDescriptions = indexManager.allElements('Relationship')?.toArray?.() ?? [];

      for (const edge of diagram.edges ?? []) {
         try {
            if (!isRelationshipEdge(edge) || !edge.relationship) {
               continue;
            }
            const relRef = edge.relationship.ref;
            const relIdText = relRef?.id ?? edge.relationship.$refText ?? '';
            if (!relIdText) {
               continue;
            }

            // find relationship node by resolving descriptions
            let relationship: Relationship | undefined;
            for (const d of relDescriptions) {
               const candidate = indexManager.resolveElement(d) as any;
               if (!candidate) {
                  continue;
               }
               const candidateGlobal = this.idProvider.getGlobalId(candidate) ?? candidate.id;
               const candidateRef = toIdReference(candidateGlobal ?? candidate.id ?? '');
               if (candidate.id === relIdText || candidateGlobal === relIdText || candidateRef === relIdText) {
                  relationship = candidate as Relationship;
                  break;
               }
            }
            if (!relationship) {
               continue;
            }

            const parentRef = relationship.parent;
            const childRef = relationship.child;
            if (!parentRef || !childRef) {
               continue;
            }

            const nodes = diagram.nodes ?? [];
            const idp = this.idProvider;
            const parentG = idp.getGlobalId(parentRef.ref);
            const childG = idp.getGlobalId(childRef.ref);
            const pRef = parentRef.$refText;
            const cRef = childRef.$refText;
            const parentNode = nodes.find((n: any) => idp.getGlobalId(n.entity?.ref) === parentG || n.entity?.$refText === pRef);
            const childNode = nodes.find((n: any) => idp.getGlobalId(n.entity?.ref) === childG || n.entity?.$refText === cRef);

            let changed = false;
            if (parentNode) {
               edge.sourceNode = { ref: parentNode, $refText: toIdReference(this.idProvider.getNodeId(parentNode) ?? parentNode.id ?? '') };
               changed = true;
            }
            if (childNode) {
               edge.targetNode = { ref: childNode, $refText: toIdReference(this.idProvider.getNodeId(childNode) ?? childNode.id ?? '') };
               changed = true;
            }

            if (changed) {
               this.services.shared.logger.ClientLogger.info(`[MS] reconciled edge ${edge.id} for rel=${relationship.id}`);
            }
         } catch (err) {
            // ignore per-edge errors
         }
      }
   }
}
