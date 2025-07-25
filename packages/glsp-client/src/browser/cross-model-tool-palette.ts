/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import {
   Action,
   CSS_HIDDEN_EXTENSION_CLASS,
   CSS_UI_EXTENSION_CLASS,
   EnableDefaultToolsAction,
   FitToScreenAction,
   ICommand,
   PaletteItem,
   RequestContextActions,
   SetContextActions,
   SetModelAction,
   ToolPalette,
   UpdateModelAction,
   createIcon
} from '@eclipse-glsp/client';
import { injectable } from '@theia/core/shared/inversify';
const CLICKED_CSS_CLASS = 'clicked';

@injectable()
export class CrossModelToolPalette extends ToolPalette {
   protected readonly defaultToolsBtnId = 'default-tool';
   protected override initializeContents(containerElement: HTMLElement): void {
      this.addMinimizePaletteButton();
      this.createHeader();
      this.createBody();
      this.changeActiveButton(this.defaultToolsButton);
      containerElement.setAttribute('aria-label', 'Tool-Palette');
   }

   protected override createHeaderTitle(): HTMLElement {
      const header = document.createElement('div');
      header.classList.add('header-icon');
      header.appendChild(createIcon('tools'));
      header.insertAdjacentText('beforeend', 'Toolbox');
      return header;
   }

   protected override createHeaderTools(): HTMLElement {
      const headerTools = document.createElement('div');
      headerTools.classList.add('header-tools');

      const resetViewportButton = this.createResetViewportButton();
      headerTools.appendChild(resetViewportButton);

      const fitToScreenButton = this.createFitToScreenButton();
      headerTools.appendChild(fitToScreenButton);

      if (this.gridManager) {
         const toggleGridButton = this.createToggleGridButton();
         headerTools.appendChild(toggleGridButton);
      }

      return headerTools;
   }

   protected override createToolButton(item: PaletteItem, index: number): HTMLElement {
      const button = super.createToolButton(item, index);
      if (item.id === this.defaultToolsBtnId) {
         this.defaultToolsButton = button;
      }
      return button;
   }

   protected createFitToScreenButton(): HTMLElement {
      const fitToScreenButton = createIcon('screen-full');
      fitToScreenButton.title = 'Fit to Screen';
      fitToScreenButton.onclick = _event => {
         this.actionDispatcher.dispatch(FitToScreenAction.create([]));
         fitToScreenButton.focus();
      };
      fitToScreenButton.ariaLabel = fitToScreenButton.title;
      fitToScreenButton.tabIndex = 1;
      return fitToScreenButton;
   }

   protected override async setPaletteItems(): Promise<void> {
      super.setPaletteItems();
      this.changeActiveButton();
      const requestAction = RequestContextActions.create({
         contextId: ToolPalette.ID,
         editorContext: {
            selectedElementIds: []
         }
      });
      const response = await this.actionDispatcher.request<SetContextActions>(requestAction);
      this.paletteItems = response.actions.map(action => action as PaletteItem);
      this.dynamic = this.paletteItems.some(item => this.hasDynamicAction(item));
   }

   override changeActiveButton(button?: HTMLElement): void {
      if (this.lastActiveButton) {
         this.lastActiveButton.classList.remove(CLICKED_CSS_CLASS);
      }
      if (button) {
         button.classList.add(CLICKED_CSS_CLASS);
         this.lastActiveButton = button;
      } else if (this.defaultToolsButton) {
         this.defaultToolsButton.classList.add(CLICKED_CSS_CLASS);
         this.lastActiveButton = this.defaultToolsButton;
         this.defaultToolsButton.focus();
      }
   }

   override handle(action: Action): ICommand | Action | void {
      if (UpdateModelAction.is(action) || SetModelAction.is(action)) {
         this.reloadPaletteBody();
      } else if (EnableDefaultToolsAction.is(action)) {
         this.changeActiveButton(this.defaultToolsButton);
         if (this.focusTracker.hasFocus) {
            // if focus was deliberately taken do not restore focus to the palette
            this.focusTracker.diagramElement?.focus();
         }
      }
   }

   protected override setContainerVisible(visible: boolean): void {
      super.setContainerVisible(visible);
      // also toggle the visibility of the palette button
      const minimizePaletteButton = document.getElementById(this.options.baseDiv)?.getElementsByClassName('minimize-palette-button')[0];
      if (visible) {
         minimizePaletteButton?.classList.remove(CSS_HIDDEN_EXTENSION_CLASS, CSS_UI_EXTENSION_CLASS);
      } else {
         minimizePaletteButton?.classList.add(CSS_HIDDEN_EXTENSION_CLASS, CSS_UI_EXTENSION_CLASS);
      }
   }
}
