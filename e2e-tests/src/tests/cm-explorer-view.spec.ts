/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { expect, Page, test } from '@playwright/test';
import { CMApp } from '../page-objects/cm-app';
import { CMExplorerView } from '../page-objects/cm-explorer-view';

async function checkOpenWithItem(page: Page, text: string): Promise<boolean> {
   // Locate all elements matching the selector
   const elements = await page.$$('.quick-input-list .monaco-highlighted-label');

   // Iterate over elements to check for visibility and text content
   for (const element of elements) {
      if (await element.isVisible()) {
         const textContent = await element.textContent();
         if (textContent?.includes(text)) {
            return true;
         }
      }
   }
   return false;
}

test.describe('CrossModel Explorer View', () => {
   let app: CMApp;
   let explorer: CMExplorerView;

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
      explorer = await app.openExplorerView();
   });

   test('code and form editor options available in the context menu on an entity', async () => {
      const file = await explorer.getFileStatNodeByLabel('example-entity.entity.cm');
      expect(file).toBeDefined();
      expect(await file.label()).toBe('example-entity.entity.cm');
      const menu = await file.openContextMenu();
      expect(await menu.isOpen()).toBe(true);
      // Expect the Code and Form editor to be in the Open With menu option.
      await menu.clickMenuItem('Open With...');
      expect(await checkOpenWithItem(explorer.page, 'Text Editor')).toBeTruthy();
      expect(await checkOpenWithItem(explorer.page, 'Form Editor')).toBeTruthy();
      await menu.close();
   });

   test('code and form editor options available in the context menu on a relationship', async () => {
      const file = await explorer.getFileStatNodeByLabel('example-relationship.relationship.cm');
      expect(file).toBeDefined();
      expect(await file.label()).toBe('example-relationship.relationship.cm');
      const menu = await file.openContextMenu();
      expect(await menu.isOpen()).toBe(true);
      // Expect the Code and Form editor to be in the Open With menu option.
      await menu.clickMenuItem('Open With...');
      expect(await checkOpenWithItem(explorer.page, 'Text Editor')).toBeTruthy();
      expect(await checkOpenWithItem(explorer.page, 'Form Editor')).toBeTruthy();
      await menu.close();
   });

   test('code and diagram editor options available in the context menu on a diagram', async () => {
      const file = await explorer.getFileStatNodeByLabel('example-diagram.diagram.cm');
      expect(file).toBeDefined();
      expect(await file.label()).toBe('example-diagram.diagram.cm');
      const menu = await file.openContextMenu();
      expect(await menu.isOpen()).toBe(true);
      // Expect the Code and Diagram editor to be in the Open With menu option.
      await menu.clickMenuItem('Open With...');
      expect(await checkOpenWithItem(explorer.page, 'Text Editor')).toBeTruthy();
      expect(await checkOpenWithItem(explorer.page, 'Diagram Editor')).toBeTruthy();
      await menu.close();
   });
});
