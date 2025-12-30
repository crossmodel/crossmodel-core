/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { DropFilesOperation, ModelStructure } from '@crossmodel/protocol';
import {
   Action,
   EnableDefaultToolsAction,
   GLSPMousePositionTracker,
   GModelElement,
   GModelRoot,
   GlspCommandPalette,
   IActionDispatcher,
   InsertIndicator,
   LabeledAction,
   Point,
   TYPES,
   getAbsoluteClientBounds
} from '@eclipse-glsp/client';
import { inject, injectable } from '@theia/core/shared/inversify';

@injectable()
export class CrossModelMousePositionTracker extends GLSPMousePositionTracker {
   clientPosition: Point | undefined;
   diagramOffset: Point | undefined;
   private _overrideLastPosition: Point | undefined;

   override get lastPositionOnDiagram(): Point | undefined {
      return this._overrideLastPosition || super.lastPositionOnDiagram;
   }

   override mouseMove(target: GModelElement, event: MouseEvent): (Action | Promise<Action>)[] {
      this.clientPosition = { x: event.clientX, y: event.clientY };
      const currentTarget = event.currentTarget as HTMLElement;
      if (currentTarget) {
         const rect = currentTarget.getBoundingClientRect();
         this.diagramOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      } else {
         this.diagramOffset = { x: event.offsetX, y: event.offsetY };
      }
      this._overrideLastPosition = undefined;
      return super.mouseMove(target, event);
   }

   setLastPosition(position: Point): void {
      this._overrideLastPosition = position;
   }
}

@injectable()
export class CrossModelCommandPalette extends GlspCommandPalette {
   protected visible = false;
   protected creationPosition?: Point;

   @inject(CrossModelMousePositionTracker) protected positionTracker: CrossModelMousePositionTracker;
   @inject(TYPES.IActionDispatcher) protected actionDispatcher: IActionDispatcher;

   protected override onBeforeShow(containerElement: HTMLElement, root: Readonly<GModelRoot>, ...contextElementIds: string[]): void {
      if (contextElementIds.length === 1) {
         const element = root.index.getById(contextElementIds[0]);
         if (element instanceof InsertIndicator) {
            this.creationPosition = element.position;
            const bounds = getAbsoluteClientBounds(element, this.domHelper, this.viewerOptions);
            containerElement.style.left = `${bounds.x}px`;
            containerElement.style.top = `${bounds.y}px`;
            containerElement.style.width = `${this.defaultWidth}px`;
            return;
         }
      }
      const diagramOffset = this.positionTracker.diagramOffset;
      if (diagramOffset) {
         this.creationPosition = this.positionTracker.lastPositionOnDiagram;
         containerElement.style.left = `${diagramOffset.x}px`;
         containerElement.style.top = `${diagramOffset.y}px`;
         containerElement.style.width = `${this.defaultWidth}px`;
         return;
      }
      super.onBeforeShow(containerElement, root, ...contextElementIds);
   }

   protected override executeAction(input: LabeledAction | Action | Action[]): void {
      if (this.creationPosition && LabeledAction.is(input) && DropFilesOperation.is(input.actions[0])) {
         const action = input.actions[0];
         action.position = this.creationPosition;
         super.executeAction(action);
      } else {
         super.executeAction(input);
      }
      this.actionDispatcher.dispatch(EnableDefaultToolsAction.create());
   }

   override hide(): void {
      super.hide();
      this.creationPosition = undefined;
      this.visible = false;
   }
}

export class EntityCommandPalette extends CrossModelCommandPalette {
   static readonly PALETTE_ID = 'entity-command-palette';

   public override id(): string {
      return EntityCommandPalette.PALETTE_ID;
   }

   protected override filterActions(filterText: string, actions: LabeledAction[]): LabeledAction[] {
      return super.filterActions(filterText, actions).filter(action => action.icon === ModelStructure.LogicalEntity.ICON_CLASS);
   }
}

export class RelationshipCommandPalette extends CrossModelCommandPalette {
   static readonly PALETTE_ID = 'relationship-command-palette';

   public override id(): string {
      return RelationshipCommandPalette.PALETTE_ID;
   }

   protected override filterActions(filterText: string, actions: LabeledAction[]): LabeledAction[] {
      return super.filterActions(filterText, actions).filter(action => action.icon === ModelStructure.Relationship.ICON_CLASS);
   }
}
