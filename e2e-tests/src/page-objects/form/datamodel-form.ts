/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { TheiaView } from '@theia/playwright';
import { CMForm, FormSection, FormType } from './cm-form';

export class DataModelForm extends CMForm {
   readonly generalSection: DataModelGeneralSection;

   constructor(view: TheiaView, baseSelector: string, formType: FormType) {
      super(view, baseSelector, formType);
      this.generalSection = new DataModelGeneralSection(this);
   }
}

export class DataModelGeneralSection extends FormSection {
   constructor(form: DataModelForm) {
      super(form, 'General');
   }

   async getName(): Promise<string> {
      return this.locator.getByLabel('Name').inputValue();
   }

   async setName(name: string): Promise<void> {
      await this.locator.getByLabel('Name').fill(name);
      return this.page.waitForTimeout(250);
   }

   async getDescription(): Promise<string> {
      return this.locator.getByLabel('Description').inputValue();
   }

   async setDescription(description: string): Promise<void> {
      await this.locator.getByLabel('Description').fill(description);
      return this.page.waitForTimeout(250);
   }

   async getType(): Promise<string> {
      return this.locator.getByLabel('Type').inputValue();
   }

   async setType(type: string): Promise<void> {
      const dropdown = this.locator.locator('.p-autocomplete');
      await dropdown.locator('.p-autocomplete-dropdown').click();

      const dropdownPanel = this.page.locator('.p-autocomplete-panel').first();
      await dropdownPanel.waitFor({ state: 'visible' });

      await dropdownPanel.getByRole('option', { name: type }).click();
      return this.page.waitForTimeout(250);
   }

   async getVersion(): Promise<string> {
      return this.locator.getByLabel('Version').inputValue();
   }

   async setVersion(version: string): Promise<void> {
      await this.locator.getByLabel('Version').fill(version);
      return this.page.waitForTimeout(250);
   }
}
