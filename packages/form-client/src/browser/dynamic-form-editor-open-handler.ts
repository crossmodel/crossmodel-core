/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { ModelFileExtensions } from '@crossmodel/protocol';
import { nls } from '@theia/core';
import { FrontendApplicationContribution, NavigatableWidgetOpenHandler, OpenWithHandler, OpenWithService } from '@theia/core/lib/browser';
import URI from '@theia/core/lib/common/uri';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { DynamicFormEditorWidget } from './dynamic-form-editor-widget';

@injectable()
export class DynamicFormEditorOpenHandler
   extends NavigatableWidgetOpenHandler<DynamicFormEditorWidget>
   implements OpenWithHandler, FrontendApplicationContribution
{
   static ID = 'dynamic-form-editor-opener';

   readonly id = DynamicFormEditorOpenHandler.ID;
   readonly label = nls.localize('form-client/dynamic-form-editor', 'Dynamic Form Editor');

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
      return uri.path.ext === '.cm' ? 3000 : -1;
   }
}

export function createDynamicFormEditorId(uri: string, counter?: number): string {
   return DynamicFormEditorOpenHandler.ID + `:${uri}` + (counter !== undefined ? `:${counter}` : '');
}
