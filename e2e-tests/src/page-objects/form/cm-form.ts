/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { waitForFunction } from '@eclipse-glsp/glsp-playwright';
import { ElementHandle, Locator } from '@playwright/test';
import { TheiaPageObject, TheiaView } from '@theia/playwright';
import { TheiaViewObject } from '../theia-view-object';

export type FormType = 'LogicalEntity' | 'Relationship' | 'SystemDiagram' | 'Mapping' | 'DataModel';
export type FormIcon =
   | 'codicon-git-commit'
   | 'codicon-git-compare'
   | 'codicon-type-hierarchy-sub'
   | 'codicon-group-by-ref-type'
   | 'codicon-globe';

export const FormIcons: Record<FormType, FormIcon> = {
   LogicalEntity: 'codicon-git-commit',
   Relationship: 'codicon-git-compare',
   SystemDiagram: 'codicon-type-hierarchy-sub',
   Mapping: 'codicon-group-by-ref-type',
   DataModel: 'codicon-globe'
};

export abstract class CMForm extends TheiaViewObject {
   protected typeSelector: string;
   readonly locator: Locator;

   constructor(
      view: TheiaView,
      protected baseSelector: string,
      formType: FormType
   ) {
      super(view, ''); // Pass empty string to TheiaViewObject, as we manage selector here
      // Use codicon classes without assuming tag name to survive markup changes
      this.typeSelector = `${baseSelector} .codicon.${FormIcons[formType]}`;
      this.locator = view.page.locator(baseSelector);
   }

   protected typeElementHandle(): Promise<ElementHandle<SVGElement | HTMLElement> | null> {
      return this.page.$(this.typeSelector);
   }

   override async waitForVisible(): Promise<void> {
      // First ensure the form container is visible, then wait for the type icon if present.
      await this.locator.waitFor({ state: 'visible', timeout: 30000 });
      await this.page.waitForSelector(this.typeSelector, { state: 'visible', timeout: 5000 }).catch(() => {
         // If the icon is missing or slow to render, continue as long as the form is visible.
      });
   }

   override async isVisible(): Promise<boolean> {
      const viewObject = await this.typeElementHandle();
      return !!viewObject && viewObject.isVisible();
   }

   async isDirty(): Promise<boolean> {
      const title = await this.page.$(`${this.baseSelector} .form-title:not(.lm-mod-hidden)`);
      const text = await title?.textContent();
      return text?.endsWith('*') ?? false;
   }

   async waitForDirty(): Promise<void> {
      await waitForFunction(async () => this.isDirty());
   }
}

export abstract class FormSection extends TheiaPageObject {
   readonly locator: Locator;

   constructor(
      readonly form: CMForm,
      sectionName: string
   ) {
      super(form.app);
      this.locator = form.locator.locator(`.p-accordion-header:has-text("${sectionName}")`).locator('..');
   }
}
