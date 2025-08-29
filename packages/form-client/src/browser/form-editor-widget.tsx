/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { CrossModelWidget, CrossModelWidgetOptions } from '@crossmodel/core/lib/browser';
import { NavigatableWidget, NavigatableWidgetOptions } from '@theia/core/lib/browser';
import URI from '@theia/core/lib/common/uri';
import { injectable, postConstruct } from '@theia/core/shared/inversify';

export interface FormEditorWidgetOptions extends CrossModelWidgetOptions, NavigatableWidgetOptions {
   uri: string;
}

@injectable()
export class FormEditorWidget extends CrossModelWidget implements NavigatableWidget {
   protected override options: FormEditorWidgetOptions;

   protected override handleOpenRequest = undefined; // we do not need to support opening in editor, we are the editor
   protected override handleSaveRequest = undefined; // we do not need to support saving through the widget itself, we are a Theia editor

   @postConstruct()
   override init(): void {
      super.init();
      this.title.label = this.labelProvider.getName(new URI(this.options.uri));
   }

   getResourceUri(): URI {
      return new URI(this.options.uri);
   }

   createMoveToUri(resourceUri: URI): URI | undefined {
      return resourceUri;
   }
}
