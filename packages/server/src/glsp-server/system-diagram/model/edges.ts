/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import {
   INHERITANCE_EDGE_TYPE,
   REFERENCE_CONTAINER_TYPE,
   REFERENCE_PROPERTY,
   REFERENCE_VALUE,
   RELATIONSHIP_EDGE_TYPE
} from '@crossmodel/protocol';
import { ArgsUtil, GEdge, GEdgeBuilder } from '@eclipse-glsp/server';
import { combineIds } from '../../../language-server/cross-model-naming.js';
import { InheritanceEdge, LogicalEntity, Relationship, RelationshipEdge } from '../../../language-server/generated/ast.js';
import { SystemModelIndex } from './system-model-index.js';

export class GRelationshipEdge extends GEdge {
   override type = RELATIONSHIP_EDGE_TYPE;

   static override builder(): GRelationshipEdgeBuilder {
      return new GRelationshipEdgeBuilder(GRelationshipEdge).type(RELATIONSHIP_EDGE_TYPE);
   }
}

export class GRelationshipEdgeBuilder extends GEdgeBuilder<GRelationshipEdge> {
   set(edge: RelationshipEdge, index: SystemModelIndex): this {
      if (!edge) {
         return this;
      }
      this.id(index.createId(edge));
      this.addCssClasses('diagram-edge', 'relationship');
      this.addArgs(ArgsUtil.edgePadding(5));
      this.routerKind('libavoid');
      this.addArg(REFERENCE_CONTAINER_TYPE, RelationshipEdge);
      this.addArg(REFERENCE_PROPERTY, 'relationship');
      this.addArg(REFERENCE_VALUE, edge.relationship.$refText);

      if (edge.relationship?.ref?.$document?.uri) {
         this.addArg('semanticUri', edge.relationship.ref.$document.uri.toString());
      } else if (edge.relationship?.$refText) {
         const description = index.services.shared.workspace.IndexManager.allElements(Relationship).find(
            e => e.name === edge.relationship.$refText
         );
         if (description) {
            this.addArg('semanticUri', description.documentUri.toString());
         }
      }

      // Add cardinality css classes
      if (edge.relationship.ref?.parentCardinality) {
         this.addCssClasses('relationship-parent-'.concat(edge.relationship.ref?.parentCardinality.replace('..', '_')));
      }
      if (edge.relationship?.ref?.childCardinality) {
         this.addCssClasses('relationship-child-'.concat(edge.relationship.ref?.childCardinality.replace('..', '_')));
      }

      const sourceId = index.createId(edge.sourceNode?.ref);
      const targetId = index.createId(edge.targetNode?.ref);

      this.sourceId(sourceId || '');
      this.targetId(targetId || '');

      return this;
   }
}

export class GInheritanceEdge extends GEdge {
   override type = INHERITANCE_EDGE_TYPE;

   static override builder(): GInheritanceEdgeBuilder {
      return new GInheritanceEdgeBuilder(GInheritanceEdge).type(INHERITANCE_EDGE_TYPE);
   }
}

export class GInheritanceEdgeBuilder extends GEdgeBuilder<GInheritanceEdge> {
   set(edge: InheritanceEdge, index: SystemModelIndex): this {
      this.id(index.createId(edge));
      this.addCssClasses('diagram-edge', 'inheritance');
      this.addArg('edgePadding', 5);

      const baseNode = edge.baseNode?.ref;
      const baseEntity = baseNode?.entity?.ref;

      let semanticUri: string | undefined;

      if (baseEntity?.$document?.uri) {
         semanticUri = baseEntity.$document.uri.toString();
      } else {
         if (baseNode?.entity?.$refText) {
            const entityDescription = index.services.shared.workspace.IndexManager.allElements(LogicalEntity).find(
               e => e.name === baseNode.entity.$refText
            );
            if (entityDescription) {
               semanticUri = entityDescription.documentUri.toString();
            }
         }
      }

      if (semanticUri) {
         this.addArg('semanticUri', semanticUri);
      }
      this.routerKind('libavoid');

      const sourceId = index.findId(edge.baseNode?.ref, () => combineIds(index.assertId(edge.$container), edge.baseNode.$refText));
      const targetId = index.findId(edge.superNode?.ref, () => combineIds(index.assertId(edge.$container), edge.superNode.$refText));

      this.sourceId(sourceId || '');
      this.targetId(targetId || '');
      return this;
   }
}
