/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { defined, waitForFunction } from '@eclipse-glsp/glsp-playwright';
import { Locator } from '@playwright/test';
import { TheiaPageObject } from '@theia/playwright';
import { TheiaView } from '@theia/playwright/lib/theia-view';
import { CMForm, FormIcons, FormSection, FormType } from './cm-form';
import { LogicalEntityIdentifiersSection } from './sections/identifiers-section';
import { LogicalEntityInheritsSection } from './sections/inherits-section';

export class LogicalEntityForm extends CMForm {
   readonly iconClass = FormIcons.LogicalEntity;
   readonly generalSection: LogicalEntityGeneralSection;
   readonly attributesSection: LogicalEntityAttributesSection;
   readonly identifiersSection: LogicalEntityIdentifiersSection;
   readonly inheritsSection: LogicalEntityInheritsSection;
   readonly customPropertiesSection: LogicalEntityCustomPropertiesSection;

   constructor(view: TheiaView, baseSelector: string, formType: FormType) {
      super(view, baseSelector, formType);
      this.generalSection = new LogicalEntityGeneralSection(this);
      this.attributesSection = new LogicalEntityAttributesSection(this);
      this.identifiersSection = new LogicalEntityIdentifiersSection(this);
      this.inheritsSection = new LogicalEntityInheritsSection(this);
      this.customPropertiesSection = new LogicalEntityCustomPropertiesSection(this);
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

   async startAddAttribute(): Promise<LogicalAttribute> {
      // Ensure attributes section is expanded
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

      // Wait for the new editable row by looking for a text input in data columns (not checkbox)
      const editRow = this.locator.locator(
         'tr:has(td:not(.p-selection-column):not(.p-reorder-column) input:not([type="checkbox"]))'
      );
      await editRow
         .locator('td:not(.p-selection-column):not(.p-reorder-column) input:not([type="checkbox"])')
         .first()
         .waitFor({ state: 'visible' });

      // Return the attribute in edit mode
      return new LogicalAttribute(editRow, this);
   }

   async commitAttributeAdd(attribute: LogicalAttribute, name: string): Promise<LogicalAttribute> {
      if (!name) {
         throw new Error('Attribute name is required to save the row');
      }

      // Set the name in the new row (exclude selection and reorder columns)
      // Wait a bit for the row to fully enter edit mode
      await this.page.waitForTimeout(100);
      const nameInput = attribute.nameLocator.locator('input:not([type="checkbox"])');
      await nameInput.waitFor({ state: 'visible' });
      await nameInput.fill(name);

      // Save the row by pressing Enter and wait for things to settle
      // Save the row by clicking the row save button to avoid Enter-driven global handlers
      const saveButton = attribute.locator.locator('button.p-row-editor-save');
      await saveButton.first().waitFor({ state: 'visible', timeout: 500 });
      await saveButton.first().click();

      // Wait a bit longer than our usual timeouts since this is a complex UI update
      await this.page.waitForTimeout(500);

      // Wait for the edit mode to end using a direct selector
      const editingCell = this.locator.locator('td input[role="textbox"]');
      await editingCell.waitFor({ state: 'hidden', timeout: 500 });

      // Give a little more time for the table to refresh
      await this.page.waitForTimeout(500);

      // Locate the cell containing the attribute name
      const nameCell = this.locator.locator('td').filter({ hasText: name }).first();
      await nameCell.waitFor({ state: 'visible', timeout: 500 });

      // Get the parent row and return the attribute
      const row = nameCell.locator('xpath=..');
      return new LogicalAttribute(row, this);
   }

   /** @deprecated Use startAddAttribute() and commitAttributeAdd() instead */
   async addAttribute(): Promise<LogicalAttribute> {
      // Temporary compatibility method
      const attribute = await this.startAddAttribute();
      return this.commitAttributeAdd(attribute, 'New Attribute');
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

   async getGlobalFilterInput(): Promise<Locator> {
      return this.locator.locator('.datatable-global-filter input[placeholder="Keyword Search"]');
   }

   async setGlobalFilter(text: string): Promise<void> {
      const filterInput = await this.getGlobalFilterInput();
      await filterInput.waitFor({ state: 'visible' });
      await filterInput.fill(text);
      await this.page.waitForTimeout(300);
   }

   async clickClearFilters(): Promise<void> {
      const clearButton = this.locator.locator('button:has-text("Clear Filters")');
      await clearButton.waitFor({ state: 'visible' });
      await clearButton.click();
      await this.page.waitForTimeout(300);
   }

   async getVisibleAttributeCount(): Promise<number> {
      const visibleRows = await this.locator.locator('tr[data-pc-section="bodyrow"]').all();
      return visibleRows.length;
   }
}

export interface LogicalAttributeProperties {
   name: string;
   datatype: string;
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

   public get nameLocator(): Locator {
      return this.locator.locator('td:not(.p-selection-column):not(.p-reorder-column)').first();
   }

   protected get dataType(): Locator {
      return this.locator.locator('td:not(.p-selection-column):not(.p-reorder-column)').nth(1);
   }

   protected get identifierLocator(): Locator {
      return this.locator.locator('td:not(.p-selection-column):not(.p-reorder-column)').nth(5);
   }

   protected get descriptionLocator(): Locator {
      return this.locator.locator('td:not(.p-selection-column):not(.p-reorder-column)').nth(7);
   }

   protected get actionsLocator(): Locator {
      return this.locator.locator('td').last();
   }

   async getProperties(): Promise<LogicalAttributeProperties> {
      return {
         name: await this.getName(),
         datatype: await this.getDatatype(),
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
      // Click the save button instead of pressing Enter
      const saveButton = this.actionsLocator.locator('button.p-row-editor-save');
      await saveButton.first().waitFor({ state: 'visible', timeout: 500 });
      await saveButton.first().click();
      await waitForFunction(async () => (await this.getName()) === name);
   }

   async getDatatype(): Promise<LogicalAttributeDatatype> {
      return defined(await this.dataType.textContent()) as LogicalAttributeDatatype;
   }

   async setDatatype(datatype: LogicalAttributeDatatype): Promise<void> {
      // Enter edit mode for the row
      await this.actionsLocator.locator('button:has(.pi-pencil)').click(); // Re-enter edit mode

      // Click the autocomplete dropdown button within the cell to activate the autocomplete
      const autocomplete = this.dataType.locator('.p-autocomplete');
      await autocomplete.locator('.p-autocomplete-dropdown').click();

      // The autocomplete panel is usually rendered at the end of the body
      const autocompletePanel = this.page.locator('.p-autocomplete-panel').first();
      await autocompletePanel.waitFor({ state: 'visible' });

      // Find the option by its text/label and click it
      await autocompletePanel.getByRole('option', { name: datatype }).click();

      // Wait for the autocomplete panel to be hidden
      await autocompletePanel.waitFor({ state: 'hidden' });
      // Click save button to persist the datatype change
      const saveButton = this.actionsLocator.locator('button.p-row-editor-save');
      await saveButton.first().waitFor({ state: 'visible', timeout: 500 });
      await saveButton.first().click();
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
      // Enter edit mode for the row
      await this.actionsLocator.locator('button:has(.pi-pencil)').click(); // Re-enter edit mode
      const inputLocator = this.descriptionLocator.locator('input');
      await inputLocator.waitFor({ state: 'visible' });
      await inputLocator.fill(description);
      // Click the save button to persist the description change
      const saveButton = this.actionsLocator.locator('button.p-row-editor-save');
      await saveButton.first().waitFor({ state: 'visible', timeout: 500 });
      await saveButton.first().click();
      await waitForFunction(async () => (await this.getDescription()) === description);
   }

   async delete(): Promise<void> {
      const deleteButton = this.actionsLocator.locator('button:has(.pi-trash)');
      await deleteButton.click();
   }
}

export class LogicalEntityCustomPropertiesSection extends FormSection {
   readonly addButtonLocator: Locator;
   constructor(form: LogicalEntityForm) {
      super(form, 'Custom Properties');
      this.addButtonLocator = this.locator.locator('button:has-text("Add Property")');
   }

   async startAddProperty(): Promise<CustomProperty> {
      // Ensure custom properties section is expanded
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

      // Wait for the new editable row
      const editRow = this.locator.locator(
         'tr:has(td:not(.p-selection-column):not(.p-reorder-column) input:not([type="checkbox"]))'
      );
      await editRow
         .locator('td:not(.p-selection-column):not(.p-reorder-column) input:not([type="checkbox"])')
         .first()
         .waitFor({ state: 'visible' });

      // Return the property in edit mode
      return new CustomProperty(editRow, this);
   }

   async commitPropertyAdd(
      property: CustomProperty,
      name: string,
      value?: string
   ): Promise<CustomProperty> {
      if (!name) {
         throw new Error('Property name is required to save the row');
      }

      // Wait a bit for the row to fully enter edit mode
      await this.page.waitForTimeout(100);
      const nameInput = property.nameLocator.locator('input:not([type="checkbox"])');
      await nameInput.waitFor({ state: 'visible' });
      await nameInput.fill(name);

      // Set value if provided
      if (value) {
         const valueInput = property.valueLocator.locator('input:not([type="checkbox"])');
         await valueInput.waitFor({ state: 'visible' });
         await valueInput.fill(value);
      }

      // Save the row by clicking the row save button
      const saveButton = property.locator.locator('button.p-row-editor-save');
      await saveButton.first().waitFor({ state: 'visible', timeout: 500 });
      await saveButton.first().click();

      // Wait for edit mode to end
      await this.page.waitForTimeout(500);
      const editingCell = this.locator.locator('td input[role="textbox"]');
      await editingCell.waitFor({ state: 'hidden', timeout: 500 });

      // Give time for the table to refresh
      await this.page.waitForTimeout(500);

      // Locate the cell containing the property name
      const nameCell = this.locator.locator('td').filter({ hasText: name }).first();
      await nameCell.waitFor({ state: 'visible', timeout: 500 });

      // Get the parent row and return the property
      const row = nameCell.locator('xpath=..');
      return new CustomProperty(row, this);
   }

   async getAllProperties(): Promise<CustomProperty[]> {
      const propertyLocators = await this.locator.locator('tr[data-pc-section="bodyrow"]').all();
      return propertyLocators.map(locator => new CustomProperty(locator, this));
   }

   async getProperty(name: string): Promise<CustomProperty> {
      return defined(await this.findProperty(name));
   }

   async findProperty(name: string): Promise<CustomProperty | undefined> {
      const propertyLocators = await this.locator.locator('tr[data-pc-section="bodyrow"]').all();
      for (const locator of propertyLocators) {
         const property = new CustomProperty(locator, this);
         if ((await property.getName()) === name) {
            return property;
         }
      }
      return undefined;
   }

   async deleteProperty(name: string): Promise<void> {
      const property = await this.findProperty(name);
      if (property) {
         await property.delete();
      }
   }
}

export interface CustomPropertyValues {
   name: string;
   value: string;
   description: string;
}

export class CustomProperty extends TheiaPageObject {
   constructor(
      readonly locator: Locator,
      section: LogicalEntityCustomPropertiesSection
   ) {
      super(section.app);
   }

   public get nameLocator(): Locator {
      return this.locator.locator('td:not(.p-selection-column):not(.p-reorder-column)').first();
   }

   public get valueLocator(): Locator {
      return this.locator.locator('td:not(.p-selection-column):not(.p-reorder-column)').nth(1);
   }

   protected get descriptionLocator(): Locator {
      return this.locator.locator('td:not(.p-selection-column):not(.p-reorder-column)').nth(2);
   }

   protected get actionsLocator(): Locator {
      return this.locator.locator('td').last();
   }

   async getValues(): Promise<CustomPropertyValues> {
      return {
         name: await this.getName(),
         value: await this.getValue(),
         description: await this.getDescription()
      };
   }

   async getName(): Promise<string> {
      return (await this.nameLocator.textContent()) ?? '';
   }

   async getValue(): Promise<string> {
      return (await this.valueLocator.textContent()) ?? '';
   }

   async setValue(value: string): Promise<void> {
      await this.actionsLocator.locator('button:has(.pi-pencil)').click();
      const inputLocator = this.valueLocator.locator('input');
      await inputLocator.waitFor({ state: 'visible' });
      await inputLocator.fill(value);
      const saveButton = this.actionsLocator.locator('button.p-row-editor-save');
      await saveButton.first().waitFor({ state: 'visible', timeout: 500 });
      await saveButton.first().click();
      await waitForFunction(async () => (await this.getValue()) === value);
   }

   async getDescription(): Promise<string> {
      return (await this.descriptionLocator.textContent()) ?? '';
   }

   async setDescription(description: string): Promise<void> {
      await this.actionsLocator.locator('button:has(.pi-pencil)').click();
      const inputLocator = this.descriptionLocator.locator('input');
      await inputLocator.waitFor({ state: 'visible' });
      await inputLocator.fill(description);
      const saveButton = this.actionsLocator.locator('button.p-row-editor-save');
      await saveButton.first().waitFor({ state: 'visible', timeout: 500 });
      await saveButton.first().click();
      await waitForFunction(async () => (await this.getDescription()) === description);
   }

   async delete(): Promise<void> {
      const deleteButton = this.actionsLocator.locator('button:has(.pi-trash)');
      await deleteButton.click();
   }
}
