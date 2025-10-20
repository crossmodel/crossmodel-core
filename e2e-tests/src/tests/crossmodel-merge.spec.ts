/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { expect, test } from '@playwright/test';
import { CMApp } from '../page-objects/cm-app';

test.describe('CrossModel Merge Extension', () => {
   let app: CMApp;

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
   });

   test.afterAll(async () => {
      await app.page.close();
   });

   test('application loads successfully with merge extension', async () => {
      // Simple test to verify the app loads with the merge extension installed
      // The extension activates on startup (onStartupFinished)
      // This test ensures no errors occur during initialization
      expect(await app.isMainContentPanelVisible()).toBe(true);
   });
});
