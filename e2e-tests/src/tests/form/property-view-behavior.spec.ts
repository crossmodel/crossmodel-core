/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { expect, test } from '@playwright/test';
import { CMApp } from '../../page-objects/cm-app';

test.describe('Property View Form Integration', () => {
   let app: CMApp;

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
   });

   test.afterAll(async () => {
      if (app?.page) {
         await app.page.close();
      }
   });

   test('Property view resets after closing a form editor', async () => {
      const propertyTab = app.page.locator('#shell-tab-property-view');
      await propertyTab.click();
      await propertyTab.waitFor({ state: 'visible' });

      const propertyView = app.page.locator('#property-view');

      const systemDiagram = await app.openCompositeEditor('ExampleCRM/diagrams/CRM.system-diagram.cm', 'System Diagram');
      await systemDiagram.waitForVisible();

      await systemDiagram.selectLogicalEntityAndOpenProperties('Customer');

      const openButton = propertyView.locator('button:has-text("Open")');
      await expect(openButton).toBeVisible({ timeout: 10000 });
      await expect(propertyView.locator('#model-property-view')).toBeVisible({ timeout: 10000 });

      await openButton.click();

      const formEditor = await app.openCompositeEditor('ExampleCRM/entities/Customer.entity.cm', 'Form Editor');
      await formEditor.waitForVisible();
      await expect(propertyView.locator('#model-property-view')).toBeVisible({ timeout: 10000 });
      await expect(propertyView.locator('text=No properties available.')).toHaveCount(0);

      await formEditor.close();
      const dialog = app.page.locator('.theia-dialog-shell');
      if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
         await dialog.locator('button:has-text("Don\'t Save")').click();
      }

      await expect(propertyView.locator('#model-property-view')).toHaveCount(0);
      await expect(propertyView.locator('text=No properties available.')).toBeVisible({ timeout: 30000 });

      await systemDiagram.closeWithoutSave();
      await app.closeAnyDialog();
   });
});
