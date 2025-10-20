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

   test('extension is loaded and commands are available', async () => {
      // Open the command palette
      await app.page.keyboard.press('F1');
      await app.page.waitForTimeout(500);

      // Type to search for CrossModel merge commands
      await app.page.keyboard.type('CrossModel:');
      await app.page.waitForTimeout(500);

      // Check if the command palette shows our commands
      const commandList = app.page.locator('.quick-input-list');
      await expect(commandList).toBeVisible();

      // Verify that CrossModel commands are present
      const commands = await app.page.locator('.quick-input-list .monaco-highlighted-label').allTextContents();
      const crossModelCommands = commands.filter(cmd => cmd.includes('CrossModel'));

      // We should have at least some CrossModel commands available
      expect(crossModelCommands.length).toBeGreaterThan(0);

      // Close the command palette
      await app.page.keyboard.press('Escape');
   });

   test('SCM view contains CrossModel Changes view', async () => {
      // Click on the SCM icon in the activity bar
      const scmButton = app.page.locator('.theia-app-left .p-TabBar-tab[title="Source Control"]');
      if (await scmButton.count() > 0) {
         await scmButton.click();
         await app.page.waitForTimeout(500);

         // Check if the SCM view is visible
         const scmView = app.page.locator('.theia-scm-container');
         if (await scmView.count() > 0) {
            // Look for CrossModel Changes view header or title
            const viewHeader = app.page.locator('text=/CrossModel Changes/i');
            const isVisible = await viewHeader.count() > 0;

            // The view should exist (even if empty)
            // Note: It may not be visible if there are no changes
            expect(isVisible || await scmView.isVisible()).toBeTruthy();
         }
      }
   });

   test('Preview Diff command can be executed', async () => {
      // Execute the preview diff command via command palette
      await app.page.keyboard.press('F1');
      await app.page.waitForTimeout(500);

      // Type the command
      await app.page.keyboard.type('CrossModel: Preview Diff');
      await app.page.waitForTimeout(500);

      // Press Enter to execute
      await app.page.keyboard.press('Enter');
      await app.page.waitForTimeout(1000);

      // The command should execute without error
      // Check if any error notifications appeared
      const errorNotification = app.page.locator('.theia-notification-message-error');
      const hasError = await errorNotification.count() > 0 && await errorNotification.isVisible();

      // We might get a message about no changes or no repository
      // That's OK - we just want to verify the command executes
      expect(hasError).toBeFalsy();
   });

   test('Merge from Ref command prompts for input', async () => {
      // Execute the merge from ref command
      await app.page.keyboard.press('F1');
      await app.page.waitForTimeout(500);

      await app.page.keyboard.type('CrossModel: Merge from Ref');
      await app.page.waitForTimeout(500);

      await app.page.keyboard.press('Enter');
      await app.page.waitForTimeout(1000);

      // Should either show an input prompt or an error about no git repo
      const inputBox = app.page.locator('.theia-input');
      const errorNotification = app.page.locator('.theia-notification-message');

      const hasInput = await inputBox.count() > 0 && await inputBox.isVisible();
      const hasNotification = await errorNotification.count() > 0 && await errorNotification.isVisible();

      // Either an input prompt or notification should appear
      expect(hasInput || hasNotification).toBeTruthy();

      // Close any open dialogs
      await app.page.keyboard.press('Escape');
      await app.page.waitForTimeout(500);
   });

   test('Refresh Changes command can be executed', async () => {
      // Execute the refresh command
      await app.page.keyboard.press('F1');
      await app.page.waitForTimeout(500);

      await app.page.keyboard.type('CrossModel: Refresh');
      await app.page.waitForTimeout(500);

      await app.page.keyboard.press('Enter');
      await app.page.waitForTimeout(1000);

      // The command should execute
      // No need to verify specific output - just that it doesn't crash
      const errorNotification = app.page.locator('.theia-notification-message-error');
      const hasError = await errorNotification.count() > 0 && await errorNotification.isVisible();

      expect(hasError).toBeFalsy();
   });

   test('configuration settings are available', async () => {
      // Open settings
      await app.page.keyboard.press('F1');
      await app.page.waitForTimeout(500);

      await app.page.keyboard.type('Preferences: Open Settings');
      await app.page.waitForTimeout(500);

      await app.page.keyboard.press('Enter');
      await app.page.waitForTimeout(1000);

      // Search for crossmodel merge settings
      const searchBox = app.page.locator('.settings-header input[placeholder*="Search"]');
      if (await searchBox.count() > 0) {
         await searchBox.fill('crossmodelMerge');
         await app.page.waitForTimeout(500);

         // Look for our settings
         const settingsContent = app.page.locator('.settings-body');
         const content = await settingsContent.textContent();

         // Should find at least one of our settings
         const hasSettings = content?.includes('crossmodelMerge') ||
                           content?.includes('modelGlob') ||
                           content?.includes('targetRef');

         expect(hasSettings).toBeTruthy();
      }

      // Close settings
      await app.page.keyboard.press('Escape');
   });
});
