/********************************************************************************
 * Copyright (c) 2026 CrossBreeze.
 ********************************************************************************/
import { HAS_MANUAL_ROUTING_POINTS } from '@crossmodel/protocol';
import {
   ChangeBoundsListener,
   ChangeBoundsTool,
   GConnectableElement,
   GEdge,
   GModelElement,
   SelectableBoundsAware,
   isRoutingHandle
} from '@eclipse-glsp/client';
import { ChangeRoutingPointsOperation, ElementAndRoutingPoints, Operation } from '@eclipse-glsp/protocol';
import { ConfirmDialog } from '@theia/core/lib/browser';

export class CrossModelChangeBoundsTool extends ChangeBoundsTool {
   protected override createChangeBoundsListener(): ChangeBoundsListener {
      return new CrossModelChangeBoundsListener(this);
   }
}

class CrossModelChangeBoundsListener extends ChangeBoundsListener {
   protected override getElementsToMove(target: GModelElement): SelectableBoundsAware[] {
      const elements = super.getElementsToMove(target);
      return elements.filter(element => !isRoutingHandle(element));
   }

   protected override handleMoveRoutingPointsOnServer(elementsToMove: SelectableBoundsAware[]): Operation[] {
      const edgesToClear = this.collectEdgesWithManualRoutingPoints(elementsToMove);
      if (edgesToClear.length === 0) {
         return [];
      }
      this.confirmAndClearRoutingPoints(edgesToClear);
      return [];
   }

   protected collectEdgesWithManualRoutingPoints(elementsToMove: SelectableBoundsAware[]): GEdge[] {
      const edgesById = new Map<string, GEdge>();
      elementsToMove.forEach(element => {
         if (element instanceof GConnectableElement) {
            element.incomingEdges.forEach(edge => {
               if (edge instanceof GEdge && this.isManualRoutingEdge(edge)) {
                  edgesById.set(edge.id, edge);
               }
            });
            element.outgoingEdges.forEach(edge => {
               if (edge instanceof GEdge && this.isManualRoutingEdge(edge)) {
                  edgesById.set(edge.id, edge);
               }
            });
         }
      });
      return Array.from(edgesById.values());
   }

   protected isManualRoutingEdge(edge: GEdge): boolean {
      return !!edge.args?.[HAS_MANUAL_ROUTING_POINTS] && !!edge.routingPoints && edge.routingPoints.length > 0;
   }

   protected async confirmAndClearRoutingPoints(edges: GEdge[]): Promise<void> {
      const count = edges.length;
      const confirmed = await new ConfirmDialog({
         title: 'Clear routing points?',
         msg: `Moving this node will clear manual routing points on ${count} connected edge${count === 1 ? '' : 's'}. Continue?`
      }).open();

      if (!confirmed) {
         return;
      }

      const newRoutingPoints: ElementAndRoutingPoints[] = edges.map(edge => ({
         elementId: edge.id,
         newRoutingPoints: []
      }));

      await this.tool.dispatchActions([ChangeRoutingPointsOperation.create(newRoutingPoints)]);
   }
}
