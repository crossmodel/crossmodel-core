/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import * as fs from 'fs';
import * as path from 'path';
import { expect, test } from '@playwright/test';
import { CMApp } from '../../page-objects/cm-app';

const SETTINGS_RELPATH = '.theia/settings.json';
const AUTO_SAVE_DELAY = 500;

/**
 * Installs a MutationObserver on a tab element that detects dirty→not-dirty
 * transitions (i.e. an auto-save occurred). Call `readAndCleanup` to retrieve
 * the result and disconnect the observer.
 *
 * @param tabSelector - CSS selector for the editor's shell tab element.
 */
async function installSaveDetector(app: CMApp, tabSelector: string): Promise<{ readAndCleanup: () => Promise<boolean> }> {
   const detectorKey = '__autoSaveDetector_' + Date.now();

   await app.page.evaluate(
      ({ selector, key }) => {
         const tab = document.querySelector(selector);
         if (!tab) {
            throw new Error(`Tab not found: ${selector}`);
         }

         const state = { wasDirty: tab.classList.contains('theia-mod-dirty'), savedDuringTyping: false };

         const observer = new MutationObserver(() => {
            const isDirty = tab.classList.contains('theia-mod-dirty');
            if (isDirty) {
               state.wasDirty = true;
            } else if (state.wasDirty) {
               // Was dirty, now clean → a save occurred.
               state.savedDuringTyping = true;
            }
         });
         observer.observe(tab, { attributes: true, attributeFilter: ['class'] });

         (window as any)[key] = { state, observer };
      },
      { selector: tabSelector, key: detectorKey }
   );

   return {
      readAndCleanup: () =>
         app.page.evaluate(key => {
            const detector = (window as any)[key];
            if (!detector) {
               return false;
            }
            detector.observer.disconnect();
            delete (window as any)[key];
            return detector.state.savedDuringTyping;
         }, detectorKey)
   };
}

/**
 * Simulates realistic typing: a burst of characters, a brief pause (long
 * enough to trigger the form widget's 200ms debounce, which starts the
 * auto-save timer), then continued typing.
 *
 * If the auto-save timer is not reset by keystrokes during the second burst,
 * the auto-save will fire while the user is still typing — this is the bug
 * we want to reproduce for the composite editor (form).
 */
async function typeWithNaturalPause(app: CMApp, text: string): Promise<void> {
   const pauseIndex = Math.min(5, Math.floor(text.length / 2));
   const firstBurst = text.slice(0, pauseIndex);
   const secondBurst = text.slice(pauseIndex);

   // First burst: type a few characters quickly.
   await app.page.keyboard.type(firstBurst, { delay: 80 });

   // Pause long enough for the form widget's 200ms debounce to fire, which
   // triggers setDirty(true) + onContentChanged and starts the auto-save timer.
   // For the text editor, this pause also triggers a debounce, but subsequent
   // keystrokes will reset the auto-save timer on each keystroke.
   await app.page.waitForTimeout(300);

   // Second burst: continue typing for well over the auto-save delay.
   // 20+ chars at 80ms = 1600ms+, much longer than the 500ms auto-save delay.
   await app.page.keyboard.type(secondBurst, { delay: 80 });
}

