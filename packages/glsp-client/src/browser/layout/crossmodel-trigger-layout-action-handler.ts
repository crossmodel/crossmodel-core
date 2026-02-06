/********************************************************************************
 * Copyright (c) 2026 CrossBreeze.
 ********************************************************************************/
import { CLEAR_MANUAL_ROUTING_POINTS, HAS_MANUAL_ROUTING_POINTS } from '@crossmodel/protocol';
import {
   Action,
   EditorContextService,
   IActionDispatcher,
   IActionHandler,
   ICommand,
   LayoutOperation,
   TYPES,
   TriggerLayoutAction,
   getMatchingElements,
   isRoutable
} from '@eclipse-glsp/client';
import { ConfirmDialog } from '@theia/core/lib/browser';
import { inject, injectable } from 'inversify';

@injectable()
export class CrossModelTriggerLayoutActionHandler implements IActionHandler {
   @inject(EditorContextService) protected editorContext: EditorContextService;
   @inject(TYPES.IActionDispatcher) protected actionDispatcher: IActionDispatcher;

   handle(action: TriggerLayoutAction): ICommand | Action | void {
      // fire-and-forget async confirmation; cannot return a Promise from IActionHandler
      this.confirmAndDispatchLayout(action);
      return undefined;
   }

   protected async confirmAndDispatchLayout(action: TriggerLayoutAction): Promise<void> {
      const root = this.editorContext.modelRoot;
      const routables = getMatchingElements(root.index, isRoutable);
      const hasManualRoutingPoints = routables.some(
         edge => (edge as any).routingPoints?.length > 0 || (edge as any).args?.[HAS_MANUAL_ROUTING_POINTS]
      );

      if (hasManualRoutingPoints) {
         const confirmed = await new ConfirmDialog({
            title: 'Auto-layout diagram?',
            msg: 'Auto-layout will clear manual routing points. Continue?'
         }).open();

         if (!confirmed) {
            return;
         }
      }

      const layoutOperation = LayoutOperation.create(this.editorContext.get().selectedElementIds, {
         args: hasManualRoutingPoints ? { ...(action.args ?? {}), [CLEAR_MANUAL_ROUTING_POINTS]: true } : action.args,
         canvasBounds: this.editorContext.canvasBounds,
         viewport: this.editorContext.viewportData
      });
      await this.actionDispatcher.dispatch(layoutOperation);
   }
}
