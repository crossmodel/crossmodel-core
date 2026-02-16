/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { Disposable, URI } from '@theia/core';
import { injectable } from '@theia/core/shared/inversify';
import { FileResourceResolver } from '@theia/filesystem/lib/browser';

@injectable()
export class CrossModelFileResourceResolver extends FileResourceResolver {
   protected _autoOverwrite = false;

   /** URIs whose files are currently managed by a composite editor. */
   protected managedUris = new Set<string>();

   get autoOverwrite(): boolean {
      return this._autoOverwrite;
   }

   set autoOverwrite(value: boolean) {
      this._autoOverwrite = value;
   }

   /**
    * Register a URI as being managed by a composite editor. While managed,
    * any `shouldOverwrite` prompt for this URI is automatically accepted
    * so that co-editors (standalone text editors for the same file) never
    * show the "file changed on disk" dialog.
    *
    * @returns a {@link Disposable} that removes the URI when called.
    */
   addManagedUri(uri: string): Disposable {
      this.managedUris.add(uri);
      return Disposable.create(() => this.managedUris.delete(uri));
   }

   protected override async shouldOverwrite(uri: URI): Promise<boolean> {
      if (this.autoOverwrite) {
         return true;
      }
      if (this.managedUris.has(uri.toString())) {
         return true;
      }
      // default: ask user via dialog whether they want to overwrite the file content
      return super.shouldOverwrite(uri);
   }
}
