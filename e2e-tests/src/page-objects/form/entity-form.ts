/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { defined, waitForFunction } from '@eclipse-glsp/glsp-playwright';
import { Locator } from '@playwright/test';
import { TheiaPageObject } from '@theia/playwright';
import { TheiaView } from '@theia/playwright/lib/theia-view';
import { CMForm, FormIcons, FormSection, FormType } from './cm-form';

export class LogicalEntityForm extends CMForm {
   readonly iconClass = FormIcons.LogicalEntity;
   readonly generalSection: LogicalEntityGeneralSection;
   readonly attributesSection: LogicalEntityAttributesSection;

   constructor(view: TheiaView, baseSelector: string, formType: FormType) {
      super(view, baseSelector, formType);
      this.generalSection = new LogicalEntityGeneralSection(this);
      this.attributesSection = new LogicalEntityAttributesSection(this);
   }
}

export class LogicalEntityGeneralSection extends FormSection {
   constructor(form: LogicalEntityForm) {
      super(form, 'General');
   }

   async getName(): Promise<string> {
      return this.form.locator.getByLabel('Name').inputValue();
   }

   async setName(name: string): Promise<void> {
      await this.form.locator.getByLabel('Name').fill(name);
      // After setting the name, update the form's internal formName

      return this.page.waitForTimeout(250);
   }

   async getDescription(): Promise<string> {
      const descriptionLocator = this.locator.getByLabel('Description');
      await descriptionLocator.waitFor({ state: 'visible' });
      return (await descriptionLocator.textContent()) ?? '';
   }

   async setDescription(description: string): Promise<void> {
      const descriptionLocator = this.locator.getByLabel('Description');
      await descriptionLocator.waitFor({ state: 'visible' });
      await descriptionLocator.fill(description);
      return this.page.waitForTimeout(250);
   }
}

export class LogicalEntityAttributesSection extends FormSection {
   readonly addButtonLocator: Locator;
   constructor(form: LogicalEntityForm) {
      super(form, 'Attributes');
      this.addButtonLocator = this.locator.locator('button:has-text("Add Attribute")');
   }

   async addAttribute(): Promise<LogicalAttribute> {
      const header = this.locator.locator('.p-accordion-header');
      const isExpanded = (await header.getAttribute('class'))?.includes('p-highlight');
      if (!isExpanded) {
         await header.click();
      }
      const allAttributes = this.locator.locator('tr[data-pc-section="bodyrow"]');
      const initialCount = await allAttributes.count();
      await this.addButtonLocator.click();
      await this.page.keyboard.press('Enter');
      await waitForFunction(async () => (await allAttributes.count()) > initialCount);
      // The new table uses <tr> elements for rows, with a PrimeReact-specific attribute
      const lastAttribute = allAttributes.last();
      await waitForFunction(async () => (await lastAttribute.locator('td').first().textContent()) !== '');
      return new LogicalAttribute(lastAttribute, this);
   }

   async getAllAttributes(): Promise<LogicalAttribute[]> {
      // The new table uses <tr> elements for rows, with a PrimeReact-specific attribute
      const attributeLocators = await this.locator.locator('tr[data-pc-section="bodyrow"]').all();
      return attributeLocators.map(locator => new LogicalAttribute(locator, this));
   }

   async getAttribute(name: string): Promise<LogicalAttribute> {
      return defined(await this.findAttribute(name));
   }

   async findAttribute(name: string): Promise<LogicalAttribute | undefined> {
      // The new table uses <tr> elements for rows, with a PrimeReact-specific attribute
      const attributeLocators = await this.locator.locator('tr[data-pc-section="bodyrow"]').all();
      for (const locator of attributeLocators) {
         const attribute = new LogicalAttribute(locator, this);
         if ((await attribute.getName()) === name) {
            return attribute;
         }
      }
      return undefined;
   }

   async deleteAttribute(name: string): Promise<void> {
      const attribute = await this.findAttribute(name);
      if (attribute) {
         await attribute.delete();
      }
   }
}

export interface LogicalAttributeProperties {
   name: string;
   datatype: string;
   identifier: boolean;
   description: string;
}

export const LogicalAttributeDatatype = {
   // Basic data types
   Text: 'Text',
   Boolean: 'Boolean',
   Integer: 'Integer',
   Decimal: 'Decimal',

   // Date and time data types
   Date: 'Date',
   Time: 'Time',
   DateTime: 'DateTime',

   // Identifiers & key types
   Guid: 'Guid',

   // Specialized data types
   Binary: 'Binary',
   Location: 'Location'
} as const;

