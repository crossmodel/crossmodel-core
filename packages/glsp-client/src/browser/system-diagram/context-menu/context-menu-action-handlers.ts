/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { ModelService } from '@crossmodel/model-service/lib/common';
import {
   ENTITY_NODE_TYPE,
   EnableDefaultToolsAction,
   INHERITANCE_EDGE_TYPE,
   RELATIONSHIP_EDGE_TYPE
} from '@crossmodel/protocol';
import {
   Action,
   CreateNodeOperation,
   GModelElement,
   IActionDispatcher,
   IActionHandler,
   ICommand,
   IDiagramOptions,
   SetUIExtensionVisibilityAction,
   TYPES,
   TriggerEdgeCreationAction
} from '@eclipse-glsp/client';
import { URI } from '@theia/core';
import { OpenerService } from '@theia/core/lib/browser';
import { inject, injectable } from '@theia/core/shared/inversify';
import { EditorManager } from '@theia/editor/lib/browser';
import { EntityCommandPalette, RelationshipCommandPalette } from '../../cross-model-command-palette';
import { queryEntityName } from '../node-creation-tool/system-node-creation-tool';
import {
   CreateEntityAction,
   CreateInheritanceAction,
   CreateRelationshipAction,
   OpenInCodeEditorAction,
   OpenInFormEditorAction,
   ShowEntityAction,
   ShowRelationshipAction
} from './context-menu-actions';

/**
 * Base class for action handlers that need to resolve semantic URIs from model elements.
 */
@injectable()
export abstract class SemanticUriActionHandler implements IActionHandler {
   @inject(TYPES.IActionDispatcher) protected readonly actionDispatcher: IActionDispatcher;

   handle(action: Action): void | Action | ICommand {
      return;
   }

   /**
    * Resolve the semantic URI for a given element ID.
    */
   protected resolveSemanticUri(elementId: string, root: any): string | undefined {
      const element = root.index.getById(elementId);
      if (!element) {
         return undefined;
      }

      if (this.hasSemanticUri(element)) {
         return element.semanticUri;
      }

      const elementWithArgs = element as any;
      if (elementWithArgs.args && typeof elementWithArgs.args['semanticUri'] === 'string') {
         return elementWithArgs.args['semanticUri'] as string;
      }

      return undefined;
   }

   protected hasSemanticUri(element: GModelElement): element is GModelElement & { semanticUri: string } {
      return 'semanticUri' in element && typeof (element as any).semanticUri === 'string';
   }
}

/**
 * Action handler for opening elements in the form editor.
 */
@injectable()
export class OpenInFormEditorActionHandler extends SemanticUriActionHandler {
   @inject(OpenerService) protected readonly openerService: OpenerService;
   @inject(EditorManager) protected readonly editorManager: EditorManager;

   override handle(action: Action): void | Action | ICommand {
      console.debug('[OpenInFormEditorActionHandler] Handling action:', action);
      if (!OpenInFormEditorAction.is(action)) {
         return;
      }

      if (!action.semanticUri) {
         return;
      }

      (async () => {
         try {
            const semanticUriObj = new URI(action.semanticUri);
            const opener = await this.openerService.getOpener(semanticUriObj);
            await opener.open(semanticUriObj);
         } catch (err) {
            console.error('[OpenInFormEditorActionHandler] Error opening URI:', err);
         }
      })();
   }
}

/**
 * Action handler for opening elements in the code editor.
 */
@injectable()
export class OpenInCodeEditorActionHandler extends SemanticUriActionHandler {
   @inject(OpenerService) protected readonly openerService: OpenerService;
   @inject(EditorManager) protected readonly editorManager: EditorManager;

   override handle(action: Action): void | Action | ICommand {
      if (!OpenInCodeEditorAction.is(action)) {
         return;
      }

      if (!action.semanticUri) {
         return;
      }

      (async () => {
         try {
            const semanticUriObj = new URI(action.semanticUri);
            const opener = await this.openerService.getOpener(semanticUriObj);
            await opener.open(semanticUriObj, { initialTab: 'code' } as any);
         } catch (err) {
            console.error('[OpenInCodeEditorActionHandler] Error opening URI:', err);
         }
      })();
   }
}

/**
 * Action handler for creating a new entity.
 */
@injectable()
export class CreateEntityActionHandler implements IActionHandler {
   @inject(TYPES.IActionDispatcher) protected readonly actionDispatcher: IActionDispatcher;
   @inject(ModelService) protected readonly modelService: ModelService;
   @inject(TYPES.IDiagramOptions) protected readonly diagramOptions: IDiagramOptions;

   handle(action: Action): void | Action | ICommand {
      if (!CreateEntityAction.is(action)) {
         return;
      }

      queryEntityName(this.modelService, this.diagramOptions, action.screenLocation).then(name => {
         if (name) {
            this.actionDispatcher.dispatch({
               kind: CreateNodeOperation.KIND,
               isOperation: true,
               elementTypeId: ENTITY_NODE_TYPE,
               containerId: action.rootId,
               location: action.location,
               args: { name }
            } as CreateNodeOperation);
         }
         this.actionDispatcher.dispatch(EnableDefaultToolsAction.create());
      });
   }


}

/**
 * Action handler for showing an existing entity.
 */
@injectable()
export class ShowEntityActionHandler implements IActionHandler {
   @inject(TYPES.IActionDispatcher) protected readonly actionDispatcher: IActionDispatcher;

   handle(action: Action): void | Action | ICommand {
      if (!ShowEntityAction.is(action)) {
         return;
      }

      return SetUIExtensionVisibilityAction.create({
         extensionId: EntityCommandPalette.PALETTE_ID,
         visible: true
      });
   }
}

/**
 * Action handler for creating a new relationship.
 */
@injectable()
export class CreateRelationshipActionHandler implements IActionHandler {
   @inject(TYPES.IActionDispatcher) protected readonly actionDispatcher: IActionDispatcher;

   handle(action: Action): void | Action | ICommand {
      if (!CreateRelationshipAction.is(action)) {
         return;
      }

      return TriggerEdgeCreationAction.create(RELATIONSHIP_EDGE_TYPE, {
         args: { type: 'create', singleUse: true }
      });
   }
}

/**
 * Action handler for showing an existing relationship.
 */
@injectable()
export class ShowRelationshipActionHandler implements IActionHandler {
   @inject(TYPES.IActionDispatcher) protected readonly actionDispatcher: IActionDispatcher;

   handle(action: Action): void | Action | ICommand {
      if (!ShowRelationshipAction.is(action)) {
         return;
      }

      return SetUIExtensionVisibilityAction.create({
         extensionId: RelationshipCommandPalette.PALETTE_ID,
         visible: true
      });
   }
}

/**
 * Action handler for creating a new inheritance.
 */
@injectable()
export class CreateInheritanceActionHandler implements IActionHandler {
   @inject(TYPES.IActionDispatcher) protected readonly actionDispatcher: IActionDispatcher;

   handle(action: Action): void | Action | ICommand {
      if (!CreateInheritanceAction.is(action)) {
         return;
      }

      return TriggerEdgeCreationAction.create(INHERITANCE_EDGE_TYPE, {
         args: { type: 'create', singleUse: true }
      });
   }
}

