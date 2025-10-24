/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { expect, test } from '@playwright/test';
import { join } from 'path';
import { CMApp } from '../../page-objects/cm-app';
import { CMCompositeEditor } from '../../page-objects/cm-composite-editor';

async function confirmCreationEditor(app: CMApp, parentPathFragment: string, name: string, type: string, version: string): Promise<void> {
   const untitledEditor = new CMCompositeEditor(join(parentPathFragment, 'datamodel.cm'), app, 'untitled');
   await untitledEditor.waitForVisible();
   const formEditor = await untitledEditor.switchToFormEditor();
   const form = (await formEditor.formFor('dataModel')).generalSection;
   await form.setName(name);
   await form.setType(type);
   await form.setVersion(version);
   formEditor.waitForDirty();
   formEditor.saveAndClose();
}

test.describe.serial('Add/Edit/Delete data model from explorer', () => {
   let app: CMApp;
   const NEW_DATA_MODEL_ID = 'New_Data_Model';
   const NEW_MODEL_PATH = 'testFolder/' + NEW_DATA_MODEL_ID;
   const NEW_MODEL_DATAMODEL_PATH = NEW_MODEL_PATH + '/datamodel.cm';

   const NEW_DATA_MODEL_2_ID = 'New_Data_Model_2';
   const NEW_MODEL2_PATH = 'testFolder/' + NEW_DATA_MODEL_2_ID;
   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
   });
   test.afterAll(async () => {
      await app.page.close();
   });

   test('Create model via explorer tabbar', async () => {
      const explorer = await app.openExplorerView();
      await explorer.getFileStatNodeByLabel('testFolder');
      await explorer.selectTreeNode('testFolder');

      const tabBarToolbarNewModel = await explorer.tabBarToolbar.toolBarItem('crossbreeze.new.data-model.toolbar');
      expect(tabBarToolbarNewModel).toBeDefined();
      if (!tabBarToolbarNewModel) {
         return;
      }
      await tabBarToolbarNewModel.trigger();

      const name = 'New Data Model';
      const modelType = 'Logical';
      const version = '0.0.1';
      await confirmCreationEditor(app, 'testFolder/_/', name, modelType, version);

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
      const folderNode = await explorer.getFileStatNodeByLabel('testFolder');
      const contextMenu = await folderNode.openContextMenu();
      const menuItem = await contextMenu.menuItemByNamePath('New Element', 'Data Model...');
      expect(menuItem).toBeDefined();
      await menuItem?.click();

      const name = 'New Data Model 2';
      const modelType = 'Relational';
      const version = '0.0.1';
      await confirmCreationEditor(app, 'testFolder/_/', name, modelType, version);
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

   test('Edit data model properties', async () => {
      // Open the data model that was created in the first test
      const dataModelEditor = await app.openCompositeEditor(NEW_MODEL_DATAMODEL_PATH, 'Form Editor');
      const form = (await dataModelEditor.formFor('dataModel')).generalSection;

      // Edit the data model properties
      await form.setName('Updated Data Model Name');
      await form.setDescription('This is an updated description');
      await form.setVersion('2.0.0');

      await dataModelEditor.waitForDirty();
      await dataModelEditor.saveAndClose();

      // Verify changes were saved
      const codeEditor = await app.openCompositeEditor(NEW_MODEL_DATAMODEL_PATH, 'Code Editor');
      expect((await codeEditor.textContentOfLineByLineNumber(3))?.trim()).toBe('name: "Updated Data Model Name"');
      expect((await codeEditor.textContentOfLineByLineNumber(4))?.trim()).toContain('description: "This is an updated description"');
      expect((await codeEditor.textContentOfLineByLineNumber(6))?.trim()).toBe('version: 2.0.0');
      await codeEditor.saveAndClose();
   });

   test('Delete data model via explorer', async () => {
      const explorer = await app.openExplorerView();
      // Delete the first data model
      await explorer.deleteNode(NEW_MODEL_PATH, true);
      expect(await explorer.findTreeNode(NEW_MODEL_PATH)).toBeUndefined();
      // Delete the second data model
      await explorer.deleteNode(NEW_MODEL2_PATH, true);
      expect(await explorer.findTreeNode(NEW_MODEL2_PATH)).toBeUndefined();
   });
});
