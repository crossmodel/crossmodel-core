/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { expect, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { CMApp } from '../../page-objects/cm-app';

const SETTINGS_RELPATH = '.theia/settings.json';

test.describe.serial('Dual Editor Save Behavior — Standalone Text Editor', () => {
   let app: CMApp;
   const TEST_ENTITY_PATH = 'composite-editor/DualEditorAutoSave.entity.cm';

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
   });

   test.afterAll(async () => {
      if (app?.page) {
         await app.page.close();
      }
   });

   test('Saving composite editor should clear standalone text editor dirty state without dialog (Ctrl+S)', async () => {
      // Open the file in the composite editor (form editor).
      const formEditor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Form Editor');
      const form = await formEditor.formFor('entity');
      const general = form.generalSection;
      const oldDescription = await general.getDescription();

      // Open the same file in a standalone text editor.
      const textEditor = await app.openStandaloneTextEditor(TEST_ENTITY_PATH);

      // Switch back to the composite editor and edit the description.
      await formEditor.activate();
      await general.setDescription('DualEditorSaveTest');
      await formEditor.waitForDirty();

      // Save the composite editor via Ctrl+S.
      await app.page.keyboard.press('Control+s');
      await formEditor.waitForSaved();

      // The standalone text editor must no longer be dirty.
      expect(await textEditor.isDirty()).toBe(false);

      // No overwrite / conflict dialog should have appeared.
      const dialog = app.page.locator('#theia-dialog-shell');
      expect(await dialog.isVisible({ timeout: 1000 }).catch(() => false)).toBe(false);

      // Revert the change.
      await formEditor.activate();
      await general.setDescription(oldDescription);
      await formEditor.waitForDirty();
      await formEditor.saveAndClose();
      await app.closeAnyDialog();
   });

   test('Auto-save should clear standalone text editor dirty state without dialog (standalone)', async () => {
      // Enable auto-save by writing the workspace settings file.
      // The workspace is copied to a temp directory, so we must resolve the
      // settings path relative to the actual workspace root.
      const settingsPath = path.join(app.workspace.path, SETTINGS_RELPATH);
      const originalSettings = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(originalSettings);
      settings['files.autoSave'] = 'afterDelay';
      settings['files.autoSaveDelay'] = 500;
      fs.writeFileSync(settingsPath, JSON.stringify(settings, undefined, 2));
      // Give Theia time to detect the file change and apply the setting.
      await app.page.waitForTimeout(2000);

      try {
         // Open the file in the composite editor (form editor).
         const formEditor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Form Editor');
         const form = await formEditor.formFor('entity');
         const general = form.generalSection;
         const oldDescription = await general.getDescription();

         // Open the same file in a standalone text editor.
         const textEditor = await app.openStandaloneTextEditor(TEST_ENTITY_PATH);

         // Install a persistent dialog watcher: if the "file changed on disk"
         // dialog appears at ANY point during the test, capture it immediately.
         let dialogDetected = false;
         const dialogLocator = app.page.locator('#theia-dialog-shell .dialogBlock');
         dialogLocator
            .waitFor({ state: 'visible', timeout: 60000 })
            .then(() => {
               dialogDetected = true;
            })
            .catch(() => {
               /* no dialog — expected */
            });

         // Make multiple changes to exercise several auto-save cycles, which
         // increases the chance of exposing race conditions between the
         // composite save and the standalone editor's auto-save timer.
         await formEditor.activate();
         for (let i = 1; i <= 3; i++) {
            await general.setDescription(`AutoSaveTest${i}`);
            await formEditor.waitForDirty();

            // Wait for auto-save to complete on the composite editor.
            await expect(async () => {
               expect(await formEditor.isDirty()).toBe(false);
            }).toPass({ timeout: 5000 });

            // Check if the dialog appeared during this cycle.
            expect(dialogDetected).toBe(false);
         }

         // The standalone text editor must no longer be dirty.
         await expect(async () => {
            expect(await textEditor.isDirty()).toBe(false);
         }).toPass({ timeout: 5000 });

         // No overwrite / conflict dialog should have appeared at any point.
         expect(dialogDetected).toBe(false);

         // Revert the change.
         await formEditor.activate();
         await general.setDescription(oldDescription);
         await formEditor.waitForDirty();
         await app.page.keyboard.press('Control+s');
         await expect(async () => {
            expect(await formEditor.isDirty()).toBe(false);
         }).toPass({ timeout: 5000 });
         await formEditor.close();
         await app.closeAnyDialog();
      } finally {
         // Restore the original settings.
         fs.writeFileSync(settingsPath, originalSettings);
         await app.page.waitForTimeout(500);
      }
   });
});

