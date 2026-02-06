/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { Command, JsonOperationHandler, LayoutEngine, LayoutOperation } from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import { CLEAR_MANUAL_ROUTING_POINTS } from '@crossmodel/protocol';
import { isInheritanceEdge, isRelationshipEdge } from '../../../language-server/generated/ast.js';
import { CrossModelCommand } from '../../common/cross-model-command.js';
import { SystemModelState } from '../model/system-model-state.js';

@injectable()
export class SystemDiagramOperationHandler extends JsonOperationHandler {
   override operationType = LayoutOperation.KIND;

   @inject(LayoutEngine) protected layoutEngine: LayoutEngine;
   declare protected modelState: SystemModelState;

   override createCommand(operation: LayoutOperation): Command | undefined {
      return new CrossModelCommand(this.modelState, () => this.layout(operation));
   }

   protected async layout(operation: LayoutOperation): Promise<void> {
      // Check if any edges have routing points
      const edgesWithRoutingPoints = this.modelState.systemDiagram?.edges.filter(
         edge => (isInheritanceEdge(edge) || isRelationshipEdge(edge)) && edge.routingPoints && edge.routingPoints.length > 0
      );

      const shouldClear = operation.args?.[CLEAR_MANUAL_ROUTING_POINTS] as boolean | undefined;
      if (shouldClear && edgesWithRoutingPoints && edgesWithRoutingPoints.length > 0) {
         edgesWithRoutingPoints.forEach(edge => {
            if (edge.routingPoints) {
               edge.routingPoints = [];
            }
         });
      }

      await this.layoutEngine?.layout();
   }
}
