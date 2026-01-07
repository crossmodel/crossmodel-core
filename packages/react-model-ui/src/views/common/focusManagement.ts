/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

/**
 * Focus a table element or wrapper div with proper tabindex handling.
 * Tries the primary element first, falls back to wrapper if needed.
 *
 * @param tableElement - The table element to focus (from getElement() or closest())
 * @param wrapperElement - Optional fallback wrapper element to focus
 */
export const focusTable = (tableElement?: HTMLElement, wrapperElement?: HTMLElement): void => {
   if (tableElement) {
      if (!tableElement.hasAttribute('tabindex')) {
         tableElement.setAttribute('tabindex', '-1');
      }
      tableElement.focus({ preventScroll: true });
   } else if (wrapperElement) {
      // Fallback: focus the wrapper div if table element is not available
      if (!wrapperElement.hasAttribute('tabindex')) {
         wrapperElement.setAttribute('tabindex', '-1');
      }
      wrapperElement.focus({ preventScroll: true });
   }
};

/**
 * Refocus the property widget container after autocomplete dropdown closes.
 * This ensures undo/redo is available again in the property view.
 */
export const refocusPropertyWidget = (): void => {
   setTimeout(() => {
      const propertyWidget = document.querySelector('[id="model-property-view"]');
      if (propertyWidget) {
         (propertyWidget as HTMLElement).focus();
      }
   }, 0);
};
