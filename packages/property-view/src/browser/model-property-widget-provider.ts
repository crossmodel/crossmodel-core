/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { CrossModelSelectionData } from '@crossmodel/glsp-client/lib/browser/crossmodel-selection-data-service';
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
      return GlspSelection.is(selection) ? 100 : 0;
   }

   override async provideWidget(_selection: GlspSelection | undefined): Promise<ModelPropertyWidget> {
      return this.modelPropertyWidget;
   }

   override updateContentWidget(selection: GlspSelection | undefined): void {
      if (selection === undefined) {
         this.modelPropertyWidget.updatePropertyViewContent(undefined, undefined);
         return;
      }

      const selectionData = selection.additionalSelectionData as CrossModelSelectionData | undefined;
      if (!selectionData?.showProperties) {
         this.modelPropertyWidget.updatePropertyViewContent(undefined, { sourceUri: selection.sourceUri } as any);
         return;
      }

      this.getPropertyDataService(selection).then(service => {
         this.modelPropertyWidget.updatePropertyViewContent(service, selection);
      });
   }
}
