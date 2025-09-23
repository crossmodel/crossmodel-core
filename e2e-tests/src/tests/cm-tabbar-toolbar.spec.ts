/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { expect, test } from '@playwright/test';
import { OSUtil } from '@theia/playwright';
import { CMApp } from '../page-objects/cm-app';
import { CMExplorerView } from '../page-objects/cm-explorer-view';
import { TheiaSingleInputDialog } from '../page-objects/theia-single-input-dialog';

test.describe('CrossModel TabBar Toolbar', () => {
   let app: CMApp;
   let explorer: CMExplorerView;

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
      explorer = await app.openExplorerView();
   });
   test.beforeEach(async () => {
      await explorer.focus();
      await explorer.tabBarToolbar.waitForVisible();
   });

   test('create new diagram from tabbar toolbar', async () => {
      // A data model of the appropriate type must be selected for the commands to be visible.
      await explorer.selectTreeNode('ExampleCRM');
      // Get the new-entity toolbar item.
      const tabBarToolbarNewEntity = await explorer.tabBarToolbar.toolBarItem('crossbreeze.new.system-diagram.toolbar');
      expect(tabBarToolbarNewEntity).toBeDefined();
      if (tabBarToolbarNewEntity) {
         // expect(await tabBarToolbarNewEntity.isEnabled()).toBe(true);
         // Click on the new-entity toolbar item.
         await tabBarToolbarNewEntity.trigger();

         const newDiagramDialog = new TheiaSingleInputDialog(app);
         // Wait for the New Entity dialog to popup.
         newDiagramDialog.waitForVisible();
         // Check the title of the dialog.
         expect(await newDiagramDialog.title()).toBe('New System Diagram...');
         // Set the name for the new entity.
         await newDiagramDialog.enterSingleInput('diagram-created-from-tabbar-toolbar');
         // Wait until we can click the main button.
         await newDiagramDialog.waitUntilMainButtonIsEnabled();
         // Confirm the dialog.
         await newDiagramDialog.confirm();
         // Wait until the dialog is closed.
         await newDiagramDialog.waitForClosed();

         explorer = await app.openView(CMExplorerView);
         const file = await explorer.fileStatNode(
            'ExampleCRM' +
               OSUtil.fileSeparator +
               'diagrams' +
               OSUtil.fileSeparator +
               'diagram-created-from-tabbar-toolbar.system-diagram.cm'
         );
         expect(file).toBeDefined();
         expect(await file!.label()).toBe('diagram-created-from-tabbar-toolbar.system-diagram.cm');
      }
   });
});
