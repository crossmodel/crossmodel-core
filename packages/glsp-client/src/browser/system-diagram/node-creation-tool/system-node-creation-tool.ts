/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { ModelService } from '@crossmodel/model-service/lib/common';
import { RelationshipType, findNextUnique, identity } from '@crossmodel/protocol';
import {
   Action,
   Args,
   CreateNodeOperation,
   Disposable,
   DisposableCollection,
   GModelElement,
   GhostElement,
   IDiagramOptions,
   MessageAction,
   NodeCreationTool,
   NodeCreationToolMouseListener,
   Point,
   SetUIExtensionVisibilityAction,
   TYPES,
   TrackedInsert,
   applyCssClasses,
   deleteCssClasses
} from '@eclipse-glsp/client';
import { Message, SingleTextInputDialog, SingleTextInputDialogProps } from '@theia/core/lib/browser';
import { inject, injectable } from '@theia/core/shared/inversify';
import { EntityCommandPalette } from '../../cross-model-command-palette';

@injectable()
export class SystemNodeCreationTool extends NodeCreationTool {
   @inject(ModelService) readonly modelService: ModelService;
   @inject(TYPES.IDiagramOptions) readonly diagramOptions: IDiagramOptions;

   protected override createNodeCreationListener(ghostElement: GhostElement): Disposable {
      const toolListener = new SystemNodeCreationToolMouseListener(this.triggerAction, this, ghostElement);
      return new DisposableCollection(toolListener, this.mouseTool.registerListener(toolListener));
   }
}

export class SystemNodeCreationToolMouseListener extends NodeCreationToolMouseListener {
   protected override tool: SystemNodeCreationTool;

   protected override isContinuousMode(_ctx: GModelElement, _event: MouseEvent): boolean {
      return true;
   }

   protected override getCreateOperation(ctx: GModelElement, event: MouseEvent, insert: TrackedInsert): Action {
      if (this.triggerAction.args?.type === 'show') {
         return SetUIExtensionVisibilityAction.create({
            extensionId: EntityCommandPalette.ID,
            visible: true,
            contextElementsId: [this.ghostElementId]
         });
      } else if (this.triggerAction.args?.type === 'create') {
         this.queryEntityName(ctx, event, insert).then(name => {
            if (name === undefined) {
               // user cancelled the dialog
               return;
            }
            const action = super.getCreateOperation(ctx, event, insert) as CreateNodeOperation & { args: Args };
            action.args.name = name;
            this.tool.dispatchActions([action]);
         });
         return MessageAction.create('', { severity: 'NONE' });
      }
      throw new Error('Invalid node creation type');
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
   }
}