test.describe.serial('Dual Editor Save Behavior — Composite Form + Code Tabs', () => {
   let app: CMApp;
   const TEST_ENTITY_PATH = 'composite-editor/DualEditorAutoSave.entity.cm';

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
   });

   test.afterAll(async () => {
      if (app?.page) {
         await app.page.close();
      }
   });

   test('Saving via Ctrl+S from Form tab should not trigger conflict dialog on Code tab', async () => {
      // Open the file in the composite editor and switch to the Form Editor.
      const formEditor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Form Editor');
      const form = await formEditor.formFor('entity');
      const general = form.generalSection;
      const oldDescription = await general.getDescription();

      // Edit the description in the form.
      await general.setDescription('FormCodeCtrlS');
      await formEditor.waitForDirty();

      // Save the composite editor via Ctrl+S.
      await app.page.keyboard.press('Control+s');
      await formEditor.waitForSaved();

      // No overwrite / conflict dialog should have appeared.
      const dialog = app.page.locator('#theia-dialog-shell');
      expect(await dialog.isVisible({ timeout: 1000 }).catch(() => false)).toBe(false);

      // Switch to the Code Editor tab and verify it reflects the change.
      const codeEditor = await formEditor.parent.switchToCodeEditor();
      const codeContent = await codeEditor.textContentOfLineByLineNumber(4);
      expect(codeContent).toContain('FormCodeCtrlS');

      // Revert the change.
      await formEditor.parent.switchToFormEditor();
      await general.setDescription(oldDescription);
      await formEditor.waitForDirty();
      await formEditor.saveAndClose();
      await app.closeAnyDialog();
   });

   test('Auto-save from Form tab should not trigger conflict dialog on Code tab', async () => {
      // Enable auto-save in the workspace settings.
      const settingsPath = path.join(app.workspace.path, SETTINGS_RELPATH);
      const originalSettings = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(originalSettings);
      settings['files.autoSave'] = 'afterDelay';
      settings['files.autoSaveDelay'] = 500;
      fs.writeFileSync(settingsPath, JSON.stringify(settings, undefined, 2));
      await app.page.waitForTimeout(2000);

      try {
         // Open the file in the composite editor (Form Editor).
         const formEditor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Form Editor');
         const form = await formEditor.formFor('entity');
         const general = form.generalSection;
         const oldDescription = await general.getDescription();

         // Edit the description in the form.
         await general.setDescription('FormCodeAutoSave');
         await formEditor.waitForDirty();

         // Wait for auto-save to complete.
         await expect(async () => {
            expect(await formEditor.isDirty()).toBe(false);
         }).toPass({ timeout: 5000 });

         // No overwrite / conflict dialog should have appeared.
         const dialog = app.page.locator('#theia-dialog-shell');
         expect(await dialog.isVisible({ timeout: 1000 }).catch(() => false)).toBe(false);

         // Switch to the Code Editor tab and verify it reflects the change.
         const codeEditor = await formEditor.parent.switchToCodeEditor();
         const codeContent = await codeEditor.textContentOfLineByLineNumber(4);
         expect(codeContent).toContain('FormCodeAutoSave');

         // Revert the change.
         await formEditor.parent.switchToFormEditor();
         await general.setDescription(oldDescription);
         await formEditor.waitForDirty();
         await app.page.keyboard.press('Control+s');
         await expect(async () => {
            expect(await formEditor.isDirty()).toBe(false);
         }).toPass({ timeout: 5000 });
         await formEditor.close();
         await app.closeAnyDialog();
      } finally {
         fs.writeFileSync(settingsPath, originalSettings);
         await app.page.waitForTimeout(500);
      }
   });

   test('Edits across Form and Code tabs should auto-save without conflict dialog', async () => {
      // This test performs multiple tab switches and keyboard-driven edits which
      // are timing-sensitive. Triple the timeout when running in parallel.
      test.slow();
      // Enable auto-save in the workspace settings.
      const settingsPath = path.join(app.workspace.path, SETTINGS_RELPATH);
      const originalSettings = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(originalSettings);
      settings['files.autoSave'] = 'afterDelay';
      settings['files.autoSaveDelay'] = 500;
      fs.writeFileSync(settingsPath, JSON.stringify(settings, undefined, 2));
      await app.page.waitForTimeout(2000);

      try {
         // Open the composite editor and switch to the Form Editor.
         const formEditor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Form Editor');
         const form = await formEditor.formFor('entity');
         const general = form.generalSection;
         const oldName = await general.getName();
         const oldDescription = await general.getDescription();

         // --- Step 1: Edit the description on the Form tab. ---
         await general.setDescription('FormEdit1');
         await formEditor.waitForDirty();

         // --- Step 2: Switch to Code tab and verify the form change is there. ---
         const codeEditor = await formEditor.parent.switchToCodeEditor();
         await expect(async () => {
            const line4 = await codeEditor.textContentOfLineByLineNumber(4);
            expect(line4).toContain('FormEdit1');
         }).toPass({ timeout: 5000 });

         // --- Step 3: Make a change in the Code tab (replace the entity name on line 3). ---
         // Use Ctrl+G (Go to Line) for reliable keyboard-driven navigation —
         // click-based cursor placement is unreliable in composite editors.
         await app.page.keyboard.press('Control+g');
         await app.page.waitForTimeout(300);
         await app.page.keyboard.type('3');
         await app.page.keyboard.press('Enter');
         await app.page.waitForTimeout(200);
         // Select the entire line and type the replacement.
         await app.page.keyboard.press('Home');
         await app.page.keyboard.press('Home');
         await app.page.keyboard.press('Shift+End');
         await app.page.keyboard.type('    name: "CodeEdit"');
         // Give the editor and model server time to register and parse the change.
         // (auto-save is active at 500ms, so dirty state is transient.)
         await app.page.waitForTimeout(1000);
         const line3 = await codeEditor.textContentOfLineByLineNumber(3);
         expect(line3).toContain('CodeEdit');

         // --- Step 4: Switch back to Form tab and verify the code change is there. ---
         await formEditor.parent.switchToFormEditor();
         await expect(async () => {
            expect(await general.getName()).toBe('CodeEdit');
         }).toPass({ timeout: 5000 });

         // --- Step 5: Make another change on the Form tab. ---
         await general.setDescription('FormEdit2');
         await formEditor.waitForDirty();

         // --- Step 6: Wait for auto-save to complete. ---
         await expect(async () => {
            expect(await formEditor.isDirty()).toBe(false);
         }).toPass({ timeout: 5000 });

         // No overwrite / conflict dialog should have appeared.
         const dialog = app.page.locator('#theia-dialog-shell');
         expect(await dialog.isVisible({ timeout: 1000 }).catch(() => false)).toBe(false);

         // Verify the final state in the Code tab.
         await formEditor.parent.switchToCodeEditor();
         const nameLine = await codeEditor.textContentOfLineByLineNumber(3);
         expect(nameLine).toContain('CodeEdit');
         const descLine = await codeEditor.textContentOfLineByLineNumber(4);
         expect(descLine).toContain('FormEdit2');

         // Revert all changes.
         await formEditor.parent.switchToFormEditor();
         await general.setName(oldName);
         await general.setDescription(oldDescription);
         await formEditor.waitForDirty();
         await app.page.keyboard.press('Control+s');
         await expect(async () => {
            expect(await formEditor.isDirty()).toBe(false);
         }).toPass({ timeout: 5000 });
         await formEditor.close();
         await app.closeAnyDialog();
      } finally {
         fs.writeFileSync(settingsPath, originalSettings);
         await app.page.waitForTimeout(500);
      }
   });
});
