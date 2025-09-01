import * as React from 'react';

/**
 * Handles keyboard events for editors within a PrimeDataGrid.
 * - For AutoComplete, it allows the component to handle Enter/Escape when the suggestion panel is open.
 * - For all editors, it triggers row save on Enter and cancel on Escape when the panel is closed.
 */
export const handleGridEditorKeyDown = (e: React.KeyboardEvent) => {
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
   if (!editingRow) return;

   if (e.key === 'Enter') {
      e.preventDefault();
      const saveButton = editingRow.querySelector('.p-row-editor-save') as HTMLButtonElement;
      if (saveButton) {
         setTimeout(() => saveButton.click(), 0);
      }
   } else if (e.key === 'Escape') {
      e.preventDefault();
      const cancelButton = editingRow.querySelector('.p-row-editor-cancel') as HTMLButtonElement;
      if (cancelButton) {
         cancelButton.click();
      }
   }
};
