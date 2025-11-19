/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { waitForFunction } from '@eclipse-glsp/glsp-playwright';
import { Locator } from '@playwright/test';
import { TheiaPageObject } from '@theia/playwright';

export class LogicalIdentifier extends TheiaPageObject {
   constructor(
      readonly locator: Locator,
      section: any
   ) {
      super(section.app);
   }

   protected get nameLocator(): Locator {
      return this.locator.locator('td').first();
   }

   protected get primaryLocator(): Locator {
      return this.locator.locator('td').nth(1);
   }

   protected get attributeIdsLocator(): Locator {
      return this.locator.locator('td:nth-child(3)'); // More reliable than nth(2)
   }

   protected get descriptionLocator(): Locator {
      return this.locator.locator('td').nth(3);
   }

   protected get actionsLocator(): Locator {
      return this.locator.locator('td').last();
   }

   async getName(): Promise<string> {
      // First check if we're in edit mode
      const inputLocator = this.nameLocator.locator('input');
      if (await inputLocator.isVisible()) {
         // If in edit mode, get value from input
         const value = await inputLocator.inputValue();
         return value;
      }
      // Otherwise get text content
      return (await this.nameLocator.textContent()) ?? '';
   }

   async setName(name: string): Promise<void> {
      const inputLocator = this.nameLocator.locator('input');

      // If input is not immediately visible, enter edit mode
      if (!(await inputLocator.isVisible())) {
         await this.actionsLocator.locator('button:has(.pi-pencil)').click();
         await inputLocator.waitFor({ state: 'visible' });
      }

      // Just fill the name without saving
      await inputLocator.fill(name);
   }

   async isPrimary(): Promise<boolean> {
      const checkboxBox = this.primaryLocator.locator('.p-checkbox-box');
      try {
         await checkboxBox.waitFor({ state: 'attached', timeout: 300 });
         return (await checkboxBox.getAttribute('data-p-highlight')) === 'true';
      } catch (error) {
         return (await this.primaryLocator.locator('.pi-check').count()) === 1;
      }
   }

   async setPrimary(primary: boolean): Promise<void> {
      const checkbox = this.primaryLocator.locator('input[type="checkbox"]');

      // If checkbox is not immediately visible, enter edit mode
      if (!(await checkbox.isVisible())) {
         await this.actionsLocator.locator('button:has(.pi-pencil)').click();
         await checkbox.waitFor({ state: 'visible' });
      }

      const currentPrimary = await this.isPrimary();
      if (currentPrimary !== primary) {
         await checkbox.click();

         // Wait for the checkbox state to update
         const checkIcon = this.primaryLocator.locator('.p-checkbox-icon');
         if (primary) {
            await checkIcon.waitFor({ state: 'visible' });
         } else {
            await checkIcon.waitFor({ state: 'hidden' });
         }
      }

      await waitForFunction(async () => (await this.isPrimary()) === primary);
   }

   async save(): Promise<void> {
      const inputLocator = this.nameLocator.locator('input');
      const name = await this.getName();

      if (!name) {
         throw new Error('Cannot save identifier without a name');
      }

      // Only proceed if we're in edit mode
      if (!(await inputLocator.isVisible())) {
         throw new Error('Cannot save identifier - not in edit mode');
      }

      // Click the row-editor save button to avoid triggering global Enter handlers
      // which may open a new empty row in the grid. Wait for the save button to
      // appear and click it. If it doesn't appear within the timeout, throw so
      // the test fails explicitly instead of silently using Enter.
      const tableRow = this.locator; // row element
      const saveButton = tableRow.locator('button.p-row-editor-save');
      const visible = await saveButton
         .first()
         .waitFor({ state: 'visible', timeout: 3000 })
         .then(() => true)
         .catch(() => false);
      if (!visible) {
         throw new Error('Row save button did not appear; cannot save identifier reliably');
      }
      await saveButton.first().click();

      // Wait for edit mode to end
      await inputLocator.waitFor({ state: 'hidden', timeout: 5000 });
   }

   async getAttributes(): Promise<string[]> {
      try {
         await this.attributeIdsLocator.waitFor({ state: 'visible', timeout: 5000 });

         // If we're in edit mode, get from multiselect
         const multiselect = this.attributeIdsLocator.locator('.p-multiselect');
         if (await multiselect.isVisible()) {
            const tokens = await multiselect.locator('.p-multiselect-token');
            const labels = await tokens.locator('.p-multiselect-token-label').allTextContents();
            return labels;
         }

         // Otherwise get from the view mode cell content
         const text = await this.attributeIdsLocator.textContent();
         return text ? text.trim().split(', ') : [];
      } catch (error) {
         return [];
      }
   }

   async setAttributes(attributeIds: string[]): Promise<void> {
      // First ensure we can interact with the multiselect
      const multiSelect = this.attributeIdsLocator.locator('.p-multiselect');

      // If multiselect is not immediately visible or clickable, enter edit mode
      if (!(await multiSelect.isVisible()) || !(await multiSelect.isEnabled())) {
         await this.actionsLocator.locator('button:has(.pi-pencil)').click();
         await multiSelect.waitFor({ state: 'visible' });
         await this.page.waitForTimeout(300); // Wait for edit mode transition
      }

      // Click the multiselect to open the dropdown
      await multiSelect.click();

      // Wait for the panel and verify it's visible
      const panel = this.page.locator('.p-multiselect-panel');
      await panel.waitFor({ state: 'visible', timeout: 5000 });

      // Select or unselect attributes as needed
      const options = await panel.getByRole('option').all();
      for (const option of options) {
         const optionName = (await option.textContent())?.trim() ?? '';
         const isSelected = (await option.getAttribute('aria-selected')) === 'true';
         const shouldBeSelected = attributeIds.includes(optionName);

         // Toggle selection if needed
         if (isSelected !== shouldBeSelected) {
            await option.click();
            // Wait for the selection to register
            await this.page.waitForTimeout(100);
         }
      }

      // Close the panel
      const closeButton = panel.locator('.p-multiselect-close');
      await closeButton.waitFor({ state: 'visible' });
      await closeButton.click();
      await panel.waitFor({ state: 'hidden', timeout: 5000 });
   }

   async getDescription(): Promise<string> {
      return (await this.descriptionLocator.textContent()) ?? '';
   }

   async setDescription(description: string): Promise<void> {
      const inputLocator = this.descriptionLocator.locator('input');

      // If input is not immediately visible, enter edit mode
      if (!(await inputLocator.isVisible())) {
         await this.actionsLocator.locator('button:has(.pi-pencil)').click();
         await inputLocator.waitFor({ state: 'visible' });
      }

      await inputLocator.fill(description);
   }

   async delete(): Promise<void> {
      const deleteButton = this.actionsLocator.locator('button:has(.pi-trash)');
      await deleteButton.click();
   }
}
