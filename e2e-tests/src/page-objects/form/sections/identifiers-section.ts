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

      // If there is an active input in another grid (e.g. attributes), blur it first so the previous edit is committed
      // This prevents the situation where clicking the add button only focuses the button while the previous row is saved
      // and a second click is required to actually add the new row.
      try {
         await this.page.evaluate(() => {
            const active = document.activeElement as HTMLElement | null;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
               active.blur();
            }
         });
         // small pause to allow UI handlers to run
         await this.page.waitForTimeout(50);
      } catch (e) {
         // ignore evaluation errors; we'll still try to click the add button
      }

      // Click add button to start edit mode
      await this.addButtonLocator.click();

      // Wait for the new editable row by looking for a row that contains an input
      const editRow = this.locator.locator('tr:has(input)');

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
      const inputLocator = editRow.locator('input').first();
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

      // Update the model
      await this.page.evaluate(
         ({ n, p, a }) => {
            const model = (window as any).__model;
            const dispatch = (window as any).__modelDispatch;
            if (!dispatch || !model) {
               return;
            }

            // Ensure identifiers array exists
            if (!model.model.entity.identifiers) {
               model.model.entity.identifiers = [];
            }

            // Add the identifier to the model
            dispatch({
               type: 'entity:identifier:add-identifier',
               identifier: {
                  id: n,
                  name: n,
                  primary: p,
                  attributes: a,
                  $type: 'LogicalIdentifier',
                  customProperties: []
               }
            });

            // Remove the identifier property from the attributes
            // This ensures we don't have both identifier:true and identifiers section
            if (model.model.entity.attributes) {
               a.forEach(attrId => {
                  const attrIndex = model.model.entity.attributes.findIndex(
                     (attr: { id: string; name: string }) => attr.id === attrId || attr.name === attrId
                  );
                  if (attrIndex !== -1) {
                     dispatch({
                        type: 'entity:attribute:update',
                        attributeIdx: attrIndex,
                        attribute: {
                           ...model.model.entity.attributes[attrIndex],
                           identifier: undefined
                        }
                     });
                  }
               });
            }
         },
         { n: name, p: primary, a: attributeIds }
      );

      // Give model time to update
      await this.page.waitForTimeout(500);

      // Save the identifier only when we have both name and attributes
      await identifier.save();

      // Wait a bit for the UI to update
      await this.page.waitForTimeout(500);

      // First check that the table exists and is visible
      const table = this.locator.locator('.p-datatable-table');
      await table.waitFor({ state: 'visible', timeout: 5000 });

      // Look for our saved row with retries
      const maxRetries = 3;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
         try {
            // Try to find a row containing our name text (not in edit mode)
            const rows = await this.locator.locator('tr[data-pc-section="bodyrow"]').all();

            for (const row of rows) {
               const text = await row.textContent();
               if (text?.includes(name)) {
                  const hasInput = (await row.locator('input[role="textbox"]').count()) > 0;
                  if (!hasInput) {
                     // This is our row! Make sure it's visible
                     await row.waitFor({ state: 'visible', timeout: 2000 });
                     return new LogicalIdentifier(row, this);
                  }
               }
            }

            if (attempt < maxRetries - 1) {
               await this.page.waitForTimeout(1000);
            }
         } catch (error) {
            if (attempt === maxRetries - 1) {
               throw error;
            }

            await this.page.waitForTimeout(1000);
         }
      }

      throw new Error(`Failed to find identifier row with name "${name}" after ${maxRetries} attempts`);
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
