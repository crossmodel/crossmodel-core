/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { CrossModelWidget, CrossModelWidgetOptions } from '@crossmodel/core/lib/browser';
import { NavigatableWidget, NavigatableWidgetOptions } from '@theia/core/lib/browser';
import { CommandService } from '@theia/core/lib/common/command';
import { CommonCommands } from '@theia/core/lib/browser/common-frontend-contribution';
import URI from '@theia/core/lib/common/uri';
import { injectable, postConstruct, inject } from '@theia/core/shared/inversify';

export interface FormEditorWidgetOptions extends CrossModelWidgetOptions, NavigatableWidgetOptions {
   uri: string;
}

@injectable()
export class FormEditorWidget extends CrossModelWidget implements NavigatableWidget {
   protected override options: FormEditorWidgetOptions;

   @inject(CommandService)
   protected readonly commandService: CommandService;

   protected override handleOpenRequest = undefined; // we do not need to support opening in editor, we are the editor

   protected override getModelProviderProps(): any {
      const props = super.getModelProviderProps();

      return {
         ...props,
         onModelSave: async () => {
            await this.commandService.executeCommand(CommonCommands.SAVE.id);
         }
      };
   }

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
