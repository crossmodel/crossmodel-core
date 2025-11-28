/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { ShouldSaveDialog } from '@theia/core/lib/browser';
import { PropertyDataService } from '@theia/property-view/lib/browser/property-data-service';
import { PropertyViewContentWidget } from '@theia/property-view/lib/browser/property-view-content-widget';

import { CrossModelWidget } from '@crossmodel/core/lib/browser';
import { RenderProps } from '@crossmodel/protocol';
import { ModelProviderProps } from '@crossmodel/react-model-ui';
import { GLSPDiagramWidget, GlspSelection, getDiagramWidget } from '@eclipse-glsp/theia-integration';
import { injectable } from '@theia/core/shared/inversify';
import * as deepEqual from 'fast-deep-equal';
import { PropertiesRenderData } from './model-data-service';

@injectable()
export class ModelPropertyWidget extends CrossModelWidget implements PropertyViewContentWidget {
   protected renderData?: PropertiesRenderData;
   private _closeInProgress: Promise<void> | undefined;

   constructor() {
      super();
      this.node.tabIndex = 0;
      this.node.style.height = '100%';
   }

   async updatePropertyViewContent(propertyDataService?: PropertyDataService, selection?: GlspSelection | undefined): Promise<void> {
      const selectionData = selection as any;
      if (selectionData?.sourceUri && !GlspSelection.is(selection)) {
         const uri = selectionData.sourceUri;
         if (this.document?.uri.toString() !== uri) {
            this.renderData = undefined;
            await this.setModel(uri);
         }
         return;
      }

      const activeWidget = getDiagramWidget(this.shell);
      if (activeWidget?.options.uri === this.document?.uri.toString() && this.document?.uri.toString() !== selection?.sourceUri) {
         // only react to selection of active widget
         return;
      }
      if (propertyDataService) {
         const renderData = (await propertyDataService.providePropertyData(selection)) as PropertiesRenderData | undefined;
         if (this.document?.uri.toString() !== renderData?.uri || !deepEqual(this.renderData, renderData)) {
            this.renderData = renderData;
            this.setModel(renderData?.uri);
         } else if (renderData?.renderProps?.focusField) {
            this.focusField(renderData.renderProps.focusField as string);
         }

         if (renderData && selection) {
            this.shell.expandPanel('right');
         }

         if (renderData && selection) {
            this.shell.expandPanel('right');
         }
      } else {
         this.renderData = undefined;
         this.setModel();
      }
   }

   protected override getRenderProperties(): RenderProps {
      return { ...super.getRenderProperties(), ...this.renderData?.renderProps };
   }

   protected override async closeModel(uri: string): Promise<void> {
      // Prevent re-entrant calls: if a close is already in progress, return
      // the in-flight promise so we don't show the save dialog multiple times.
      if (this._closeInProgress) {
         return this._closeInProgress;
      }

      this._closeInProgress = (async () => {
         try {
            // Wait for any pending debounced updates to flush and complete.
            // The blur event has already fired by the time closeModel is called,
            // so we just need to ensure the async update chain completes:
            // 1. blur event already fired → save button clicked
            // 2. onRowUpdate called → dispatch() updates React state
            // 3. React re-renders
            // 4. useEffect runs → onModelUpdate called → handleUpdateRequest (debounced)
            // 5. handleUpdateRequest.flush() → sendUpdate → modelService.update
            await this.idle();

            if (this.document && this.dirty) {
               const isMappingFile = !!(this.document && (this.document as any).root && (this.document as any).root.mapping);
               if (!isMappingFile) {
                  const shouldSave = await new ShouldSaveDialog(this).open();
                  if (shouldSave === true) {
                     await this.saveModel(this.document);
                     await super.closeModel(uri);
                     return;
                  } else if (shouldSave === false) {
                     await super.closeModel(uri);
                     return;
                  } else {
                     // Cancel: abort the close operation so callers (who await closeModel)
                     // do not continue with further model switches. Throwing here causes
                     // the awaiting caller to receive a rejected promise and leave the
                     // current document intact.
                     throw new Error('close-cancelled');
                  }
               }
            }
            await super.closeModel(uri);
         } finally {
            // Clear in-flight marker so future closes can proceed
            this._closeInProgress = undefined;
         }
      })();

      return this._closeInProgress;
   }

   protected getDiagramWidget(): GLSPDiagramWidget | undefined {
      for (const widget of this.shell.widgets) {
         if (widget instanceof GLSPDiagramWidget) {
            return widget;
         }
      }
      return undefined;
   }

   protected override focusInput(): void {
      // do nothing, we properties are based on selection so we do not want to steal focus
      const fieldName = this.renderData?.renderProps?.focusField as string | undefined;
      if (fieldName) {
         this.focusField(fieldName);
      }
   }

   protected focusField(fieldName: string): void {
      setTimeout(() => {
         const input = this.node.querySelector(`#${fieldName}`) as HTMLInputElement | HTMLTextAreaElement;
         if (input) {
            input.focus();
         }
      }, 50);
   }

   protected override getModelProviderProps(): ModelProviderProps {
      const props = super.getModelProviderProps();
      // For mapping documents we don't want the Open/Save buttons in the property header.
      if (this.document?.root?.mapping) {
         return { ...props, onModelSave: undefined, onModelOpen: undefined };
      }
      return props;
   }
}
