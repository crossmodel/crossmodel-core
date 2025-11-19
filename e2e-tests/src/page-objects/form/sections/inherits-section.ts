/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { defined } from '@eclipse-glsp/glsp-playwright';
import { Locator } from '@playwright/test';
import { FormSection } from '../cm-form';
import { LogicalInherit } from '../logical-inherit';

export class LogicalEntityInheritsSection extends FormSection {
   readonly addButtonLocator: Locator;

   constructor(form: any) {
      super(form, 'Inheritance');
      this.addButtonLocator = this.locator.locator('button:has-text("Add Parent Entity")');
   }

   async startAddInherit(): Promise<LogicalInherit> {
      const header = this.locator.locator('.p-accordion-header');
      const isExpanded = (await header.getAttribute('class'))?.includes('p-highlight');
      if (!isExpanded) {
         await header.click();
         await this.page.waitForTimeout(300);
      }

      await this.locator.locator('.p-datatable-table').waitFor({ state: 'visible' });
      await this.addButtonLocator.click();

      // New rows may render an AutoComplete control rather than a plain input.
      // Wait for the table to contain a visible input (autocomplete input or plain input),
      // then identify the corresponding body row by index so we have a stable locator.
      const table = this.locator.locator('.p-datatable-table');
      const inputSelector = 'input, .p-autocomplete input';

      // Wait for any input inside the table to appear and be visible
      const inputInTable = table.locator(inputSelector).first();
      await inputInTable.waitFor({ state: 'visible', timeout: 3000 });

      // Find which bodyrow contains that visible input by scanning rows
      const rows = this.locator.locator('tr[data-pc-section="bodyrow"]');
      const rowCount = await rows.count();
      for (let i = 0; i < rowCount; i++) {
         const r = rows.nth(i);
         const candidateInput = r.locator(inputSelector).first();
         if ((await candidateInput.count()) > 0) {
            try {
               if (await candidateInput.isVisible()) {
                  return new LogicalInherit(r, this);
               }
            } catch (e) {
               // ignore and continue
            }
         }
      }

      // If we didn't find it by scanning rows, fall back to the first row.
      return new LogicalInherit(rows.first(), this);
   }

   async commitInheritAdd(inherit: LogicalInherit, parentId: string): Promise<LogicalInherit> {
      if (!parentId) {
         throw new Error('Parent id is required to save inherit row');
      }

      await inherit.setParentId(parentId);
      await inherit.save();

      // wait for UI/model to update
      await this.page.waitForTimeout(500);

      return inherit;
   }

   async getAllInherits(): Promise<LogicalInherit[]> {
      const rows = await this.locator.locator('tr[data-pc-section="bodyrow"]').all();
      return rows.map(r => new LogicalInherit(r, this));
   }

   async getInherit(parentId: string): Promise<LogicalInherit> {
      return defined(await this.findInherit(parentId));
   }

   async findInherit(parentId: string): Promise<LogicalInherit | undefined> {
      const rows = await this.locator.locator('tr[data-pc-section="bodyrow"]').all();
      for (const row of rows) {
         const item = new LogicalInherit(row, this);
         if ((await item.getParentId()) === parentId) {
            return item;
         }
      }
      return undefined;
   }

   async deleteInherit(parentId: string): Promise<void> {
      const item = await this.findInherit(parentId);
      if (item) {
         await item.delete();
      }
   }
}
