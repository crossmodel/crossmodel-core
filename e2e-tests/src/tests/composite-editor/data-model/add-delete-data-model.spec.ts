/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { expect, test } from '@playwright/test';
import { join } from 'path';
import { CMApp } from '../../../page-objects/cm-app';
import { CMCompositeEditor } from '../../../page-objects/cm-composite-editor';

async function confirmCreationEditor(app: CMApp, parentPathFragment: string, name: string, type: string, version: string): Promise<void> {
   const untitledEditor = new CMCompositeEditor(join(parentPathFragment, 'datamodel.cm'), app, 'untitled');
   await untitledEditor.waitForVisible();
   const formEditor = await untitledEditor.switchToFormEditor();
   const form = (await formEditor.formFor('dataModel')).generalSection;
   await form.setName(name);
   await form.setType(type);
   await form.setVersion(version);
   await formEditor.waitForDirty();
   await formEditor.saveAndClose();
}

test.describe.serial('Add/Edit/Delete data model from explorer', () => {
   let app: CMApp;
   const NEW_DATA_MODEL_ID = 'New_Data_Model';
   const NEW_MODEL_PATH = 'data-model/' + NEW_DATA_MODEL_ID;
   const NEW_MODEL_DATAMODEL_PATH = NEW_MODEL_PATH + '/datamodel.cm';

   const NEW_DATA_MODEL_2_ID = 'New_Data_Model_2';
   const NEW_MODEL2_PATH = 'data-model/' + NEW_DATA_MODEL_2_ID;
   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
   });
   test.afterAll(async () => {
      await app.page.close();
   });

   test('Create model via explorer tabbar', async () => {
      const explorer = await app.openExplorerView();
      await explorer.getFileStatNodeByLabel('data-model');
      await explorer.selectTreeNode('data-model');

      const tabBarToolbarNewModel = await explorer.tabBarToolbar.toolBarItem('crossbreeze.new.data-model.toolbar');
      expect(tabBarToolbarNewModel).toBeDefined();
      if (!tabBarToolbarNewModel) {
         return;
      }
      await tabBarToolbarNewModel.trigger();

      const name = 'New Data Model';
      const modelType = 'Logical';
      const version = '0.0.1';
      await confirmCreationEditor(app, 'data-model/_/', name, modelType, version);

      // Verify that the model was created as expected
      await explorer.activate();
      expect(await explorer.existsFileNode(NEW_MODEL_DATAMODEL_PATH)).toBeTruthy();

      // Verify the model file contents is as expected.
      const savedEditor = await app.openCompositeEditor(NEW_MODEL_DATAMODEL_PATH, 'Code Editor');
      expect((await savedEditor.textContentOfLineByLineNumber(2))?.trim()).toBe(`id: ${NEW_DATA_MODEL_ID}`);
      expect((await savedEditor.textContentOfLineByLineNumber(3))?.trim()).toBe(`name: "${name}"`);
      expect((await savedEditor.textContentOfLineByLineNumber(4))?.trim()).toBe('type: logical');
      expect((await savedEditor.textContentOfLineByLineNumber(5))?.trim()).toBe(`version: ${version}`);
      await savedEditor.saveAndClose();

      await explorer.activate();
      await explorer.selectTreeNode(NEW_MODEL_PATH);
      const expectedTabbarToolbarItems = await Promise.all([
         explorer.tabBarToolbar.toolBarItem('crossbreeze.new.entity.toolbar'),
         explorer.tabBarToolbar.toolBarItem('crossbreeze.new.relationship.toolbar'),
         explorer.tabBarToolbar.toolBarItem('crossbreeze.new.system-diagram.toolbar'),
         explorer.tabBarToolbar.toolBarItem('crossbreeze.new.mapping.toolbar')
      ]);
      expectedTabbarToolbarItems.forEach(item => expect(item).toBeDefined());
      const node = await explorer.getFileStatNodeByLabel(NEW_MODEL_PATH);
      const menu = await node.openContextMenu();
      const expectedContextMenuItems = await Promise.all([
         menu.menuItemByNamePath('New Element', 'Entity...'),
         menu.menuItemByNamePath('New Element', 'Relationship...'),
         menu.menuItemByNamePath('New Element', 'System Diagram...'),
         menu.menuItemByNamePath('New Element', 'Mapping...')
      ]);
      expectedContextMenuItems.forEach(item => expect(item).toBeDefined());
   });

   test('Create model via context menu', async () => {
      const explorer = await app.openExplorerView();
      // Create node
      const folderNode = await explorer.getFileStatNodeByLabel('data-model');
      const contextMenu = await folderNode.openContextMenu();
      // Menu structure changed: Data Model may be a direct action or under "New Element".
      // Try the direct action first, then fall back to the the old submenu path for robustness.
      let menuItem;
      try {
         menuItem = await contextMenu.menuItemByNamePath('New Data Model...');
      } catch (e) {
         try {
            menuItem = await contextMenu.menuItemByNamePath('New Element', 'Data Model...');
         } catch (e2) {
            menuItem = undefined;
         }
      }
      expect(menuItem).toBeDefined();
      await menuItem?.click();

      const name = 'New Data Model 2';
      const modelType = 'Relational';
      const version = '0.0.1';
      await confirmCreationEditor(app, 'data-model/_/', name, modelType, version);
      await explorer.activate();

      // Verify that the model was created as expected
      expect(await explorer.existsDirectoryNode(NEW_MODEL2_PATH)).toBeTruthy();

      await explorer.selectTreeNode(NEW_MODEL2_PATH);
      const unexpectedTabbarToolbarItems = await Promise.all([
         explorer.tabBarToolbar.toolBarItem('crossbreeze.new.entity.toolbar'),
         explorer.tabBarToolbar.toolBarItem('crossbreeze.new.relationship.toolbar'),
         explorer.tabBarToolbar.toolBarItem('crossbreeze.new.system-diagram.toolbar'),
         explorer.tabBarToolbar.toolBarItem('crossbreeze.new.mapping.toolbar')
      ]);
      unexpectedTabbarToolbarItems.forEach(item => expect(item).toBeUndefined());
      const node = await explorer.getFileStatNodeByLabel(NEW_MODEL2_PATH);
      const menu = await node.openContextMenu();
      const unexpectedContextMenuItems = await Promise.allSettled([
         menu.menuItemByNamePath('New Element', 'Entity...'),
         menu.menuItemByNamePath('New Element', 'Relationship...'),
         menu.menuItemByNamePath('New Element', 'System Diagram...'),
         menu.menuItemByNamePath('New Element', 'Mapping...')
      ]);
      unexpectedContextMenuItems.forEach(item => expect(item.status).toBe('rejected'));
   });
});