export type LogicalAttributeDatatype = keyof typeof LogicalAttributeDatatype;

export class LogicalAttribute extends TheiaPageObject {
   constructor(
      readonly locator: Locator,
      section: LogicalEntityAttributesSection
   ) {
      super(section.app);
   }

   protected get nameLocator(): Locator {
      return this.locator.locator('td').first();
   }

   protected get dataType(): Locator {
      return this.locator.locator('td').nth(1);
   }

   protected get identifierLocator(): Locator {
      return this.locator.locator('td').nth(2);
   }

   protected get descriptionLocator(): Locator {
      return this.locator.locator('td').nth(3);
   }

   protected get actionsLocator(): Locator {
      return this.locator.locator('td').last();
   }

   async getProperties(): Promise<LogicalAttributeProperties> {
      return {
         name: await this.getName(),
         datatype: await this.getDatatype(),
         identifier: await this.isIdentifier(),
         description: await this.getDescription()
      };
   }

   async getName(): Promise<string> {
      return (await this.nameLocator.textContent()) ?? '';
   }

   async setName(name: string): Promise<void> {
      await this.actionsLocator.locator('button:has(.pi-pencil)').click();
      const inputLocator = this.nameLocator.locator('input');
      await inputLocator.waitFor({ state: 'visible' });
      await inputLocator.fill(name);
      await this.nameLocator.press('Enter');
      await waitForFunction(async () => (await this.getName()) === name);
      await this.nameLocator.press('Enter');
      await waitForFunction(async () => (await this.getName()) === name);
   }

   async getDatatype(): Promise<LogicalAttributeDatatype> {
      return defined(await this.dataType.textContent()) as LogicalAttributeDatatype;
   }

   async setDatatype(datatype: LogicalAttributeDatatype): Promise<void> {
      // Enter edit mode for the row
      await this.actionsLocator.locator('button:has(.pi-pencil)').click(); // Re-enter edit mode

      // Click the dropdown trigger within the cell to activate the dropdown
      await this.dataType.locator('.p-dropdown-trigger').click();

      // The dropdown panel is usually rendered at the end of the body
      const dropdownPanel = this.page.locator('.p-dropdown-panel').first();
      await dropdownPanel.waitFor({ state: 'visible' });

      // Find the option by its text/label and click it
      await dropdownPanel.getByRole('option', { name: datatype }).click();

      // Wait for the dropdown panel to be hidden
      await dropdownPanel.waitFor({ state: 'hidden' });

      await this.nameLocator.press('Enter');
   }

   async isIdentifier(): Promise<boolean> {
      const checkboxBox = this.identifierLocator.locator('.p-checkbox-box');
      try {
         // Try to get the attribute if in edit mode
         await checkboxBox.waitFor({ state: 'attached', timeout: 1000 }); // Shorter timeout for checking existence
         return (await checkboxBox.getAttribute('data-p-highlight')) === 'true';
      } catch (error) {
         // If p-checkbox-box is not found (likely in read-only mode), check for the tick icon
         return (await this.identifierLocator.locator('.pi-check').count()) === 1;
      }
   }

   async toggleIdentifier(): Promise<void> {
      // Enter edit mode for the row
      await this.actionsLocator.locator('button:has(.pi-pencil)').click(); // Re-enter edit mode

      const isIdentifier = await this.isIdentifier();
      await this.identifierLocator.locator('input[type="checkbox"]').click(); // Click the input checkbox element

      // Wait for the icon to appear/disappear
      if (isIdentifier) {
         // If it was checked, wait for it to be unchecked
         await this.identifierLocator.locator('.p-checkbox-icon').waitFor({ state: 'hidden' });
      } else {
         // If it was unchecked, wait for it to be checked
         await this.identifierLocator.locator('.p-checkbox-icon').waitFor({ state: 'visible' });
      }

      await waitForFunction(async () => (await this.isIdentifier()) !== isIdentifier);
   }

   async getDescription(): Promise<string> {
      return (await this.descriptionLocator.textContent()) ?? '';
   }

   async setDescription(description: string): Promise<void> {
      const inputLocator = this.descriptionLocator.locator('input');
      await inputLocator.waitFor({ state: 'visible' });
      await inputLocator.fill(description);
      await this.descriptionLocator.press('Enter');
      await waitForFunction(async () => (await this.getDescription()) === description);
   }

   async delete(): Promise<void> {
      const deleteButton = this.actionsLocator.locator('button:has(.pi-trash)');
      await deleteButton.click();
   }
}
