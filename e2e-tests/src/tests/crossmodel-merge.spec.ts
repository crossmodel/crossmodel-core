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
      // Verify the app loads with the merge extension installed
      expect(await app.isMainContentPanelVisible()).toBe(true);
   });

   test('merge extension commands are registered', async () => {
      // Wait for extension to activate (onStartupFinished)
      await app.page.waitForTimeout(3000);

      // Open the command palette
      await app.page.keyboard.press('F1');
      await app.page.waitForTimeout(1500);

      // Type to search for CrossModel merge commands
      await app.page.keyboard.type('CrossModel: Preview Diff');
      await app.page.waitForTimeout(1500);

      // Check if the command appears in the list
      const commandList = app.page.locator('.quick-input-list');
      await expect(commandList).toBeVisible({ timeout: 5000 });

      // Get all command text
      const commands = await app.page.locator('.quick-input-list .monaco-list-row').allTextContents();
      
      // Verify at least one CrossModel merge command is present
      const hasMergeCommand = commands.some(cmd => 
         cmd.includes('CrossModel: Preview Diff') || 
         cmd.includes('CrossModel: Merge from Ref') ||
         cmd.includes('CrossModel: Refresh')
      );
      
      expect(hasMergeCommand).toBeTruthy();

      // Close the command palette
      await app.page.keyboard.press('Escape');
      await app.page.waitForTimeout(500);
   });

   test('merge extension can execute preview diff command', async () => {
      // Open the command palette
      await app.page.keyboard.press('F1');
      await app.page.waitForTimeout(1500);

      // Search for and execute preview diff
      await app.page.keyboard.type('CrossModel: Preview Diff');
      await app.page.waitForTimeout(1500);
      await app.page.keyboard.press('Enter');
      await app.page.waitForTimeout(2000);

      // The command should execute without critical errors
      // We might get a notification about no repository or no changes, which is fine
      const criticalError = app.page.locator('.theia-notification-message-error');
      const hasCriticalError = await criticalError.count() > 0 && 
                               await criticalError.isVisible() && 
                               (await criticalError.textContent())?.includes('failed');
      
      // Verify no critical activation/execution errors
      expect(hasCriticalError).toBeFalsy();
   });

   test('SCM view includes CrossModel Changes section', async () => {
      // Try to open SCM view
      const scmButton = app.page.locator('.theia-app-left .p-TabBar-tab[title="Source Control"]');
      const scmExists = await scmButton.count() > 0;
      
      if (scmExists) {
         await scmButton.click();
         await app.page.waitForTimeout(2000);

         // Look for the CrossModel Changes view (it should be registered even if empty)
         const pageContent = await app.page.content();
         const hasCrossModelChanges = pageContent.includes('CrossModel Changes') || 
                                      pageContent.includes('crossmodelChanges');
         
         // The view should be registered (even if not visible due to no changes)
         expect(hasCrossModelChanges).toBeTruthy();
      }
   });
});
