/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { expect, test } from '@playwright/test';
import { CMApp } from '../../page-objects/cm-app';

test.describe('Composite Editor Save Functionality', () => {
   let app: CMApp;

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
   });

   test.afterAll(async () => {
      if (app?.page) {
         await app.page.close();
      }
   });

   test('Composite Editor should save changes using the Save button', async () => {
      const formEditor = await app.openCompositeEditor('ExampleCRM/entities/Customer.entity.cm', 'Form Editor');
      expect(formEditor).toBeDefined();
      await formEditor.waitForVisible();

      const form = await formEditor.formFor('entity');
      const general = form.generalSection;

      const oldName = await general.getName();
      const newName = 'UpdatedCustomer';

      // Change a property and wait until the editor is dirty
      await general.setName(newName);
      await formEditor.waitForDirty();

      // Check whether the save button is there, visible and enabled.
      const saveBtn = formEditor.saveButtonLocator();
      expect(saveBtn).toBeDefined();
      expect(saveBtn).toBeVisible();
      expect(saveBtn).toBeEnabled();

      // Click the save button and expect the save button to be disabled.
      await saveBtn.click();
      await formEditor.waitForSaved();
      await expect(saveBtn).toBeDisabled();

      // Revert change.
      await general.setName(oldName);
      await formEditor.saveAndClose();
   });

   test('Composite editor should respond to Ctrl+S shortcut', async () => {
      const formEditor = await app.openCompositeEditor('ExampleCRM/entities/Customer.entity.cm', 'Form Editor');
      expect(formEditor).toBeDefined();
      await formEditor.waitForVisible();

      const form = await formEditor.formFor('entity');
      const general = form.generalSection;

      const oldName = await general.getName();
      const newName = 'ShortcutSaveTest';

      // Change a property and wait until the editor is dirty
      await general.setName(newName);
      await formEditor.waitForDirty();

      // Simulate Ctrl+S keyboard shortcut
      await app.page.keyboard.press('Control+s');
      await formEditor.waitForSaved();

      // Check that the save button is now disabled
      const saveBtn = formEditor.saveButtonLocator();
      await expect(saveBtn).toBeDisabled();

      // Revert change.
      await general.setName(oldName);
      await formEditor.saveAndClose();
   });

   test('Composite Editor should keep focus on input after saving', async () => {
      const formEditor = await app.openCompositeEditor('ExampleCRM/entities/Customer.entity.cm', 'Form Editor');
      expect(formEditor).toBeDefined();
      await formEditor.waitForVisible();

      const form = await formEditor.formFor('entity');
      const general = form.generalSection;
      const oldName = await general.getName();

      // Change a property and wait until the editor is dirty
      await general.setName('TestFocus');
      await formEditor.waitForDirty();

      const focusBefore = await app.page.evaluate(() => (document.activeElement ? document.activeElement.tagName : 'BODY'));
      expect(focusBefore).toBeDefined();

      await app.page.keyboard.press('Control+s');
      await formEditor.waitForSaved();

      const focusAfter = await app.page.evaluate(() => (document.activeElement ? document.activeElement.tagName : 'BODY'));
      expect(focusAfter).toBeDefined();
      expect(focusAfter).toBe(focusBefore); // Verify focus stays on same field after saving - ensures smooth workflow

      // Revert change.
      await general.setName(oldName);
      await formEditor.saveAndClose();
   });
});
