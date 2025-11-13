/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { expect, test } from '@playwright/test';
import { join } from 'path';
import { CMApp } from '../../../page-objects/cm-app';
import { CMCompositeEditor } from '../../../page-objects/cm-composite-editor';

async function confirmCreationEditor(app: CMApp, parentPathFragment: string, entityName: string, description?: string): Promise<void> {
   const untitledEditor = new CMCompositeEditor(join(parentPathFragment, 'NewRelationship.relationship.cm'), app, 'untitled');
   await untitledEditor.waitForVisible();
   const formEditor = await untitledEditor.switchToFormEditor();
   const form = (await formEditor.formFor('relationship')).generalSection;
   await form.setName(entityName);
   if (description) {
      await form.setDescription(description);
   }
   formEditor.waitForDirty();
   formEditor.saveAndClose();
}

test.describe('Add/Edit/Delete relationship from explorer', () => {
   let app: CMApp;
   const RELATIONSHIP_PARENT_PATH = 'composite-editor/relationships';
   const NEW_RELATIONSHIP_PATH = `${RELATIONSHIP_PARENT_PATH}/NewRelationship.relationship.cm`;
   const TEST_RELATIONSHIP_PATH = `${RELATIONSHIP_PARENT_PATH}/Test.relationship.cm`;

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
   });
   test.afterAll(async () => {
      await app.page.close();
   });

   test('Create relationship via explorer tabbar', async () => {
      const explorer = await app.openExplorerView();
      await explorer.getFileStatNodeByLabel(RELATIONSHIP_PARENT_PATH);
      await explorer.selectTreeNode(RELATIONSHIP_PARENT_PATH);

      const tabBarToolbarNewRelationship = await explorer.tabBarToolbar.toolBarItem('crossbreeze.new.relationship.toolbar');
      expect(tabBarToolbarNewRelationship).toBeDefined();
      if (!tabBarToolbarNewRelationship) {
         return;
      }
      await tabBarToolbarNewRelationship.trigger();
      await confirmCreationEditor(app, RELATIONSHIP_PARENT_PATH, 'NewRelationship');

      // Verify that the relationship was created as expected
      explorer.activate();
      expect(await explorer.existsFileNode(NEW_RELATIONSHIP_PATH)).toBeTruthy();

      const editor = await app.openCompositeEditor(NEW_RELATIONSHIP_PATH, 'Code Editor');
      expect(await editor.textContentOfLineByLineNumber(1)).toBe('relationship:');
      expect(await editor.textContentOfLineByLineNumber(2)).toMatch('id: NewRelationship');
      expect(await editor.textContentOfLineByLineNumber(3)).toMatch('name: "NewRelationship"');
      await editor.close();
   });

   test('Edit relationship name & description using form editor ', async () => {
      // Workaround: New relationship created in the previous test is incomplete, so we use an existing one instead
      const formEditor = await app.openCompositeEditor(TEST_RELATIONSHIP_PATH, 'Form Editor');
      const form = await formEditor.formFor('relationship');
      const general = await form.generalSection;
      await general.setName('NewRelationshipRenamed');
      await general.setDescription('NewRelationshipRenamed');
      await formEditor.waitForDirty();
      await formEditor.saveAndClose();

      // Verify that the relationship file was changed as expected
      const editor = await app.openCompositeEditor(TEST_RELATIONSHIP_PATH, 'Code Editor');
      expect(await editor.textContentOfLineByLineNumber(3)).toMatch('name: "NewRelationshipRenamed"');
      expect(await editor.textContentOfLineByLineNumber(4)).toMatch('description: "NewRelationshipRenamed"');
      await editor.saveAndClose();
   });

   test('Delete relationship via context menu', async () => {
      const explorer = await app.openExplorerView();
      await explorer.deleteNode(NEW_RELATIONSHIP_PATH);
      expect(await explorer.findTreeNode(NEW_RELATIONSHIP_PATH)).toBeUndefined();
   });
});
