/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import {
   BORDER_COLOR,
   BORDER_STYLE,
   BORDER_WEIGHT,
   INHERITANCE_EDGE_TYPE,
   REFERENCE_CONTAINER_TYPE,
   REFERENCE_PROPERTY,
   REFERENCE_VALUE,
   RELATIONSHIP_EDGE_TYPE,
   SEMANTIC_URI
} from '@crossmodel/protocol';
import { ArgsUtil, GEdge, GEdgeBuilder } from '@eclipse-glsp/server';
import { combineIds } from '../../../language-server/cross-model-naming.js';
import { InheritanceEdge, LogicalEntity, Relationship, RelationshipEdge } from '../../../language-server/ast.js';
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
      this.addArg(REFERENCE_CONTAINER_TYPE, RelationshipEdge.$type);
      this.addArg(REFERENCE_PROPERTY, 'relationship');
      this.addArg(REFERENCE_VALUE, edge.relationship.$refText);

      const semanticUri = index.services.shared.workspace.IndexManager.findDocumentUri(edge.relationship, Relationship.$type);
      if (semanticUri) {
         this.addArg(SEMANTIC_URI, semanticUri.toString());
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

      // Add styling properties if defined
      if (edge.borderColor) {
         this.addArg(BORDER_COLOR, edge.borderColor);
      }
      if (edge.borderWeight !== undefined) {
         this.addArg(BORDER_WEIGHT, edge.borderWeight);
      }
      if (edge.borderStyle) {
         this.addArg(BORDER_STYLE, edge.borderStyle);
      }

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

      const semanticUri = index.services.shared.workspace.IndexManager.findDocumentUri(edge.baseNode.ref?.entity, LogicalEntity.$type);
      if (semanticUri) {
         this.addArg(SEMANTIC_URI, semanticUri.toString());
      }
      this.routerKind('libavoid');

      const sourceId = index.findId(edge.baseNode?.ref, () => combineIds(index.assertId(edge.$container), edge.baseNode.$refText));
      const targetId = index.findId(edge.superNode?.ref, () => combineIds(index.assertId(edge.$container), edge.superNode.$refText));

      this.sourceId(sourceId || '');
      this.targetId(targetId || '');

      // Add styling properties if defined
      if (edge.borderColor) {
         this.addArg(BORDER_COLOR, edge.borderColor);
      }
      if (edge.borderWeight !== undefined) {
         this.addArg(BORDER_WEIGHT, edge.borderWeight);
      }
      if (edge.borderStyle) {
         this.addArg(BORDER_STYLE, edge.borderStyle);
      }

      return this;
   }
}
