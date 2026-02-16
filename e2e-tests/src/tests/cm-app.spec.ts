/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { expect, test } from '@playwright/test';
import { CMApp } from '../page-objects/cm-app';

test.describe('CrossModel App', () => {
   let app: CMApp;

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
   });

   test('main content panel visible', async () => {
      expect(await app.isMainContentPanelVisible()).toBe(true);
   });

   test('property view is not revealed by default', async () => {
      const rightSidePanel = app.page.locator('#theia-right-side-panel');
      await expect(rightSidePanel).toBeHidden();
   });

   test('problems view is not revealed by default', async () => {
      const bottomPanel = app.page.locator('#theia-bottom-content-panel');
      await expect(bottomPanel).toBeHidden();
   });
});
