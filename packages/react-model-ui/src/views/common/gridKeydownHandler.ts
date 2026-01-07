/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import * as React from 'react';
import { focusTable } from './focusManagement';

// Global flag to track if save was triggered by Enter key
let saveTriggeredByEnter = false;

/**
 * Check if the last save was triggered by Enter key
 */
export const wasSaveTriggeredByEnter = (): boolean => {
   const result = saveTriggeredByEnter;
   saveTriggeredByEnter = false;
   return result;
};

/**
 * Handles keyboard events for editors within a PrimeDataGrid.
 * - For AutoComplete, it allows the component to handle Enter/Escape when the suggestion panel is open.
 * - For all editors, it triggers row save on Enter and cancel on Escape when the panel is closed.
 */
export const handleGridEditorKeyDown = (e: React.KeyboardEvent): void => {
   const target = e.target as HTMLElement;

   // Special handling for AutoComplete: let it manage its own panel.
   if (target.classList.contains('p-autocomplete-input')) {
      const panel = document.querySelector('.p-autocomplete-panel') as HTMLElement;
      // Check if the panel is visible.
      if (panel && panel.offsetParent) {
         if (e.key === 'Enter' || e.key === 'Escape') {
            return; // Let the AutoComplete component handle the event.
         }
      }
   }

   const editingRow = target.closest('tr');
   if (!editingRow) {
      return;
   }

   if (e.key === 'Enter') {
      // Let inputs (e.g., number fields) process Enter, then trigger the save button next frame
      saveTriggeredByEnter = true;
      const saveButton = editingRow.querySelector('.p-row-editor-save') as HTMLButtonElement;
      if (saveButton) {
         requestAnimationFrame(() => {
            saveButton.click();

            // Move focus off the cell editor so Ctrl+Z goes to the global undo handler
            const table = (editingRow.closest('.p-datatable') ?? undefined) as HTMLElement | undefined;
            focusTable(table);
         });
      }
   } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      const cancelButton = editingRow.querySelector('.p-row-editor-cancel') as HTMLButtonElement;
      if (cancelButton) {
         cancelButton.click();
      }
   }
};

// Route ctrl/cmd + Z / Y from focused inputs to the model undo/redo handlers
export const handleUndoRedoKeys = (
   e: React.KeyboardEvent,
   canUndo: (() => boolean) | undefined,
   canRedo: (() => boolean) | undefined,
   undo: (() => boolean) | undefined,
   redo: (() => boolean) | undefined
): void => {
   const isCtrlOrMeta = e.ctrlKey || e.metaKey;
   if (!isCtrlOrMeta) {
      return;
   }

   // Undo
   if ((e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
      if (canUndo && canUndo()) {
         e.preventDefault();
         e.stopPropagation();
         undo?.();
      }
      return;
   }

   // Redo
   const redoCombo = (e.key === 'z' || e.key === 'Z') && e.shiftKey;
   if (redoCombo || e.key === 'y' || e.key === 'Y') {
      if (canRedo && canRedo()) {
         e.preventDefault();
         e.stopPropagation();
         redo?.();
      }
   }
};
