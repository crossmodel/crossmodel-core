/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import {
   Action,
   BaseEditTool,
   CursorCSS,
   cursorFeedbackAction,
   Disposable,
   FeedbackEmitter,
   GModelElement,
   MouseListener,
   SetUIExtensionVisibilityAction
} from '@eclipse-glsp/client';
import { injectable } from '@theia/core/shared/inversify';
import { CrossModelCommandPalette } from '../../cross-model-command-palette';

@injectable()
export class SourceObjectCreationTool extends BaseEditTool {
   static readonly ID = 'source-object-creation-tool';

   get id(): string {
      return SourceObjectCreationTool.ID;
   }
   override enable(): void {
      const mouseFeedback = new SourceObjectCreationMouseListener(this);
      this.toDisposeOnDisable.push(mouseFeedback, this.mouseTool.registerListener(mouseFeedback));
   }
}

@injectable()
export class SourceObjectCreationMouseListener extends MouseListener implements Disposable {
   protected cursorFeedback: FeedbackEmitter;

   constructor(protected tool: SourceObjectCreationTool) {
      super();
      this.cursorFeedback = tool.createFeedbackEmitter();
      this.cursorFeedback.add(cursorFeedbackAction(CursorCSS.NODE_CREATION), cursorFeedbackAction()).submit();
   }

   override mouseOver(target: GModelElement, event: MouseEvent): (Action | Promise<Action>)[] {
      if (target === target.root) {
         // we are on the root diagram
         this.cursorFeedback.add(cursorFeedbackAction(CursorCSS.NODE_CREATION), cursorFeedbackAction()).submit();
      } else {
         this.cursorFeedback.add(cursorFeedbackAction(CursorCSS.OPERATION_NOT_ALLOWED), cursorFeedbackAction()).submit();
      }
      return [];
   }

   override mouseUp(target: GModelElement, event: MouseEvent): Action[] {
      // only handle main mouse button
      if (event.button !== 0) {
         return [];
      }
      if (target !== target.root) {
         return [];
      }
      return [
         SetUIExtensionVisibilityAction.create({
            extensionId: CrossModelCommandPalette.ID,
            visible: true
         })
      ];
   }

   dispose(): void {
      this.cursorFeedback.dispose();
   }
}
