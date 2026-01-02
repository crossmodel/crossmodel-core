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
      const activeWidget = this.shell.activeWidget;

      // Try the active widget first
      if (activeWidget && typeof (activeWidget as any).undo === 'function') {
         (activeWidget as any).undo();
         return;
      }

      // If active widget doesn't have undo, check if it's a property view widget
      // and delegate to its content widget
      const propertyViewWidget = this.findPropertyViewWidgetWithContent();
      if (propertyViewWidget && typeof (propertyViewWidget as any).undo === 'function') {
         (propertyViewWidget as any).undo();
         return;
      }
   }

   redo(): void {
      const activeWidget = this.shell.activeWidget;

      // Try the active widget first
      if (activeWidget && typeof (activeWidget as any).redo === 'function') {
         (activeWidget as any).redo();
         return;
      }

      // If active widget doesn't have redo, check if it's a property view widget
      // and delegate to its content widget
      const propertyViewWidget = this.findPropertyViewWidgetWithContent();
      if (propertyViewWidget && typeof (propertyViewWidget as any).redo === 'function') {
         (propertyViewWidget as any).redo();
         return;
      }
   }

   /**
    * Find a property view widget in the shell and return its content widget if available.
    */
   private findPropertyViewWidgetWithContent(): Widget | undefined {
      for (const widget of this.shell.widgets) {
         // Check if this is a property view widget (by class name or checking for getContentWidget)
         const asAny = widget as any;
         if (asAny.contentWidget && typeof asAny.contentWidget.undo === 'function') {
            return asAny.contentWidget;
         }
      }
      return undefined;
   }
}
