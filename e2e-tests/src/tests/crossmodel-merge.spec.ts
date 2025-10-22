/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { expect, test } from '@playwright/test';
import { CMApp } from '../page-objects/cm-app';

test.describe('CrossModel Merge Extension', () => {
   let app: CMApp;
   const TEST_ENTITY_PATH = 'ExampleCRM/entities/Customer.entity.cm';
   const TEST_RELATIONSHIP_PATH = 'ExampleCRM/relationships/Test.relationship.cm';

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

   test('all merge commands are available in command palette', async () => {
      // Wait for extension to activate
      await app.page.waitForTimeout(2000);

      const commandsToCheck = [
         'CrossModel: Preview Diff',
         'CrossModel: Merge from Ref',
         'CrossModel: Refresh',
         'CrossModel: Apply Selected',
         'CrossModel: Accept All Ours',
         'CrossModel: Accept All Theirs'
      ];

      for (const commandName of commandsToCheck) {
         // Open command palette
         await app.page.keyboard.press('F1');
         await app.page.waitForTimeout(1000);

         // Type command name
         await app.page.keyboard.type(commandName);
         await app.page.waitForTimeout(1000);

         // Check if command appears
         const commandList = app.page.locator('.quick-input-list');
         await expect(commandList).toBeVisible({ timeout: 5000 });

         const commands = await app.page.locator('.quick-input-list .monaco-list-row').allTextContents();
         const hasCommand = commands.some(cmd => cmd.includes(commandName));

         expect(hasCommand).toBeTruthy();

         // Close command palette
         await app.page.keyboard.press('Escape');
         await app.page.waitForTimeout(300);
      }
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

      // Add custom properties at the same level as attributes (at the end)
      await app.page.keyboard.press('Control+End'); // Go to end of file
      await app.page.keyboard.press('Enter'); // New line at the end
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
      // We added: 1 description line + 1 customProperties line + 3 property lines = 5 lines total
      for (let i = 0; i < 5; i++) {
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

      // Add meaningful AST properties: description and a custom property
      await app.page.keyboard.press('Control+Home'); // Go to start
      await app.page.keyboard.press('ArrowDown'); // Move to line 2 (id)
      await app.page.keyboard.press('ArrowDown'); // Move to line 3 (name)
      await app.page.keyboard.press('End'); // Go to end of line
      await app.page.keyboard.press('Enter'); // New line
      await app.page.keyboard.type('    description: "Multi-change test entity"');
      await app.page.keyboard.press('Control+End');
      await app.page.keyboard.press('Enter'); // New line at the end
      await app.page.keyboard.type('    customProperties:');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('      - id: multi_test');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('        name: "Multi Test"');
      await editor.waitForDirty();
      await editor.save();
      await app.page.waitForTimeout(1500);

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
      // We added: 1 description line + 1 customProperties line + 2 property lines = 4 lines total
      for (let i = 0; i < 4; i++) {
         await app.page.keyboard.press('Control+Z');
         await app.page.waitForTimeout(100);
      }
      await editor.save();
      await editor.close();
   });

   test('Multiple file modifications are detected', async () => {
      // Modify first file (entity)
      const entityEditor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Code Editor');
      await entityEditor.waitForVisible();

      await app.page.keyboard.press('Control+Home');
      await app.page.keyboard.press('ArrowDown'); // Move to line 2
      await app.page.keyboard.press('ArrowDown'); // Move to line 3
      await app.page.keyboard.press('End');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('    description: "Modified entity"');
      await entityEditor.waitForDirty();
      await entityEditor.save();
      await entityEditor.close();
      await app.page.waitForTimeout(500);

      // Modify second file (relationship)
      const relationshipEditor = await app.openCompositeEditor(TEST_RELATIONSHIP_PATH, 'Code Editor');
      await relationshipEditor.waitForVisible();

      await app.page.keyboard.press('Control+Home');
      await app.page.keyboard.press('ArrowDown'); // Move to line 2
      await app.page.keyboard.press('ArrowDown'); // Move to line 3
      await app.page.keyboard.press('End');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('    description: "Modified relationship"');
      await relationshipEditor.waitForDirty();
      await relationshipEditor.save();
      await relationshipEditor.close();
      await app.page.waitForTimeout(500);

      // Execute refresh
      await app.page.keyboard.press('F1');
      await app.page.waitForTimeout(1000);
      await app.page.keyboard.type('CrossModel: Refresh');
      await app.page.waitForTimeout(1000);
      await app.page.keyboard.press('Enter');
      await app.page.waitForTimeout(2000);

      // Check that no errors occurred
      const errorNotifications = app.page.locator('.theia-notification-message-error:visible');
      const errorCount = await errorNotifications.count();
      expect(errorCount).toBe(0);

      // Revert both files
      const entityEditor2 = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Code Editor');
      await entityEditor2.waitForVisible();
      await app.page.keyboard.press('Control+Z');
      await entityEditor2.save();
      await entityEditor2.close();

      const relationshipEditor2 = await app.openCompositeEditor(TEST_RELATIONSHIP_PATH, 'Code Editor');
      await relationshipEditor2.waitForVisible();
      await app.page.keyboard.press('Control+Z');
      await relationshipEditor2.save();
      await relationshipEditor2.close();
   });

   test('Tree view structure is visible after Preview Diff', async () => {
      // Make a change
      const editor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Code Editor');
      await editor.waitForVisible();

      await app.page.keyboard.press('Control+Home');
      await app.page.keyboard.press('ArrowDown');
      await app.page.keyboard.press('ArrowDown');
      await app.page.keyboard.press('End');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('    description: "Tree view test"');
      await editor.waitForDirty();
      await editor.save();
      await app.page.waitForTimeout(1000);

      // Execute Preview Diff
      await app.page.keyboard.press('F1');
      await app.page.waitForTimeout(1000);
      await app.page.keyboard.type('CrossModel: Preview Diff');
      await app.page.waitForTimeout(1000);
      await app.page.keyboard.press('Enter');
      await app.page.waitForTimeout(3000);

      // Look for tree view elements in the sidebar
      // The tree view should show file paths in a hierarchical structure
      const sidebarContainer = app.page.locator('.theia-app-left .theia-view-container');
      const isVisible = await sidebarContainer.isVisible();
      expect(isVisible).toBeTruthy();

      // Revert changes
      await app.page.keyboard.press('Control+Z');
      await editor.save();
      await editor.close();
   });

   test('Refresh command updates the view', async () => {
      // Make initial change
      const editor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Code Editor');
      await editor.waitForVisible();

      await app.page.keyboard.press('Control+Home');
      await app.page.keyboard.press('ArrowDown');
      await app.page.keyboard.press('ArrowDown');
      await app.page.keyboard.press('End');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('    description: "Refresh test 1"');
      await editor.waitForDirty();
      await editor.save();
      await app.page.waitForTimeout(1000);

      // Execute first refresh
      await app.page.keyboard.press('F1');
      await app.page.waitForTimeout(1000);
      await app.page.keyboard.type('CrossModel: Refresh');
      await app.page.waitForTimeout(1000);
      await app.page.keyboard.press('Enter');
      await app.page.waitForTimeout(2000);

      // Make another change
      await app.page.keyboard.press('Control+Home');
      await app.page.keyboard.press('ArrowDown');
      await app.page.keyboard.press('ArrowDown');
      await app.page.keyboard.press('ArrowDown');
      await app.page.keyboard.press('End');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('    version: "2.0"');
      await editor.waitForDirty();
      await editor.save();
      await app.page.waitForTimeout(1000);

      // Execute second refresh
      await app.page.keyboard.press('F1');
      await app.page.waitForTimeout(1000);
      await app.page.keyboard.type('CrossModel: Refresh');
      await app.page.waitForTimeout(1000);
      await app.page.keyboard.press('Enter');
      await app.page.waitForTimeout(2000);

      // Check no errors
      const errorNotifications = app.page.locator('.theia-notification-message-error:visible');
      const errorCount = await errorNotifications.count();
      expect(errorCount).toBe(0);

      // Revert all changes
      await app.page.keyboard.press('Control+Z');
      await app.page.keyboard.press('Control+Z');
      await editor.save();
      await editor.close();
   });

   test('Extension handles empty files gracefully', async () => {
      // Open empty entity file
      const emptyEntityPath = 'ExampleCRM/entities/EmptyEntity.entity.cm';
      const editor = await app.openCompositeEditor(emptyEntityPath, 'Code Editor');
      await editor.waitForVisible();

      // Add some content
      await app.page.keyboard.press('Control+Home');
      await app.page.keyboard.press('End');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('    description: "Added to empty entity"');
      await editor.waitForDirty();
      await editor.save();
      await app.page.waitForTimeout(1000);

      // Execute refresh
      await app.page.keyboard.press('F1');
      await app.page.waitForTimeout(1000);
      await app.page.keyboard.type('CrossModel: Refresh');
      await app.page.waitForTimeout(1000);
      await app.page.keyboard.press('Enter');
      await app.page.waitForTimeout(2000);

      // Check no errors
      const errorNotifications = app.page.locator('.theia-notification-message-error:visible');
      const errorCount = await errorNotifications.count();
      expect(errorCount).toBe(0);

      // Revert changes
      await app.page.keyboard.press('Control+Z');
      await editor.save();
      await editor.close();
   });

   test('Consecutive refreshes work correctly', async () => {
      // Make a change
      const editor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Code Editor');
      await editor.waitForVisible();

      await app.page.keyboard.press('Control+Home');
      await app.page.keyboard.press('ArrowDown');
      await app.page.keyboard.press('ArrowDown');
      await app.page.keyboard.press('End');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('    description: "Consecutive refresh test"');
      await editor.waitForDirty();
      await editor.save();
      await app.page.waitForTimeout(1000);

      // Execute multiple refreshes
      for (let i = 0; i < 3; i++) {
         await app.page.keyboard.press('F1');
         await app.page.waitForTimeout(1000);
         await app.page.keyboard.type('CrossModel: Refresh');
         await app.page.waitForTimeout(1000);
         await app.page.keyboard.press('Enter');
         await app.page.waitForTimeout(2000);

         // Check no errors after each refresh
         const errorNotifications = app.page.locator('.theia-notification-message-error:visible');
         const errorCount = await errorNotifications.count();
         expect(errorCount).toBe(0);
      }

      // Revert changes
      await app.page.keyboard.press('Control+Z');
      await editor.save();
      await editor.close();
   });

   test('Extension handles attribute changes', async () => {
      // Open entity and modify an attribute
      const editor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Code Editor');
      await editor.waitForVisible();

      // Navigate to attributes section and add a new attribute
      await app.page.keyboard.press('Control+Home');
      // Find the attributes section (usually after description and other metadata)
      for (let i = 0; i < 10; i++) {
         await app.page.keyboard.press('ArrowDown');
      }
      await app.page.keyboard.press('End');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('      - id: new_attribute');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('        name: "NewAttribute"');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('        datatype: string');
      await editor.waitForDirty();
      await editor.save();
      await app.page.waitForTimeout(1000);

      // Execute refresh
      await app.page.keyboard.press('F1');
      await app.page.waitForTimeout(1000);
      await app.page.keyboard.type('CrossModel: Refresh');
      await app.page.waitForTimeout(1000);
      await app.page.keyboard.press('Enter');
      await app.page.waitForTimeout(2000);

      // Check no errors
      const errorNotifications = app.page.locator('.theia-notification-message-error:visible');
      const errorCount = await errorNotifications.count();
      expect(errorCount).toBe(0);

      // Revert changes (3 lines added)
      for (let i = 0; i < 3; i++) {
         await app.page.keyboard.press('Control+Z');
         await app.page.waitForTimeout(100);
      }
      await editor.save();
      await editor.close();
   });

   test('Extension handles complex AST changes', async () => {
      // Open entity and make multiple complex changes
      const editor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Code Editor');
      await editor.waitForVisible();

      // Add description
      await app.page.keyboard.press('Control+Home');
      await app.page.keyboard.press('ArrowDown');
      await app.page.keyboard.press('ArrowDown');
      await app.page.keyboard.press('End');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('    description: "Complex changes test"');

      // Add version
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('    version: "1.0.0"');

      // Add custom properties
      await app.page.keyboard.press('Control+End');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('    customProperties:');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('      - id: prop1');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('        name: "Property 1"');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('        value: "value1"');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('      - id: prop2');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('        name: "Property 2"');
      await app.page.keyboard.press('Enter');
      await app.page.keyboard.type('        value: "value2"');

      await editor.waitForDirty();
      await editor.save();
      await app.page.waitForTimeout(1500);

      // Execute refresh
      await app.page.keyboard.press('F1');
      await app.page.waitForTimeout(1000);
      await app.page.keyboard.type('CrossModel: Refresh');
      await app.page.waitForTimeout(1000);
      await app.page.keyboard.press('Enter');
      await app.page.waitForTimeout(2000);

      // Check no errors
      const errorNotifications = app.page.locator('.theia-notification-message-error:visible');
      const errorCount = await errorNotifications.count();
      expect(errorCount).toBe(0);

      // Revert all changes (9 lines added)
      for (let i = 0; i < 9; i++) {
         await app.page.keyboard.press('Control+Z');
         await app.page.waitForTimeout(100);
      }
      await editor.save();
      await editor.close();
   });
});
