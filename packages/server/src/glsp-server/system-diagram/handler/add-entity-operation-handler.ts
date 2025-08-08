/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { AddEntityOperation, toIdReference } from '@crossmodel/protocol';
import { Command, JsonOperationHandler, ModelState } from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import { LogicalEntity, LogicalEntityNode } from '../../../language-server/generated/ast.js';
import { CrossModelCommand } from '../../common/cross-model-command.js';
import { SystemModelState } from '../model/system-model-state.js';

/**
 * An operation handler for the 'AddEntityOperation' that resolves the referenced entity by name and places it in a new node on the diagram.
 */
@injectable()
export class SystemDiagramAddEntityOperationHandler extends JsonOperationHandler {
   override operationType = AddEntityOperation.KIND;
   @inject(ModelState) protected override modelState: SystemModelState;

   createCommand(operation: AddEntityOperation): Command {
      return new CrossModelCommand(this.modelState, () => this.createEntityNode(operation));
   }

   protected async createEntityNode(operation: AddEntityOperation): Promise<void> {
      const scope = this.modelState.services.language.references.ScopeProvider.getCompletionScope({
         container: { globalId: this.modelState.systemDiagram.id! },
         syntheticElements: [{ property: 'nodes', type: LogicalEntityNode }],
         property: 'entity'
      });

      const container = this.modelState.systemDiagram;
      const entityDescription = scope.elementScope.getElement(operation.entityName);

      if (entityDescription) {
         const node: LogicalEntityNode = {
            $type: LogicalEntityNode,
            $container: container,
            id: this.modelState.idProvider.findNextId(LogicalEntityNode, entityDescription.name + 'Node', container),
            entity: {
               $refText: toIdReference(entityDescription.name),
               ref: entityDescription.node as LogicalEntity | undefined
            },
            x: operation.position.x,
            y: operation.position.y,
            width: 10,
            height: 10
         };
         container.nodes.push(node);
      }
   }
}
