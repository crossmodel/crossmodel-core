/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { CrossModelWidget, CrossModelWidgetOptions } from '@crossmodel/core/lib/browser';
import { CanRedoCallback, CanUndoCallback, RedoCallback, UndoCallback } from '@crossmodel/react-model-ui';
import { Message, NavigatableWidget, NavigatableWidgetOptions, StatefulWidget } from '@theia/core/lib/browser';
import { CommonCommands } from '@theia/core/lib/browser/common-frontend-contribution';
import { CommandService } from '@theia/core/lib/common/command';
import { SelectionService } from '@theia/core/lib/common/selection-service';
import URI from '@theia/core/lib/common/uri';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';

export interface FormEditorWidgetOptions extends CrossModelWidgetOptions, NavigatableWidgetOptions {
   uri: string;
}

@injectable()
export class FormEditorWidget extends CrossModelWidget implements NavigatableWidget, StatefulWidget {
   protected override options: FormEditorWidgetOptions;

   @inject(CommandService)
   protected readonly commandService: CommandService;

   @inject(SelectionService)
   protected readonly selectionService: SelectionService;

   protected override handleOpenRequest = undefined;

   // Store undo/redo callbacks from React context
   protected undoCallback?: UndoCallback;
   protected redoCallback?: RedoCallback;
   protected canUndoCallback?: CanUndoCallback;
   protected canRedoCallback?: CanRedoCallback;

   protected override getModelProviderProps(): any {
      const props = super.getModelProviderProps();

      return {
         ...props,
         onModelSave: async () => {
            await this.commandService.executeCommand(CommonCommands.SAVE.id);
         },
         onUndoReady: (undo: UndoCallback, redo: RedoCallback, canUndo: CanUndoCallback, canRedo: CanRedoCallback) => {
            this.undoCallback = undo;
            this.redoCallback = redo;
            this.canUndoCallback = canUndo;
            this.canRedoCallback = canRedo;
         }
      };
   }

   @postConstruct()
   override init(): void {
      super.init();
      this.title.label = this.labelProvider.getName(new URI(this.options.uri));
   }

   getResourceUri(): URI {
      return new URI(this.options.uri);
   }

   createMoveToUri(resourceUri: URI): URI | undefined {
      return resourceUri;
   }

   storeState(): object | undefined {
      return {};
   }

   restoreState(oldState: object | undefined): void {
      // nothing to restore
   }

   protected override onActivateRequest(msg: Message): void {
      super.onActivateRequest(msg);
      this.selectionService.selection = this;
   }

   protected override onCloseRequest(msg: Message): void {
      if (this.selectionService.selection === this) {
         this.selectionService.selection = undefined;
      }
      super.onCloseRequest(msg);
   }

   /**
    * Undo the last form change.
    * Called by Theia's undo command (CTRL+Z).
    */
   undo(): void {
      if (this.undoCallback) {
         this.undoCallback();
      }
   }

   /**
    * Redo the last undone form change.
    * Called by Theia's redo command (CTRL+SHIFT+Z or CTRL+Y).
    */
   redo(): void {
      if (this.redoCallback) {
         this.redoCallback();
      }
   }

   /**
    * Check if undo is available.
    */
   canUndo(): boolean {
      return this.canUndoCallback?.() ?? false;
   }

   /**
    * Check if redo is available.
    */
   canRedo(): boolean {
      return this.canRedoCallback?.() ?? false;
   }
}
