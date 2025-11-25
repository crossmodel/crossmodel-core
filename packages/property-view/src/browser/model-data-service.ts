/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { CrossModelSelectionData, GModelElementInfo } from '@crossmodel/glsp-client/lib/browser/crossmodel-selection-data-service';
import { ModelService } from '@crossmodel/model-service/lib/common';
import { RenderProps } from '@crossmodel/protocol';
import { GlspSelection } from '@eclipse-glsp/theia-integration';
import { inject, injectable } from '@theia/core/shared/inversify';
import { PropertyDataService } from '@theia/property-view/lib/browser/property-data-service';

export const PROPERTY_CLIENT_ID = 'property-view-client';

export interface PropertiesRenderData {
   uri: string;
   renderProps?: Partial<RenderProps>;
}

@injectable()
export class ModelDataService implements PropertyDataService {
   id = 'model-property-data-service';
   label = 'ModelPropertyDataService';

   @inject(ModelService) protected modelService: ModelService;

   canHandleSelection(selection: GlspSelection | undefined): number {
      return GlspSelection.is(selection) ? 1 : 0;
   }

   async providePropertyData(selection: GlspSelection | undefined): Promise<PropertiesRenderData | undefined> {
      if (!selection || !GlspSelection.is(selection) || !selection.sourceUri) {
         return undefined;
      }

      const selectionData = selection.additionalSelectionData as CrossModelSelectionData | undefined;
      const hasElementSelection = selection.selectedElementsIDs?.length > 0;
      const showElementProperties = !!selectionData?.showProperties;

      if (hasElementSelection && showElementProperties) {
         for (const selectedElementId of selection.selectedElementsIDs) {
            const renderData = await this.getPropertyData(
               selection,
               selectionData?.selectionDataMap.get(selectedElementId)
            );
            if (renderData) {
               return renderData;
            }
         }
      }

      try {
         const model = await this.modelService.request(selection.sourceUri);
         if (!model) {
            return undefined;
         }

         return {
            uri: selection.sourceUri,
            renderProps: {}
         };
      } catch (e) {
         console.error('Error while loading file-level properties', e);
         return undefined;
      }
   }

   protected async getPropertyData(selection: GlspSelection, info?: GModelElementInfo): Promise<PropertiesRenderData | undefined> {
      if (info?.reference) {
         const reference = await this.modelService.resolveReference(info.reference);
         const renderProps = { ...info.renderProps, focusField: info.reference.property };
         return reference ? { uri: reference?.uri, renderProps } : undefined;
      } else if (selection.sourceUri && info?.renderProps) {
         return { uri: selection.sourceUri, renderProps: info.renderProps };
      }
      return undefined;
   }
}
