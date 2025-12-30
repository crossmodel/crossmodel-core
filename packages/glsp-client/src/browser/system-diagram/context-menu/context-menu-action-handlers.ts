/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { ModelService } from '@crossmodel/model-service/lib/common';
import {
    ENTITY_NODE_TYPE,
    EnableDefaultToolsAction,
    INHERITANCE_EDGE_TYPE,
    RELATIONSHIP_EDGE_TYPE,
    RelationshipType,
    findNextUnique,
    identity
} from '@crossmodel/protocol';
import {
   Action,
   CreateNodeOperation,
   GModelElement,
   IActionDispatcher,
   IActionHandler,
   ICommand,
   IDiagramOptions,
   Point,
   SetUIExtensionVisibilityAction,
   TYPES,
   TriggerEdgeCreationAction
} from '@eclipse-glsp/client';
import { GLSPDiagramWidget } from '@eclipse-glsp/theia-integration';
import { URI } from '@theia/core';
import { Message, OpenerService, SingleTextInputDialog, SingleTextInputDialogProps } from '@theia/core/lib/browser';
import { inject, injectable } from '@theia/core/shared/inversify';
import { EditorManager } from '@theia/editor/lib/browser';
import { CrossModelMousePositionTracker, EntityCommandPalette, RelationshipCommandPalette } from '../../cross-model-command-palette';
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
      if (!OpenInFormEditorAction.is(action)) {
         return;
      }

      let diagramWidget: GLSPDiagramWidget | undefined;
      for (const widget of this.editorManager.all) {
         let glspWidget: GLSPDiagramWidget | undefined;
         let current: any = widget;
         while (current) {
            if (typeof current.getPrimaryWidget === 'function' && typeof current.revealCodeTab === 'function') {
               const primary = current.getPrimaryWidget();
               if (primary instanceof GLSPDiagramWidget) {
                  glspWidget = primary;
               }
               break;
            }
            current = current.parent;
         }
         if (!glspWidget && widget instanceof GLSPDiagramWidget) {
            glspWidget = widget;
         }

         const widgetUri = glspWidget ? (glspWidget as any).options?.uri?.toString() : undefined;
         const modelId = glspWidget?.modelSource?.model?.id || 'N/A';

         if (glspWidget && (widgetUri === action.rootId || modelId === action.rootId)) {
            diagramWidget = glspWidget;
            break;
         }
      }

      if (!diagramWidget) {
         return;
      }

      const rootElement = (diagramWidget as any).model
         || (diagramWidget as any).modelSource?.model
         || (diagramWidget as any).modelSource?.modelRoot
         || (diagramWidget as any).editorContext?.modelRoot;

      if (!rootElement) {
         return;
      }

      const semanticUri = this.resolveSemanticUri(action.elementId, rootElement);

      if (!semanticUri) {
         return;
      }

      (async () => {
         try {
            const opener = await this.openerService.getOpener(new URI(semanticUri));
            const widget = await opener.open(new URI(semanticUri));

            if (widget) {
                let compositeEditor: any = widget;
                if (!(typeof compositeEditor.getPrimaryWidget === 'function' && typeof compositeEditor.revealCodeTab === 'function')) {
                    const widgetAny = widget as any;
                    if (widgetAny.parent && typeof widgetAny.parent.getPrimaryWidget === 'function'
                    && typeof widgetAny.parent.revealCodeTab === 'function') {
                        compositeEditor = widgetAny.parent;
                    } else {
                        compositeEditor = undefined;
                    }
                }

                if (compositeEditor) {
                    const primaryWidget = compositeEditor.getPrimaryWidget();
                    if (primaryWidget && compositeEditor['tabPanel']) {
                       compositeEditor['tabPanel'].currentWidget = primaryWidget;
                    }
                }
            }
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

      let diagramWidget: GLSPDiagramWidget | undefined;
      for (const widget of this.editorManager.all) {
         let glspWidget: GLSPDiagramWidget | undefined;
         let current: any = widget;
         while (current) {
            if (typeof current.getPrimaryWidget === 'function' && typeof current.revealCodeTab === 'function') {
               const primary = current.getPrimaryWidget();
               if (primary instanceof GLSPDiagramWidget) {
                  glspWidget = primary;
               }
               break;
            }
            current = current.parent;
         }
         if (!glspWidget && widget instanceof GLSPDiagramWidget) {
            glspWidget = widget;
         }

         const widgetUri = glspWidget ? (glspWidget as any).options?.uri?.toString() : undefined;
         const modelId = glspWidget?.modelSource?.model?.id || 'N/A';

         if (glspWidget && (widgetUri === action.rootId || modelId === action.rootId)) {
            diagramWidget = glspWidget;
            break;
         }
      }

      if (!diagramWidget) {
         return;
      }

      const rootElement = (diagramWidget as any).model
         || (diagramWidget as any).modelSource?.model
         || (diagramWidget as any).modelSource?.modelRoot
         || (diagramWidget as any).editorContext?.modelRoot;

      if (!rootElement) {
         return;
      }

      const semanticUri = this.resolveSemanticUri(action.elementId, rootElement);

      if (!semanticUri) {
         return;
      }

      (async () => {
         try {
            const opener = await this.openerService.getOpener(new URI(semanticUri));
            const widget = await opener.open(new URI(semanticUri), { initialTab: 'code' } as any);

            if (widget) {
                let compositeEditor: any = widget;
                if (!(typeof compositeEditor.getPrimaryWidget === 'function' && typeof compositeEditor.revealCodeTab === 'function')) {
                    const widgetAny = widget as any;
                    if (widgetAny.parent && typeof widgetAny.parent.getPrimaryWidget === 'function'
                    && typeof widgetAny.parent.revealCodeTab === 'function') {
                        compositeEditor = widgetAny.parent;
                    } else {
                        compositeEditor = undefined;
                    }
                }

                if (compositeEditor) {
                    compositeEditor.revealCodeTab({});
                }
            }
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

      this.queryEntityName(action.screenLocation).then(name => {
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

   protected async queryEntityName(location: Point): Promise<string | undefined> {
      const referenceableEntities = await this.modelService.findReferenceableElements({
         container: { uri: this.diagramOptions.sourceUri!, type: RelationshipType },
         property: 'parent'
      });
      const existingNames = referenceableEntities.map(entity => entity.label);
      const nextUniqueName = findNextUnique('NewEntity', existingNames, identity);

      return new EntityNameInputDialog({
         title: 'Entity Name',
         placeholder: nextUniqueName,
         initialValue: nextUniqueName,
         position: location,
         validate: name => {
            if (name.trim().length === 0) {
               return 'Entity name cannot be empty';
            }
            if (existingNames.includes(name)) {
               return 'Entity with that name already exists';
            }
            return true;
         }
      }).open();
   }
}

/**
 * Action handler for showing an existing entity.
 */
@injectable()
export class ShowEntityActionHandler implements IActionHandler {
   @inject(TYPES.IActionDispatcher) protected readonly actionDispatcher: IActionDispatcher;
   @inject(CrossModelMousePositionTracker) protected readonly mousePositionTracker: CrossModelMousePositionTracker;

   handle(action: Action): void | Action | ICommand {
      if (!ShowEntityAction.is(action)) {
         return;
      }

      if (action.diagramOffset) {
         this.mousePositionTracker.diagramOffset = action.diagramOffset;
         this.mousePositionTracker.setLastPosition(action.location);
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
   @inject(CrossModelMousePositionTracker) protected readonly mousePositionTracker: CrossModelMousePositionTracker;

   handle(action: Action): void | Action | ICommand {
      if (!ShowRelationshipAction.is(action)) {
         return;
      }

      if (action.diagramOffset) {
         this.mousePositionTracker.diagramOffset = action.diagramOffset;
         this.mousePositionTracker.setLastPosition(action.location);
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

class EntityNameInputDialogProps extends SingleTextInputDialogProps {
   position?: Point;
}

class EntityNameInputDialog extends SingleTextInputDialog {
   constructor(protected override props: EntityNameInputDialogProps) {
      super(props);
      this.addClass('entity-name-dialog');
   }

   protected override onAfterAttach(msg: Message): void {
      super.onAfterAttach(msg);
      if (this.props.position) {
         const block = this.node.getElementsByClassName('dialogBlock')?.[0] as HTMLElement;
         if (block) {
            block.style.position = 'absolute';
            block.style.left = `${this.props.position.x}px`;
            block.style.top = `${this.props.position.y}px`;
         }
      }
   }
}
