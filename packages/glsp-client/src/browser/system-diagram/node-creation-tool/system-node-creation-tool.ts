/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { ModelService } from '@crossmodel/model-service/lib/common';
import { RelationshipType, TriggerSystemNodeCreationAction, findNextUnique, identity } from '@crossmodel/protocol';
import {
   Action,
   Args,
   CreateNodeOperation,
   Disposable,
   DisposableCollection,
   EnableDefaultToolsAction,
   GModelElement,
   GhostElement,
   IDiagramOptions,
   MessageAction,
   NodeCreationTool,
   NodeCreationToolMouseListener,
   NodeInsertTrackingListener,
   Point,
   SetUIExtensionVisibilityAction,
   TYPES,
   TrackedInsert,
   applyCssClasses,
   deleteCssClasses,
   getTemplateElementId
} from '@eclipse-glsp/client';
import { Message, SingleTextInputDialog, SingleTextInputDialogProps, animationFrame } from '@theia/core/lib/browser';
import { inject, injectable } from '@theia/core/shared/inversify';
import { EntityCommandPalette } from '../../cross-model-command-palette';

@injectable()
export class SystemNodeCreationTool extends NodeCreationTool {
   @inject(ModelService) readonly modelService: ModelService;
   @inject(TYPES.IDiagramOptions) readonly diagramOptions: IDiagramOptions;

   declare triggerAction: TriggerSystemNodeCreationAction;
   protected nodeCreationListener?: SystemNodeCreationToolMouseListener;
   protected ghostElementTracker?: NodeInsertTrackingListener;

   protected override createNodeCreationListener(ghostElement: GhostElement): Disposable {
      const toolListener = new SystemNodeCreationToolMouseListener(this.triggerAction, this, ghostElement);
      this.nodeCreationListener = toolListener;
      return new DisposableCollection(toolListener, this.mouseTool.registerListener(toolListener));
   }

   protected override createGhostElementTracker(ghostElement: GhostElement, position: 'top-left' | 'middle'): Disposable {
      const trackingListener = new NodeInsertTrackingListener(
         getTemplateElementId(ghostElement.template),
         this.triggerAction.elementTypeId,
         this,
         position,
         this.editorContext
      );
      this.ghostElementTracker = trackingListener;
      return new DisposableCollection(trackingListener, this.mouseTool.registerListener(trackingListener));
   }

   override doEnable(): void {
      super.doEnable();
      if (this.triggerAction.triggerLocation) {
         animationFrame().then(() => this.triggerTool(this.triggerAction.triggerLocation!));
      }
   }

   protected async triggerTool(position: Point): Promise<void> {
      if (!this.nodeCreationListener || !this.ghostElementTracker) {
         return;
      }
      await this.dispatchActions(
         this.ghostElementTracker.mouseMove(
            this.editorContext.modelRoot,
            new MouseEvent('mousemove', { clientX: position.x, clientY: position.y, bubbles: true, cancelable: true })
         )
      );
      await this.dispatchActions(
         this.nodeCreationListener.mouseMove(
            this.editorContext.modelRoot,
            new MouseEvent('mousemove', { clientX: position.x, clientY: position.y, bubbles: true, cancelable: true })
         )
      );
      await this.dispatchActions(
         this.nodeCreationListener.mouseUp(
            this.editorContext.modelRoot,
            new MouseEvent('mouseup', { clientX: position.x, clientY: position.y, bubbles: true, cancelable: true })
         )
      );
   }
}

export class SystemNodeCreationToolMouseListener extends NodeCreationToolMouseListener {
   protected override tool: SystemNodeCreationTool;
   declare triggerAction: TriggerSystemNodeCreationAction;

   protected override isContinuousMode(_ctx: GModelElement, _event: MouseEvent): boolean {
      return true;
   }

   protected override getCreateOperation(ctx: GModelElement, event: MouseEvent, insert: TrackedInsert): Action {
      if (this.triggerAction.args?.type === 'show') {
         return SetUIExtensionVisibilityAction.create({
            extensionId: EntityCommandPalette.PALETTE_ID,
            visible: true,
            contextElementsId: this.triggerAction.triggerLocation ? undefined : [this.ghostElementId]
         });
      } else if (this.triggerAction.args?.type === 'create') {
         this.queryEntityName(ctx, event, insert).then(name => {
            if (name === undefined) {
               // user cancelled the dialog
               return;
            }
            const action = super.getCreateOperation(ctx, event, insert) as CreateNodeOperation & { args: Args };
            action.args.name = name;
            const actions: Action[] = [action];

            if (this.triggerAction.args?.singleUse !== false) {
               actions.push(EnableDefaultToolsAction.create());
            }
            this.tool.dispatchActions(actions);
         });
      } else {
         throw new Error('Invalid node creation type');
      }
      return MessageAction.create('', { severity: 'NONE' });
   }

   protected async queryEntityName(ctx: GModelElement, event: MouseEvent, insert: TrackedInsert): Promise<string | undefined> {
      const referenceableEntities = await this.tool.modelService.findReferenceableElements({
         container: { uri: this.tool.diagramOptions.sourceUri!, type: RelationshipType },
         property: 'parent'
      });
      const existingNames = referenceableEntities.map(entity => entity.label);
      const nextUniqueName = findNextUnique('NewEntity', existingNames, identity);
      const position = { x: event.pageX, y: event.pageY };
      this.tool.dispatchActions([applyCssClasses(ctx.root, 'input-mode')]);
      return new EntityNameInputDialog({
         title: 'Entity Name',
         placeholder: nextUniqueName,
         initialValue: nextUniqueName,
         position,
         validate: name => {
            if (name.trim().length === 0) {
               return 'Entity name cannot be empty';
            }
            if (existingNames.includes(name)) {
               return 'Entity with that name already exists';
            }
            return true;
         }
      })
         .open()
         .finally(() => {
            this.tool.dispatchActions([deleteCssClasses(ctx.root, 'input-mode')]);
         });
   }

   override nonDraggingMouseUp(ctx: GModelElement, event: MouseEvent): Action[] {
      // only handle main mouse button
      if (event.button !== 0) {
         return [];
      }
      return super.nonDraggingMouseUp(ctx, event);
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

      const content = this.node.getElementsByClassName('dialogContent')?.[0] as HTMLElement;
      if (content && !content.querySelector('.entity-name-hint')) {
         const hint = document.createElement('div');
         hint.className = 'entity-name-hint';
         hint.textContent = "Press 'Enter' to confirm or 'Escape' to cancel";
         content.appendChild(hint);
      }
   }
}
