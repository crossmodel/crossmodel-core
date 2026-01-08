/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { Widget } from '@lumino/widgets';
import { ApplicationShell } from '@theia/core/lib/browser';
import { UndoRedoHandler } from '@theia/core/lib/browser/undo-redo-handler';
import { inject, injectable } from '@theia/core/shared/inversify';

/**
 * Custom undo/redo handler that works with CompositeEditor instances and other widgets with undo/redo support.
 * This handler integrates with Theia's undo/redo commands (Ctrl+Z/Ctrl+Shift+Z)
 * and delegates to CompositeEditor or other undo/redo-capable widgets, including property widgets.
 */
@injectable()
export class CompositeUndoRedoHandler implements UndoRedoHandler<Widget> {
   @inject(ApplicationShell)
   protected readonly shell: ApplicationShell;

   readonly priority = 100; // Higher than default to take precedence

   select(): Widget | undefined {
      return this.shell.activeWidget ?? undefined;
   }

   undo(): void {
      const target = this.findFocusedUndoableWidget();
      if (target && typeof (target as any).undo === 'function') {
         (target as any).undo();
      }
   }

   redo(): void {
      const target = this.findFocusedUndoableWidget();
      if (target && typeof (target as any).redo === 'function') {
         (target as any).redo();
      }
   }

   /**
    * Prefer the widget that currently owns focus; fall back to active widget, then property view.
    */
   private findFocusedUndoableWidget(): Widget | undefined {
      const focused = this.findWidgetContainingActiveElement();
      if (focused && typeof (focused as any).undo === 'function') {
         return focused;
      }

      const active = this.shell.activeWidget;
      if (active && typeof (active as any).undo === 'function') {
         return active;
      }

      return this.findPropertyViewWidgetWithContent();
   }

   /** Locate the widget whose DOM node currently contains the active element. */
   private findWidgetContainingActiveElement(): Widget | undefined {
      const activeElement = document.activeElement;
      if (!activeElement) {
         return undefined;
      }

      for (const widget of this.shell.widgets) {
         if (widget.node && widget.node.contains(activeElement)) {
            const asAny = widget as any;
            if (asAny.contentWidget && asAny.contentWidget.node?.contains(activeElement)) {
               return asAny.contentWidget;
            }
            return widget;
         }
      }
      return undefined;
   }

   /** Find a property view widget in the shell and return its content widget. */
   private findPropertyViewWidgetWithContent(): Widget | undefined {
      for (const widget of this.shell.widgets) {
         const asAny = widget as any;
         if (asAny.contentWidget && typeof asAny.contentWidget.undo === 'function') {
            return asAny.contentWidget;
         }
      }
      return undefined;
   }
}
