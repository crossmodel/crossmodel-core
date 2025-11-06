/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { ElementHandle, Locator } from '@playwright/test';
import { TheiaApp, TheiaEditor, TheiaView } from '@theia/playwright';
import { CMForm } from './form/cm-form';
import { LogicalEntityForm } from './form/entity-form';
import { RelationshipForm } from './form/relationship-form';

const CMPropertiesViewData = {
   tabSelector: '#shell-tab-property-view',
   viewSelector: '#property-view',
   viewName: 'Properties'
};

export class CMPropertiesView extends TheiaView {
   constructor(app: TheiaApp) {
      super(CMPropertiesViewData, app);
   }

   async viewLocator(): Promise<Locator> {
      return this.page.locator(this.viewSelector);
   }

   override async open(): Promise<TheiaView> {
      if (!(await this.isDisplayed())) {
         await this.page.keyboard.press('Alt+Shift+P');
      }
      await this.activate();
      return this;
   }
}

export abstract class CMPropertiesEditor<F extends CMForm> extends TheiaEditor {
   protected modelRootSelector = '#model-property-view';

   abstract form(): Promise<F>;

   constructor(app: TheiaApp) {
      super(CMPropertiesViewData, app);
   }

   protected async modelPropertyElement(): Promise<ElementHandle<SVGElement | HTMLElement> | null> {
      return this.page.$(this.viewSelector + ' ' + this.modelRootSelector);
   }

   override async isDirty(): Promise<boolean> {
      const form = await this.form();
      return form.isDirty();
   }

   override async open(): Promise<TheiaView> {
      if (!(await this.isDisplayed())) {
         await this.page.keyboard.press('Alt+Shift+P');
      }
      await this.activate();
      return this;
   }
}

export class EntityPropertiesView extends CMPropertiesEditor<LogicalEntityForm> {
   async form(): Promise<LogicalEntityForm> {
      const entityForm = new LogicalEntityForm(this, '#property-view', 'LogicalEntity');
      await entityForm.waitForVisible();
      return entityForm;
   }
}

export class RelationshipPropertiesView extends CMPropertiesEditor<RelationshipForm> {
   async form(): Promise<RelationshipForm> {
      const relationshipForm = new RelationshipForm(this, '#property-view', 'Relationship');
      await relationshipForm.waitForVisible();
      return relationshipForm;
   }
}
