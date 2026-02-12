/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { ModelFileExtensions } from '@crossmodel/protocol';
import { nls } from '@theia/core';
import { FrontendApplicationContribution, NavigatableWidgetOpenHandler, OpenWithHandler, OpenWithService } from '@theia/core/lib/browser';
import URI from '@theia/core/lib/common/uri';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { FormEditorWidget } from './form-editor-widget';

@injectable()
export class FormEditorOpenHandler
   extends NavigatableWidgetOpenHandler<FormEditorWidget>
   implements OpenWithHandler, FrontendApplicationContribution
{
   static ID = 'form-editor-opener';

   readonly id = FormEditorOpenHandler.ID; // must match the id of the widget factory
   readonly label = nls.localize('form-client/form-editor', 'Form Editor');

   @inject(OpenWithService) protected readonly openWithService: OpenWithService;

   initialize(): void {
      // ensure this class is instantiated early
   }

   @postConstruct()
   protected override init(): void {
      this.openWithService.registerHandler(this);
      super.init();
   }

   canHandle(uri: URI): number {
      const base = uri.path.base;
      if (base.endsWith(ModelFileExtensions.SystemDiagram) || base.endsWith(ModelFileExtensions.Mapping)) {
         return -1;
      }
      return uri.path.ext === '.cm' ? 1 : -1;
   }
}

export function createFormEditorId(uri: string, counter?: number): string {
   // ensure we create a unique ID
   return FormEditorOpenHandler.ID + `:${uri}` + (counter !== undefined ? `:${counter}` : '');
}
