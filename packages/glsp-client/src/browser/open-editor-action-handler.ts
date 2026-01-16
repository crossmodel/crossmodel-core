/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { CompositeEditorOpenerOptions } from '@crossmodel/core/lib/browser';
import { OpenCompositeEditorAction } from '@crossmodel/protocol';
import { IActionHandler } from '@eclipse-glsp/client';
import { URI } from '@theia/core';
import { OpenerService, open } from '@theia/core/lib/browser';
import { inject, injectable } from '@theia/core/shared/inversify';

/**
 * Action handler for opening elements in the form editor.
 */
@injectable()
export class OpenCompositeEditorActionHandler implements IActionHandler {
   @inject(OpenerService) protected readonly openerService: OpenerService;

   handle(action: OpenCompositeEditorAction): void {
      open(this.openerService, new URI(action.uri), { perspective: action.perspective } as CompositeEditorOpenerOptions);
   }
}