test.describe.serial('Auto-save should defer while typing', () => {
   let app: CMApp;
   let settingsPath: string;
   let originalSettings: string;
   const TEST_ENTITY_PATH = 'composite-editor/DualEditorAutoSave.entity.cm';

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });

      // Enable auto-save with a short delay.
      settingsPath = path.join(app.workspace.path, SETTINGS_RELPATH);
      originalSettings = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(originalSettings);
      settings['files.autoSave'] = 'afterDelay';
      settings['files.autoSaveDelay'] = AUTO_SAVE_DELAY;
      fs.writeFileSync(settingsPath, JSON.stringify(settings, undefined, 2));
      // Give Theia time to detect the settings file change.
      await app.page.waitForTimeout(2000);
   });

   test.afterAll(async () => {
      // Restore original settings.
      if (settingsPath && originalSettings) {
         fs.writeFileSync(settingsPath, originalSettings);
      }
      if (app?.page) {
         await app.page.close();
      }
   });

   test('Standalone text editor: auto-save defers while typing with natural pauses', async () => {
      // Open the file in a standalone text editor.
      const textEditor = await app.openStandaloneTextEditor(TEST_ENTITY_PATH);
      await textEditor.activate();

      // Place the cursor in the description line (line 4) and select the line.
      await textEditor.placeCursorInLineWithLineNumber(4);
      await app.page.keyboard.press('Home');
      await app.page.keyboard.press('Home');
      await app.page.keyboard.press('Shift+End');

      // Type an initial value and wait for auto-save to complete (clean state).
      await app.page.keyboard.type('    description: "initial"');
      await expect(async () => {
         expect(await textEditor.isDirty()).toBe(false);
      }).toPass({ timeout: 10000 });

      // Select the description line again for the real test.
      await textEditor.placeCursorInLineWithLineNumber(4);
      await app.page.keyboard.press('Home');
      await app.page.keyboard.press('Home');
      await app.page.keyboard.press('Shift+End');

      // Install the save detector BEFORE typing.
      const detector = await installSaveDetector(app, textEditor.tabSelector);

      // Type with a natural pause in the middle. The pause triggers the
      // auto-save timer, but continued keystrokes should reset it.
      await typeWithNaturalPause(app, '    description: "typing test value here"');

      // Check: no save should have fired during typing.
      const savedDuringTyping = await detector.readAndCleanup();
      expect(savedDuringTyping).toBe(false);

      // The editor should still be dirty right after typing.
      expect(await textEditor.isDirty()).toBe(true);

      // After stopping, auto-save should complete within the delay.
      await expect(async () => {
         expect(await textEditor.isDirty()).toBe(false);
      }).toPass({ timeout: 10000 });

      // Revert: restore the original description.
      await textEditor.placeCursorInLineWithLineNumber(4);
      await app.page.keyboard.press('Home');
      await app.page.keyboard.press('Home');
      await app.page.keyboard.press('Shift+End');
      await app.page.keyboard.type('    description: "Test entity for dual editor auto-save"');
      await expect(async () => {
         expect(await textEditor.isDirty()).toBe(false);
      }).toPass({ timeout: 10000 });
      await textEditor.close();
   });

   test('Composite editor (form): auto-save should defer while typing with natural pauses', async () => {
      // Open the file in the composite editor and switch to the Form Editor.
      const formEditor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Form Editor');
      const form = await formEditor.formFor('entity');
      const general = form.generalSection;
      const oldDescription = await general.getDescription();

      // Make an initial change and wait for auto-save to complete (clean state).
      await general.setDescription('initial');
      await formEditor.waitForDirty();
      await expect(async () => {
         expect(await formEditor.isDirty()).toBe(false);
      }).toPass({ timeout: 10000 });

      // Focus the description field and select all its text.
      const descriptionInput = general.locator.getByLabel('Description');
      await descriptionInput.click();
      await app.page.keyboard.press('Control+a');

      // Install the save detector BEFORE typing.
      const detector = await installSaveDetector(app, formEditor.parent.tabSelector);

      // Type with a natural pause in the middle. The pause triggers the
      // form widget's 200ms debounce (setting dirty + starting the auto-save
      // timer). Continued keystrokes should reset the auto-save timer — but
      // currently they don't, because the form widget only fires
      // onContentChanged after the debounce, not on each keystroke.
      await typeWithNaturalPause(app, 'AutoSaveTimingTestWithPause');

      // Check: no save should have fired during typing.
      const savedDuringTyping = await detector.readAndCleanup();
      expect(savedDuringTyping).toBe(false);

      // After stopping, auto-save should complete within the delay.
      await expect(async () => {
         expect(await formEditor.isDirty()).toBe(false);
      }).toPass({ timeout: 10000 });

      // Revert the change.
      await general.setDescription(oldDescription);
      await formEditor.waitForDirty();
      await app.page.keyboard.press('Control+s');
      await expect(async () => {
         expect(await formEditor.isDirty()).toBe(false);
      }).toPass({ timeout: 10000 });
      await formEditor.close();
      await app.closeAnyDialog();
   });
});
