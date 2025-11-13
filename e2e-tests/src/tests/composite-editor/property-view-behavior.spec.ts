/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { expect, test } from '@playwright/test';
import { CMApp } from '../../page-objects/cm-app';
import { CMPropertiesView } from '../../page-objects/cm-properties-view';

test.describe('Property View Form Integration', () => {
   let app: CMApp;
   const TEST_ENTITY_PATH = 'composite-editor/CompositeEditorPropertyViewBehavior.entity.cm';

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
      // Make sure all dialogs are closed before starting tests
      app.closeAnyDialog();
   });

   test.afterAll(async () => {
      if (app?.page) {
         await app.page.close();
      }
   });

   test('Property view reflects info on open form editor', async () => {
      const propertyView = new CMPropertiesView(app);
      await propertyView.open();

      // When there is no selection, the property view should show no properties available
      expect(await propertyView.viewLocator()).toContainText('No properties available.');

      // Open a composite editor (where the form is activate).
      const formEditor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Form Editor');
      await formEditor.waitForVisible();
      await formEditor.activate();

      // Expect the property view to contain info about the open file.
      await propertyView.waitForVisible();
      expect(await propertyView.viewLocator()).toContainText(TEST_ENTITY_PATH);

      // Close the form editor.
      await formEditor.close();

      // Expect the property view to be empty again.
      await propertyView.waitForVisible();
      expect(await propertyView.viewLocator()).toContainText('No properties available.');
   });

   test('Property view reflects info on open code editor', async () => {
      const propertyView = new CMPropertiesView(app);
      await propertyView.open();

      // When there is no selection, the property view should show no properties available
      expect(await propertyView.viewLocator()).toContainText('No properties available.');

      // Open a composite editor (where the form is activate).
      const codeEditor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Code Editor');
      await codeEditor.waitForVisible();

      // Expect the property view to contain info about the open file.
      await propertyView.waitForVisible();
      expect(await propertyView.viewLocator()).toContainText(TEST_ENTITY_PATH);

      // Close the form editor.
      await codeEditor.close();

      // Expect the property view to be empty again.
      await propertyView.waitForVisible();
      expect(await propertyView.viewLocator()).toContainText('No properties available.');
   });
});
