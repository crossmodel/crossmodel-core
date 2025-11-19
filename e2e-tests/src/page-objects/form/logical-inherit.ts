/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { Locator } from '@playwright/test';
import { TheiaPageObject } from '@theia/playwright';

export class LogicalInherit extends TheiaPageObject {
   constructor(
      readonly locator: Locator,
      readonly section: any
   ) {
      super(section.app);
   }

   protected get parentCell(): Locator {
      return this.locator.locator('td').first();
   }

   protected get actionsCell(): Locator {
      return this.locator.locator('td').last();
   }

   async getParentId(): Promise<string> {
      // Try to read value from an input if present and visible (edit mode)
      const input = this.parentCell.locator('input').first();
      if ((await input.count()) > 0) {
         try {
            if (await input.isVisible()) {
               return input.inputValue();
            }
         } catch (e) {
            // fall through to view-mode checks
         }
      }

      // Otherwise get text content
      return (await this.parentCell.locator('span').first().textContent()) ?? '';
   }

   async setParentId(parentId: string): Promise<void> {
      // If an edit button is present (editing existing row), click it. New rows may already be editable.
      const pencil = this.actionsCell.locator('button:has(.pi-pencil)');
      if ((await pencil.count()) > 0) {
         try {
            await pencil.click();
         } catch (e) {
            // ignore click errors and continue
         }
      }

      // The field is expected to be a PrimeReact AutoComplete. Try to locate its input.
      const parentCell = this.locator.locator('td').first();
      const autocomplete = parentCell.locator('.p-autocomplete');
      let input = autocomplete.locator('input').first();

      // If no autocomplete present, fallback to any input in the cell
      if ((await autocomplete.count()) === 0) {
         input = parentCell.locator('input').first();
      }

      await input.waitFor({ state: 'visible', timeout: 2000 });

      // Try opening the dropdown first; if not present, type to filter
      const dropdown = autocomplete.locator('.p-autocomplete-dropdown');
      const panel = this.page.locator('.p-autocomplete-panel').first();

      let optionClicked = false;
      if ((await dropdown.count()) > 0) {
         try {
            await dropdown.click();
            await panel.waitFor({ state: 'visible', timeout: 1500 });
            // try to click the exact match
            const opt = panel.getByRole('option', { name: parentId });
            if ((await opt.count()) > 0) {
               await opt.click();
               optionClicked = true;
            }
         } catch (e) {
            // ignore and fall back to typing
         }
      }

      if (!optionClicked) {
         // Type to filter options and select the matching option
         await input.fill(parentId);
         try {
            await panel.waitFor({ state: 'visible', timeout: 1500 });
            const opt = panel.getByRole('option', { name: parentId });
            if ((await opt.count()) > 0) {
               await opt.click();
               optionClicked = true;
            } else {
               // fallback to first option
               const firstOpt = panel.locator('li').first();
               if ((await firstOpt.count()) > 0) {
                  await firstOpt.click();
                  optionClicked = true;
               }
            }
         } catch (e) {
            // last resort: press Enter to accept typed value
            await input.press('Enter');
         }
      }

      // Wait for the panel to hide if it was visible
      try {
         await panel.waitFor({ state: 'hidden', timeout: 1500 });
      } catch (e) {
         // ignore
      }

      // wait until the cell text updates
      await this.page.waitForTimeout(250);
   }

   async save(): Promise<void> {
      const saveButton = this.actionsCell.locator('button.p-row-editor-save');
      await saveButton.first().waitFor({ state: 'visible', timeout: 500 });
      await saveButton.first().click();
      await this.page.waitForTimeout(250);
   }

   async delete(): Promise<void> {
      const deleteButton = this.actionsCell.locator('button:has(.pi-trash)');
      await deleteButton.click();
      await this.page.waitForTimeout(200);
   }
}
