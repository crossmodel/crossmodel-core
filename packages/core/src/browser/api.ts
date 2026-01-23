/********************************************************************************
 * Copyright (c) 2026 CrossBreeze.
 ********************************************************************************/
import { EditorOpenerOptions } from '@theia/editor/lib/browser';

export interface CompositeEditorOpenerOptions extends EditorOpenerOptions {
   perspective?: 'code' | 'primary';
}
