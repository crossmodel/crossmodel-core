/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { expect, test } from '@playwright/test';
import { CMApp } from '../../page-objects/cm-app';

test.describe.serial('Save Functionality Tests', () => {
   let app: CMApp;

   test.beforeAll(async ({ browser, playwright }) => {
      test.setTimeout(120000);
      app = await CMApp.load({ browser, playwright });
   });

   test.afterAll(async () => {
      if (app?.page) {
         await app.page.close();
      }
   });

   test('should save changes using the Save button', async () => {
      test.setTimeout(120000); 

      const formEditor = await app.openCompositeEditor('ExampleCRM/entities/Customer.entity.cm', 'Form Editor');
      await formEditor.waitForVisible();
      await app.page.waitForTimeout(1000); 

      const form = await formEditor.formFor('entity');
      const general = form.generalSection;

      const oldName = await general.getName();
      const newName = 'UpdatedCustomer';

      await general.setName(newName);
      await formEditor.waitForDirty();
      expect(await formEditor.isDirty()).toBeTruthy();

      const saveBtn = formEditor.saveButtonLocator();
      await expect(saveBtn).toBeVisible({ timeout: 5000 });
      await expect(saveBtn).toBeEnabled();

      await saveBtn.click();
      await app.page.waitForTimeout(1000);

      const isDirtyAfterSave = await formEditor.isDirty();
      expect(isDirtyAfterSave).toBe(false);
      await expect(saveBtn).toBeDisabled();

      await general.setName(oldName);
      await formEditor.saveAndClose();
   });

   test('should respond to Ctrl+S shortcut', async () => {
      test.setTimeout(120000);

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
      await app.page.waitForTimeout(1000);

      const isDirtyAfterCtrlS = await formEditor.isDirty();
      const saveBtn = formEditor.saveButtonLocator();

      expect(isDirtyAfterCtrlS).toBe(false);
      await expect(saveBtn).toBeDisabled();

      await general.setName(oldName);
      await saveBtn.click();
      await app.page.waitForTimeout(1000);

      await formEditor.close();

      await app.closeAnyDialog();
   });

   test('should keep focus on input after saving', async () => {
      test.setTimeout(120000);

      if (app.page.isClosed()) {
         throw new Error('Page is closed, cannot continue test');
      }

      await app.closeAnyDialog();

      const formEditor = await app.openCompositeEditor('ExampleCRM/entities/Customer.entity.cm', 'Form Editor');
      await formEditor.waitForVisible();

      const form = await formEditor.formFor('entity');
      const general = form.generalSection;

      await general.setName('TestFocus');
      await app.page.waitForTimeout(500);

      const focusBefore = await app.page.evaluate(() => (document.activeElement ? document.activeElement.tagName : 'BODY'));

      await app.page.keyboard.press('Control+s');
      await app.page.waitForTimeout(1000);

      const focusAfter = await app.page.evaluate(() => (document.activeElement ? document.activeElement.tagName : 'BODY'));
      // Verify that focus stays on the same field after saving
      // Ensures a smooth workflow and prevents focus from jumping
      expect(focusAfter).toBeDefined();
      expect(focusAfter).toBe(focusBefore);

      await general.setName('Customer');
      const saveBtn = formEditor.saveButtonLocator();
      if (await saveBtn.isVisible()) {
         await saveBtn.click();
         await app.page.waitForTimeout(1000);
      }

      await formEditor.close();

      await app.closeAnyDialog();
   });
});
