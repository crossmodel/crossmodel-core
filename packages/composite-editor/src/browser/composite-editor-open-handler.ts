/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { ModelFileExtensions, ModelFileType } from '@crossmodel/protocol';
import { RecursivePartial, URI } from '@theia/core';
import {
   FrontendApplicationContribution,
   NavigatableWidgetOpenHandler,
   NavigatableWidgetOptions,
   OpenWithHandler,
   OpenWithService
} from '@theia/core/lib/browser';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { Range } from '@theia/core/shared/vscode-languageserver-types';
import { EditorOpenerOptions } from '@theia/editor/lib/browser';
import { CompositeEditor } from './composite-editor';

export interface CompositeEditorOptions extends NavigatableWidgetOptions {
   selection?: RecursivePartial<Range>;
   fileType: Exclude<ModelFileType, 'Generic'>;
   initialTab?: 'primary' | 'code';
}

@injectable()
export class CompositeEditorOpenHandler
   extends NavigatableWidgetOpenHandler<CompositeEditor>
   implements OpenWithHandler, FrontendApplicationContribution
{
   static readonly ID = 'cm-composite-editor-handler';
   static readonly PRIORITY = 2000;

   @inject(OpenWithService)
   protected readonly openWithService: OpenWithService;

   readonly id = CompositeEditorOpenHandler.ID;
   readonly label = 'Composite Editor';

   @postConstruct()
   protected override init(): void {
      super.init();
      this.openWithService.registerHandler(this);
   }

   initialize(): void {
      // ensure this class is instantiated early
   }

   protected override createWidgetOptions(resourceUri: URI, options?: EditorOpenerOptions): CompositeEditorOptions {
      const { kind, uri } = super.createWidgetOptions(resourceUri, options);
      const fileType = ModelFileExtensions.getFileType(uri);
      if (fileType === undefined || fileType === 'Generic') {
         throw new Error(`Cannot open a composite editor for the file type ${fileType}`);
      }
      return {
         kind,
         uri,
         fileType,
         initialTab: (options as any)?.initialTab
      };
   }

   override async open(uri: URI, options?: EditorOpenerOptions): Promise<CompositeEditor> {
      const widget = await super.open(uri, options);
      if (options?.selection) {
         widget.revealCodeTab(options);
      }
      return widget;
   }

   canHandle(uri: URI, _options?: EditorOpenerOptions): number {
      const fileType = ModelFileExtensions.getFileType(uri.path.base);
      return fileType !== undefined && fileType !== 'Generic' ? CompositeEditorOpenHandler.PRIORITY : -1;
   }
}

export function createCompositeEditorId(uri: string, counter?: number): string {
   // ensure we create a unique ID
   return CompositeEditorOpenHandler.ID + `:${uri}` + (counter !== undefined ? `:${counter}` : '');
}
