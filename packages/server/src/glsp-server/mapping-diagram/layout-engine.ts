/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { SOURCE_NUMBER_NODE_TYPE, SOURCE_OBJECT_NODE_TYPE, SOURCE_STRING_NODE_TYPE, isLeftPortId } from '@crossmodel/protocol';
import {
   Bounds,
   GCompartment,
   GModelRoot,
   GNode,
   GPort,
   LayoutEngine,
   MaybePromise,
   Writable,
   findParentByClass
} from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import { getOwner } from '../../language-server/util/ast-util.js';
import { MappingModelState } from './model/mapping-model-state.js';
import { GSourceObjectNode, GTargetObjectNode } from './model/nodes.js';

/**
 * Manual implementation until we have Elk Layouting properly working in this scenario.
 * It seems that the combination of VS Code extension within Theia causes problems for this to work as otherwise it does.
 */
@injectable()
export class MappingDiagramLayoutEngine implements LayoutEngine {
   @inject(MappingModelState) protected modelState!: MappingModelState;

   layout(): MaybePromise<GModelRoot> {
      if (!this.modelState.mapping) {
         return this.modelState.root;
      }

      const index = this.modelState.index;

      // position source nodes in correct order
      const topMargin = 10;
      const leftMargin = 10;

      const sourceNodeBounds: Writable<Bounds> = { x: leftMargin, y: topMargin, width: 0, height: 0 };

      const gapBetweenSourceNodes = 20;
      const sourceNodes = index.getElements(SOURCE_OBJECT_NODE_TYPE) as GNode[];
      [...sourceNodes].sort(this.getSourceNodeOrderFunction()).forEach(node => {
         node.position = { x: sourceNodeBounds.x, y: sourceNodeBounds.y + sourceNodeBounds.height };
         sourceNodeBounds.width = Math.max(sourceNodeBounds.width, node.size.width);
         sourceNodeBounds.height += node.size.height + gapBetweenSourceNodes;
      });
      sourceNodeBounds.height -= sourceNodes.length > 0 ? gapBetweenSourceNodes : 0; // remove last gap

      const gapBetweenSourceAndTarget = 300;
      const targetNode = index.getAllByClass(GTargetObjectNode)[0];
      targetNode.position = { x: sourceNodeBounds.x + gapBetweenSourceAndTarget, y: sourceNodeBounds.y };
      if (sourceNodes.length > 0) {
         // position target node vertically centered to the source nodes
         targetNode.position = {
            x: sourceNodeBounds.x + sourceNodeBounds.width + gapBetweenSourceAndTarget,
            y: Bounds.middle(sourceNodeBounds) - targetNode.size.height / 2
         };
      }

      // position ports to left and right side of parent whose size is given by the label
      index.getAllByClass(GPort).forEach(port => {
         const parentNode = isLeftPortId(port.id) ? findParentByClass(port, GTargetObjectNode) : findParentByClass(port, GSourceObjectNode);
         const attributeCompartment = findParentByClass(port, GCompartment);
         if (parentNode && attributeCompartment) {
            const portX = isLeftPortId(port.id) ? -14 : parentNode.size.width - 14;
            port.size = { width: 8, height: 8 };
            port.position = { x: portX, y: attributeCompartment.size.height / 2 - port.size.height / 2 };
         }
      });

      return this.modelState.root;
   }

   protected getSourceNodeOrderFunction(): (left: GNode, right: GNode) => number {
      // sort mappings by the target attribute order and extract the source node id
      const target = this.modelState.mapping.target;

      const idx = this.modelState.index;
      const sourceNodeOrder = [...target.mappings]
         .sort((left, right) => (left.attribute?.value.ref?.$containerIndex ?? 0) - (right.attribute?.value.ref?.$containerIndex ?? 0))
         .flatMap(mapping => mapping.sources.map(source => idx.createId(getOwner(source.value.ref))));
      return (left: GNode, right: GNode): number => {
         if (!sourceNodeOrder.includes(left.id)) {
            return 1;
         }
         if (!sourceNodeOrder.includes(right.id)) {
            return -1;
         }
         const compare = sourceNodeOrder.indexOf(left.id) - sourceNodeOrder.indexOf(right.id);
         if (compare !== 0) {
            return compare;
         }
         if (left.type === SOURCE_STRING_NODE_TYPE || left.type === SOURCE_NUMBER_NODE_TYPE) {
            return 1;
         }
         return 0;
      };
   }
}
