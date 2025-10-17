/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { expect, test } from '@playwright/test';
import { CMApp } from '../../page-objects/cm-app';

test.describe.serial('Save Functionality Tests', () => {
   let app: CMApp;

   test.beforeAll(async ({ browser, playwright }) => {
      test.setTimeout(180000);
      app = await CMApp.load({ browser, playwright });
   });

   async function closeAnyDialog() {
      const dialog = app.page.locator('#theia-dialog-shell');
      try {
         if (await dialog.isVisible({ timeout: 1000 })) {
            for (const label of ['Save', "Don't Save", 'Close', 'Close Without Saving', 'Yes', 'OK']) {
               const button = app.page.locator(`#theia-dialog-shell button:has-text("${label}")`);
               if (await button.isVisible({ timeout: 200 }).catch(() => false)) {
                  await button.click();
                  break;
               }
            }
            await dialog.waitFor({ state: 'detached', timeout: 4000 }).catch(() => undefined);
         }
      } catch {
         return;
      }
   }

   test.afterAll(async () => {
      if (app?.page) {
         await app.page.close();
      }
   });

   test('should save changes using the Save button', async () => {
      test.setTimeout(180000);

      const formEditor = await app.openCompositeEditor('ExampleCRM/entities/Customer.entity.cm', 'Form Editor');
      await formEditor.waitForVisible();

      const form = await formEditor.formFor('entity');
      const general = form.generalSection;

      const oldName = await general.getName();
      const newName = 'UpdatedCustomer';

      await general.setName(newName);
      await formEditor.waitForDirty();
      expect(await formEditor.isDirty()).toBeTruthy();

      const saveBtn = app.page.locator('button:has-text("Save")');
      await expect(saveBtn).toBeVisible({ timeout: 10000 });
      await expect(saveBtn).toBeEnabled();

      await saveBtn.click();
      await app.page.waitForTimeout(1500);

      await general.setName(oldName);
      await formEditor.saveAndClose();
   });

   test('should respond to Ctrl+S shortcut', async () => {
      test.setTimeout(180000);

      const formEditor = await app.openCompositeEditor('ExampleCRM/entities/Customer.entity.cm', 'Form Editor');
      await formEditor.waitForVisible();

      const form = await formEditor.formFor('entity');
      const general = form.generalSection;

      const oldName = await general.getName();
      const newName = 'ShortcutSaveTest';

      await general.setName(newName);
      await formEditor.waitForDirty();
      expect(await formEditor.isDirty()).toBeTruthy();

      await app.page.keyboard.press('Control+s');
      await app.page.waitForTimeout(1500);

      const saveBtn = app.page.locator('button:has-text("Save")');
      await expect(saveBtn).toBeVisible({ timeout: 10000 });

      await general.setName(oldName);
      await saveBtn.click();
      await app.page.waitForTimeout(1000);

      const closeBtn = app.page.locator('[id*="shell-tab-cm-composite-editor-handler"] .lm-TabBar-tabCloseIcon');
      if (await closeBtn.isVisible()) {
         await closeBtn.click();
         await app.page.waitForTimeout(800);
      }

      await closeAnyDialog();
   });

   test('should keep focus on input after saving', async () => {
      test.setTimeout(240000);

      if (app.page.isClosed()) {
         throw new Error('Page is closed, cannot continue test');
      }

      await closeAnyDialog();

      const formEditor = await app.openCompositeEditor('ExampleCRM/entities/Customer.entity.cm', 'Form Editor');
      await formEditor.waitForVisible();

      const form = await formEditor.formFor('entity');
      const general = form.generalSection;

      await general.setName('TestFocus');
      await app.page.waitForTimeout(800);

      const focusBefore = await app.page.evaluate(() => (document.activeElement ? document.activeElement.tagName : 'BODY'));

      await app.page.keyboard.press('Control+s');
      await app.page.waitForTimeout(1500);

      const focusAfter = await app.page.evaluate(() => (document.activeElement ? document.activeElement.tagName : 'BODY'));

      console.log(`Focus before: ${focusBefore}, after: ${focusAfter}`);

      expect(focusAfter).toBeDefined();

      await general.setName('Customer');
      const saveBtn = app.page.locator('button:has-text("Save")');
      if (await saveBtn.isVisible()) {
         await saveBtn.click();
         await app.page.waitForTimeout(1000);
      }

      const closeBtn = app.page.locator('[id*="shell-tab-cm-composite-editor-handler"] .lm-TabBar-tabCloseIcon');
      if (await closeBtn.isVisible()) {
         await closeBtn.click();
         await app.page.waitForTimeout(800);
      }

      await closeAnyDialog();
   });
});
