/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { GlspSelection } from '@eclipse-glsp/theia-integration';
import { inject, injectable } from '@theia/core/shared/inversify';
import { DefaultPropertyViewWidgetProvider } from '@theia/property-view/lib/browser/property-view-widget-provider';
import { ModelPropertyWidget } from './model-property-widget';

@injectable()
export class ModelPropertyWidgetProvider extends DefaultPropertyViewWidgetProvider {
   override readonly id = 'model-property-widget-provider';
   override readonly label = 'Model Property Widget Provider';

   @inject(ModelPropertyWidget) protected modelPropertyWidget: ModelPropertyWidget;

   override canHandle(selection: GlspSelection | undefined): number {
      // issue with how selection is determined, if the additionalSelectionData is empty we simply delete the property
      if (selection && 'additionalSelectionData' in selection && !selection.additionalSelectionData) {
         delete selection['additionalSelectionData'];
      }
      if (GlspSelection.is(selection)) {
         return 100;
      }
      if (selection === undefined) {
         return 50;
      }
      if (selection && 'getResourceUri' in selection) {
         return 50;
      }
      return 0;
   }

   override async provideWidget(_selection: GlspSelection | undefined): Promise<ModelPropertyWidget> {
      return this.modelPropertyWidget;
   }

   override updateContentWidget(selection: GlspSelection | undefined): void {
      if (selection === undefined) {
         this.modelPropertyWidget.updatePropertyViewContent(undefined, undefined);
         return;
      }

      const selectionData = selection as any;
      if (selectionData && 'getResourceUri' in selectionData) {
         this.modelPropertyWidget.updatePropertyViewContent(undefined, undefined);
         return;
      }

      this.getPropertyDataService(selection).then(service => {
         this.modelPropertyWidget.updatePropertyViewContent(service, selection);
      });
   }
}
