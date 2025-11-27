/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { CrossModelSelectionData } from '@crossmodel/glsp-client/lib/browser/crossmodel-selection-data-service';
import { GlspSelection } from '@eclipse-glsp/theia-integration';
import { ApplicationShell } from '@theia/core/lib/browser';
import { inject, injectable } from '@theia/core/shared/inversify';
import { PropertyViewWidget } from '@theia/property-view/lib/browser/property-view-widget';
import { DefaultPropertyViewWidgetProvider } from '@theia/property-view/lib/browser/property-view-widget-provider';
import { ModelPropertyWidget } from './model-property-widget';

@injectable()
export class ModelPropertyWidgetProvider extends DefaultPropertyViewWidgetProvider {
   override readonly id = 'model-property-widget-provider';
   override readonly label = 'Model Property Widget Provider';

   @inject(ModelPropertyWidget) protected modelPropertyWidget: ModelPropertyWidget;
   @inject(ApplicationShell) protected readonly shell: ApplicationShell;
   
   private currentSelection: GlspSelection | undefined;

   override canHandle(selection: GlspSelection | undefined): number {
      // issue with how selection is determined, if the additionalSelectionData is empty we simply delete the property
      if (selection && 'additionalSelectionData' in selection && !selection.additionalSelectionData) {
         delete selection['additionalSelectionData'];
      }
      return GlspSelection.is(selection) ? 100 : 0;
   }

   override async provideWidget(selection: GlspSelection | undefined): Promise<ModelPropertyWidget> {
      const hasSelectedElements = (selection?.selectedElementsIDs?.length ?? 0) > 0;
      const targetSelection = hasSelectedElements ? selection : this.currentSelection;
      
      if (targetSelection) {
         const storedSelectionData = targetSelection.additionalSelectionData as CrossModelSelectionData | undefined;
         const modifiedSelectionData: CrossModelSelectionData = {
            selectionDataMap: storedSelectionData?.selectionDataMap ?? new Map(),
            showProperties: true
         } as CrossModelSelectionData;
         const modifiedSelection: GlspSelection = {
            ...targetSelection,
            additionalSelectionData: modifiedSelectionData
         };
         this.getPropertyDataService(modifiedSelection).then(service => {
            this.modelPropertyWidget.updatePropertyViewContent(service, modifiedSelection);
         });
      }
      return this.modelPropertyWidget;
   }

   /**
    * Checks if the property view widget is currently open and visible
    */
   protected isPropertyWidgetOpen(): boolean {
      try {
         const propertyWidget = this.shell.getWidgetById(PropertyViewWidget.ID);
         const isOpen = propertyWidget !== undefined && propertyWidget.isVisible;
         return isOpen;
      } catch (error) {
         return false;
      }
   }

   override updateContentWidget(selection: GlspSelection | undefined): void {
      if (selection === undefined) {
         this.modelPropertyWidget.updatePropertyViewContent(undefined, undefined);
         this.currentSelection = undefined;
         return;
      }

      const selectionData = selection.additionalSelectionData as (CrossModelSelectionData & { showProperties?: boolean }) | undefined;
      const showProperties = selectionData?.showProperties ?? false;
      const hasSelectedElements = (selection.selectedElementsIDs?.length ?? 0) > 0;
      const isWidgetOpen = this.isPropertyWidgetOpen();

      if (hasSelectedElements) {
         this.currentSelection = selection;
      }

      if (showProperties) {
         this.getPropertyDataService(selection).then(service => {
            this.modelPropertyWidget.updatePropertyViewContent(service, selection);
         });
         return;
      }

      if (isWidgetOpen && (hasSelectedElements || this.currentSelection)) {
         const targetSelection = hasSelectedElements ? selection : this.currentSelection!;
         const targetSelectionData = targetSelection.additionalSelectionData as CrossModelSelectionData | undefined;
         const modifiedSelectionData: CrossModelSelectionData = {
            selectionDataMap: targetSelectionData?.selectionDataMap ?? new Map(),
            showProperties: true
         } as CrossModelSelectionData;
         const modifiedSelection: GlspSelection = {
            ...targetSelection,
            additionalSelectionData: modifiedSelectionData
         };
         this.getPropertyDataService(modifiedSelection).then(service => {
            this.modelPropertyWidget.updatePropertyViewContent(service, modifiedSelection);
         });
         return;
      }
   }
}