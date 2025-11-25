/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { ShowPropertiesAction } from '@crossmodel/protocol';
import { Action, IActionDispatcher, IActionHandler, ICommand, TYPES } from '@eclipse-glsp/client';
import { SelectAction } from '@eclipse-glsp/protocol';
import { ApplicationShell, WidgetManager } from '@theia/core/lib/browser';
import { inject, injectable } from '@theia/core/shared/inversify';
import { PropertiesActivationStore } from './properties-activation-store';

const PROPERTY_VIEW_ID = 'property-view';

@injectable()
export class ShowPropertiesActionHandler implements IActionHandler {
   constructor(
      @inject(ApplicationShell) protected readonly shell: ApplicationShell,
      @inject(WidgetManager) protected readonly widgetManager: WidgetManager,
      @inject(TYPES.IActionDispatcher) protected readonly actionDispatcher: IActionDispatcher,
      @inject(PropertiesActivationStore) protected readonly propertiesActivationStore: PropertiesActivationStore
   ) {}

   handle(action: Action): ICommand | Action | void {
      if (!ShowPropertiesAction.is(action)) {
         return;
      }
      this.propertiesActivationStore.request(action.elementId);
      this.openPropertyView(action.elementId).catch(error => console.error('Failed to open properties view', error));
   }

   protected async openPropertyView(elementId?: string): Promise<void> {
      if (elementId) {
         await this.reselectElement(elementId);
         await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      const widget = await this.widgetManager.getOrCreateWidget(PROPERTY_VIEW_ID);
      if (!widget.isAttached) {
         this.shell.addWidget(widget, { area: 'right' });
      }
      this.shell.activateWidget(widget.id);
      this.shell.expandPanel('right');
   }

   protected async reselectElement(elementId: string): Promise<void> {
      await this.actionDispatcher.dispatch(SelectAction.setSelection([]));
      await this.actionDispatcher.dispatch(SelectAction.setSelection([elementId]));
   }
}
