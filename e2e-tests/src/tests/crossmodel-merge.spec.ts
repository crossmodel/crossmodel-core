/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { expect, test } from '@playwright/test';
import { CMApp } from '../page-objects/cm-app';

test.describe('CrossModel Merge Extension', () => {
   let app: CMApp;
   const TEST_ENTITY_PATH = 'ExampleCRM/entities/Customer.entity.cm';

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

   test('CrossModel Changes view appears when file is modified', async () => {
      // Open an entity file
      const editor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Code Editor');
      await editor.waitForVisible();

      // Make meaningful AST changes: add description and custom property
      // Position cursor after the name line (line 3) to add description
      await app.page.keyboard.press('Control+Home'); // Go to start
      await app.page.keyboard.press('ArrowDown'); // Move to line 2 (id)
      await app.page.keyboard.press('ArrowDown'); // Move to line 3 (name)
      await app.page.keyboard.press('End'); // Go to end of line
      await app.page.keyboard.press('Enter'); // New line
      await app.page.keyboard.type('    description: "Test customer entity with updated description"');
      
      // Add custom properties at the end (before last line)
      await app.page.keyboard.press('Control+End'); // Go to end of file
      await app.page.keyboard.press('ArrowUp'); // Move up from last line
      await app.page.keyboard.press('End'); // Go to end of line
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('    customProperties:');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('      - id: test_prop');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('        name: "Test Property"');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('        value: "test_value"');
      
      await editor.waitForDirty();

      // Save the file
      await editor.save();
      await app.page.waitForTimeout(1500);

      // Open the Explorer view (where CrossModel Changes should appear)
      const explorerTab = app.page.locator('.theia-app-left .p-TabBar-tab[title="Explorer"]');
      if (await explorerTab.count() > 0) {
         await explorerTab.click();
         await app.page.waitForTimeout(1000);
      }

      // Execute the refresh command to populate the CrossModel Changes view
      await app.page.keyboard.press('F1');
      await app.page.waitForTimeout(1000);
      await app.page.keyboard.type('CrossModel: Refresh');
      await app.page.waitForTimeout(1000);
      await app.page.keyboard.press('Enter');
      await app.page.waitForTimeout(3000);

      // Check if the CrossModel Changes view shows up
      const viewContainer = app.page.locator('.theia-view-container');
      const hasChangesView = await viewContainer.getByText(/CrossModel Changes/i).count() > 0;

      // The view should be visible after refresh
      expect(hasChangesView).toBeTruthy();

      // Revert the changes (undo multiple times to undo all changes)
      for (let i = 0; i < 8; i++) {
         await app.page.keyboard.press('Control+Z');
         await app.page.waitForTimeout(100);
      }
      await editor.save();
      await app.page.waitForTimeout(500);

      // Close the editor
      await editor.close();
   });

   test('Preview Diff command executes without critical errors', async () => {
      // First, ensure we have a file open and modified
      const editor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Code Editor');
      await editor.waitForVisible();

      // Make a meaningful AST change - modify the description
      await app.page.keyboard.press('Control+Home'); // Go to start
      await app.page.keyboard.press('ArrowDown'); // Move to line 2 (id)
      await app.page.keyboard.press('ArrowDown'); // Move to line 3 (name)
      await app.page.keyboard.press('End'); // Go to end of line
      await app.page.keyboard.press('Enter'); // New line
      await app.page.keyboard.type('    description: "Modified for diff test"');
      await editor.waitForDirty();
      await editor.save();
      await app.page.waitForTimeout(1000);

      // Execute Preview Diff command
      await app.page.keyboard.press('F1');
      await app.page.waitForTimeout(1500);
      await app.page.keyboard.type('CrossModel: Preview Diff');
      await app.page.waitForTimeout(1500);
      await app.page.keyboard.press('Enter');
      await app.page.waitForTimeout(3000);

      // Check that no critical error occurred
      const errorNotifications = app.page.locator('.theia-notification-message-error');
      const hasError = await errorNotifications.count() > 0;
      
      if (hasError) {
         const errorText = await errorNotifications.first().textContent();
         // Allow expected info messages but not critical failures
         const isCritical = errorText?.includes('failed') || errorText?.includes('Cannot read properties');
         expect(isCritical).toBeFalsy();
      }

      // Revert changes
      await app.page.keyboard.press('Control+Z');
      await editor.save();

      // Close the editor
      await editor.close();
   });

   test('Extension handles file changes and updates view on refresh', async () => {
      // Open a file
      const editor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Code Editor');
      await editor.waitForVisible();

      // Get initial line count
      const initialContent = await editor.textContent();
      const initialLines = initialContent.split('\n').length;

      // Add meaningful AST properties: description and a custom property
      await app.page.keyboard.press('Control+Home'); // Go to start
      await app.page.keyboard.press('ArrowDown'); // Move to line 2 (id)
      await app.page.keyboard.press('ArrowDown'); // Move to line 3 (name)
      await app.page.keyboard.press('End'); // Go to end of line
      await app.page.keyboard.press('Enter'); // New line
      await app.page.keyboard.type('    description: "Multi-change test entity"');
      await app.page.keyboard.press('Control+End');
      await app.page.keyboard.press('ArrowUp');
      await app.page.keyboard.press('End');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('    customProperties:');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('      - id: multi_test');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('        name: "Multi Test"');
      await editor.waitForDirty();
      await editor.save();
      await app.page.waitForTimeout(1500);

      // Verify content changed
      const newContent = await editor.textContent();
      const newLines = newContent.split('\n').length;
      expect(newLines).toBeGreaterThan(initialLines);

      // Execute refresh to update the changes view
      await app.page.keyboard.press('F1');
      await app.page.waitForTimeout(1000);
      await app.page.keyboard.type('CrossModel: Refresh');
      await app.page.waitForTimeout(1000);
      await app.page.keyboard.press('Enter');
      await app.page.waitForTimeout(2000);

      // Check for successful refresh (no errors)
      const errorNotifications = app.page.locator('.theia-notification-message-error:visible');
      const errorCount = await errorNotifications.count();
      expect(errorCount).toBe(0);

      // Revert the file to original state (undo all changes)
      for (let i = 0; i < 6; i++) {
         await app.page.keyboard.press('Control+Z');
         await app.page.waitForTimeout(100);
      }
      await editor.save();
      await editor.close();
   });
});
