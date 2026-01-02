/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import * as React from 'react';

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
            const table = editingRow.closest('.p-datatable') as HTMLElement | null;
            if (table) {
               if (!table.hasAttribute('tabindex')) {
                  table.setAttribute('tabindex', '-1');
               }
               table.focus({ preventScroll: true });
            } else {
               (document.activeElement as HTMLElement | null)?.blur?.();
            }
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
