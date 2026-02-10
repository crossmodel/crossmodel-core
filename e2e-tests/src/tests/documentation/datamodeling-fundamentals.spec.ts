/********************************************************************************
 * Copyright (c) 2026 CrossBreeze.
 ********************************************************************************/
import { test } from '@playwright/test';
import 'reflect-metadata';
import { CMApp } from '../../page-objects/cm-app';

const test_title = 'datamodeling-fundamentals';
const screenshot_path = `./screenshots/${test_title}`;

test.describe(test_title, () => {
   let app: CMApp;

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
   });

   // Ensure consistent viewport and device scale factor for all tests in this suite, to get consistent screenshots
   test.use({
      viewport: { width: 1400, height: 900 },
      deviceScaleFactor: 2
   });

   test('Prepare Workspace and start modelling', async () => {
      const page = app.page;

      // Manually open the command palette
      await page.keyboard.press('Control+Shift+P');

      // Fill in the command palette input with '>git clone'
      // Use the quick input widget class as a selector (theia based)
      const quickInput = await page.locator('.quick-input-widget');
      await quickInput.getByRole('combobox', { name: 'input' }).fill('>git clone');
      await quickInput.screenshot({ path: `${screenshot_path}/git-clone.png` });

      await page.getByRole('option', { name: 'Git: Clone', exact: true }).locator('a').click();
      await page.getByRole('combobox', { name: 'input' }).fill('https://github.com/crossmodel/crossmodel-examples');

      // Capture a screenshot of the input box with some padding around it
      // First select the input box and get its bounding box
      let box = await page.getByRole('combobox', { name: 'input' }).boundingBox();
      if (box) {
         await page.screenshot({
            path: `${screenshot_path}/clone-inputbox.png`,
            clip: {
               x: Math.max(box.x - 20, 0),
               y: Math.max(box.y - 20, 0),
               width: box.width + 40,
               height: box.height + 60
            }
         });
      }

      await page.getByRole('combobox', { name: 'input' }).press('Enter');
      await page.waitForTimeout(300);
      await page.getByRole('combobox').selectOption('file:///');

      // open and close the workspaces folder, to make sure it is selected, and to show it in a consistent way.
      await page.getByText('workspaces', { exact: true }).click();
      await page.getByText('workspaces', { exact: true }).click();

      // create a screenshot of the dialog box with some padding around it
      box = await page.getByText('//[SWAP]/etc/hostsShow hidden').boundingBox();
      if (box) {
         await page.screenshot({
            path: `${screenshot_path}/select-repository-location-dialogbox.png`,
            clip: {
               x: Math.max(box.x - 20, 0),
               y: Math.max(box.y - 40, 0),
               width: box.width + 40,
               height: box.height + 80
            }
         });
      }

      await page.getByRole('button', { name: 'Select as Repository' }).click();

      box = await page.locator('div.dialogContent').boundingBox();

      if (box) {
         await page.screenshot({
            path: `${screenshot_path}/open-repo-dialogbox.png`,
            clip: {
               x: Math.max(box.x - 20, 0),
               y: Math.max(box.y - 40, 0),
               width: box.width + 40,
               height: box.height + 100
            }
         });
      }

      await page.getByRole('button', { name: 'Open', exact: true }).click();
      await page.waitForTimeout(300);
      await page.getByLabel('$(git-branch) main,').click();
      await page.screenshot({ path: `${screenshot_path}/select-brightgreen-branch.png` });
   });
});
