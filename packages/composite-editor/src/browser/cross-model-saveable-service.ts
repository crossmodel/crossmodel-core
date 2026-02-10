/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { MaybePromise, URI } from '@theia/core';
import {
   Navigatable,
   PostCreationSaveableWidget,
   Saveable,
   SaveableSource,
   SaveableWidget,
   SaveOptions,
   SaveReason,
   ShouldSaveDialog,
   Widget
} from '@theia/core/lib/browser';
import { injectable } from '@theia/core/shared/inversify';
import { FilesystemSaveableService } from '@theia/filesystem/lib/browser/filesystem-saveable-service';

export interface DefaultSaveAsSaveableSource extends SaveableSource {
   getSaveAsUri(): MaybePromise<URI | undefined>;
}

export namespace DefaultSaveAsSaveableSource {
   export function is(candidate: SaveableSource): candidate is DefaultSaveAsSaveableSource {
      return 'getSaveAsUri' in candidate && typeof candidate.getSaveAsUri === 'function';
   }
}

@injectable()
export class CrossModelSaveableService extends FilesystemSaveableService {
   /** Allows us to save as without opening the newly saved file. Improves behavior when saving because of close. */
   private noOpenSaveAsProxy = new Proxy(this, {
      get(service, p, _receiver) {
         if (p === 'openerService') {
            return {
               getOpener() {
                  return {
                     open(): void {
                        /* no-op */
                     }
                  };
               }
            };
         }
         return service[p as keyof CrossModelSaveableService];
      }
   });

   override async saveAs(sourceWidget: Widget & SaveableSource & Navigatable, options?: SaveOptions | undefined): Promise<URI | undefined> {
      const defaultSaveAsUri = DefaultSaveAsSaveableSource.is(sourceWidget) && (await sourceWidget.getSaveAsUri());
      if (defaultSaveAsUri && !(await this.fileService.exists(defaultSaveAsUri))) {
         try {
            /** On close, saveAs is called with SaveReason.AfterDelay. */
            const shouldOpen = options?.saveReason === undefined || options.saveReason === SaveReason.Manual;
            await (shouldOpen
               ? this.saveSnapshot(sourceWidget, defaultSaveAsUri, false)
               : this.saveSnapshot.call(this.noOpenSaveAsProxy, sourceWidget, defaultSaveAsUri, false));
            return defaultSaveAsUri;
         } catch (e) {
            console.warn(e);
         }
      }
      return super.saveAs(sourceWidget, options);
   }

   /** Workaround for https://github.com/eclipse-theia/theia/issues/15501 */
   override async shouldSaveWidget(
      widget: PostCreationSaveableWidget,
      options?: SaveableWidget.CloseOptions | undefined
   ): Promise<boolean | undefined> {
      if (!Saveable.isDirty(widget)) {
         return false;
      }
      const saveable = Saveable.get(widget);
      if (this.autoSave !== 'off' && (!saveable || this.shouldAutoSave(widget, saveable))) {
         return true;
      }
      const notLastWithDocument = !Saveable.closingWidgetWouldLoseSaveable(widget, Array.from(this.saveThrottles.keys()));
      if (notLastWithDocument) {
         await widget.closeWithoutSaving(false);
         return undefined;
      }
      if (options && options.shouldSave) {
         return options.shouldSave();
      }
      return new ShouldSaveDialog(widget).open();
   }
}
