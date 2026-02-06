/********************************************************************************
 * Copyright (c) 2026 CrossBreeze.
 ********************************************************************************/
import { ChangeRoutingPointsOperation } from '@eclipse-glsp/protocol';
import { Command, JsonOperationHandler } from '@eclipse-glsp/server';
import { injectable } from 'inversify';
import { RoutingPoint } from '../../../language-server/generated/ast.js';
import { CrossModelCommand } from '../../common/cross-model-command.js';
import { SystemModelState } from '../model/system-model-state.js';

@injectable()
export class SystemDiagramChangeRoutingPointsOperationHandler extends JsonOperationHandler {
   operationType = ChangeRoutingPointsOperation.KIND;
   declare protected modelState: SystemModelState;

   createCommand(operation: ChangeRoutingPointsOperation): Command | undefined {
      return new CrossModelCommand(this.modelState, () => this.changeRoutingPoints(operation));
   }

   protected changeRoutingPoints(operation: ChangeRoutingPointsOperation): void {
      // eslint-disable-next-line no-console
      console.log('[routing-debug][server] changeRoutingPoints', operation.newRoutingPoints);
      operation.newRoutingPoints.forEach(elementAndRoutingPoints => {
         const edge =
            this.modelState.index.findRelationshipEdge(elementAndRoutingPoints.elementId) ??
            this.modelState.index.findInheritanceEdge(elementAndRoutingPoints.elementId);

         if (!edge) {
            return;
         }

         const newRoutingPoints = elementAndRoutingPoints.newRoutingPoints ?? [];
         edge.routingPoints = newRoutingPoints.map(point => ({
            $type: RoutingPoint.$type,
            $container: edge,
            x: point.x,
            y: point.y
         }));
      });
   }
}
