/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { defined } from '@eclipse-glsp/glsp-playwright';
import { Locator } from '@playwright/test';
import { FormSection } from '../cm-form';
import { LogicalIdentifier } from '../logical-identifier';

export class LogicalEntityIdentifiersSection extends FormSection {
   readonly addButtonLocator: Locator;

   constructor(form: any) {
      super(form, 'Identifiers');
      this.addButtonLocator = this.locator.locator('button:has-text("Add Identifier")');
   }

   async startAddIdentifier(): Promise<LogicalIdentifier> {
      // Ensure attributes section is expanded, following the same pattern as attributes section
      const header = this.locator.locator('.p-accordion-header');
      const isExpanded = (await header.getAttribute('class'))?.includes('p-highlight');
      if (!isExpanded) {
         await header.click();
         // Wait for accordion animation to complete
         await this.page.waitForTimeout(300);
      }

      // Wait for the table to be visible
      await this.locator.locator('.p-datatable-table').waitFor({ state: 'visible' });

      // Click add button to start edit mode
      await this.addButtonLocator.click();

      // Wait for the new editable row by looking for a row that contains an input
      const editRow = this.locator.locator('tr:has(td:not(.p-selection-column):not(.p-reorder-column) input[type="text"])');

      // First wait for the row to be attached to the DOM (faster than visible and avoids animation delays)
      try {
         await editRow.first().waitFor({ state: 'attached', timeout: 1000 });
      } catch (err) {
         // If the row didn't appear, the first click may have only triggered saving of a previous edit.
         // Retry the add click once and wait again.
         await this.page.waitForTimeout(100);
         await this.addButtonLocator.click();
         await editRow.first().waitFor({ state: 'attached', timeout: 1000 });
      }

      // Then try to wait for the input to become visible. If it's attached but not visible (e.g. due to animation),
      // fall back to the attached input so we don't time out.
      const inputLocator = editRow.locator('td:not(.p-selection-column):not(.p-reorder-column) input[type="text"]').first();
      try {
         await inputLocator.waitFor({ state: 'visible', timeout: 1000 });
      } catch (e) {
         // Input didn't turn visible in time — ensure it's attached so callers can interact (focus/type) as needed
         await inputLocator.waitFor({ state: 'attached', timeout: 1000 });
      }

      // Return the identifier in edit mode
      return new LogicalIdentifier(editRow, this);
   }

   async commitIdentifierAdd(
      identifier: LogicalIdentifier,
      name: string,
      attributeIds: string[],
      primary = false
   ): Promise<LogicalIdentifier> {
      if (!name) {
         throw new Error('Identifier name is required to save the row');
      }

      // First set the name without saving
      await identifier.setName(name);

      // Set the attributes in the UI
      if (attributeIds.length > 0) {
         await identifier.setAttributes(attributeIds);
      }

      // Set primary if needed
      if (primary) {
         await identifier.setPrimary(true);
      }

      // Save the identifier via the UI row save to trigger the normal grid flow.
      // This avoids dispatching model updates directly from the test, which can
      // race with the grid and produce stray empty edit rows.
      await identifier.save();

      // Wait a bit for the UI and model to update via the grid's normal flow
      await this.page.waitForTimeout(500);

      return identifier;
   }

   async getAllIdentifiers(): Promise<LogicalIdentifier[]> {
      const identifierLocators = await this.locator.locator('tr[data-pc-section="bodyrow"]').all();
      return identifierLocators.map(locator => new LogicalIdentifier(locator, this));
   }

   async getIdentifier(name: string): Promise<LogicalIdentifier> {
      return defined(await this.findIdentifier(name));
   }

   async findIdentifier(name: string): Promise<LogicalIdentifier | undefined> {
      const identifierLocators = await this.locator.locator('tr[data-pc-section="bodyrow"]').all();
      for (const locator of identifierLocators) {
         const identifier = new LogicalIdentifier(locator, this);
         if ((await identifier.getName()) === name) {
            return identifier;
         }
      }
      return undefined;
   }

   async deleteIdentifier(name: string): Promise<void> {
      const identifier = await this.findIdentifier(name);
      if (identifier) {
         await identifier.delete();
      }
   }
}
