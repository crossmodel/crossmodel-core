/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { expect, test } from '@playwright/test';
import { CMApp } from '../../../page-objects/cm-app';

test.describe('Add/Edit/Delete inherits of an entity using the composite editor', () => {
   let app: CMApp;
   const TEST_ENTITY_PATH = 'composite-editor/entities/AddEditDeleteInherits.entity.cm';

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
   });

   test.afterAll(async () => {
      await app.page.close();
   });

   test('Add multiple parent entities to inheritance list', async () => {
      const formEditor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Form Editor');
      const form = await formEditor.formFor('entity');
      const inheritsSection = form.inheritsSection;

      const row1 = await inheritsSection.startAddInherit();
      await inheritsSection.commitInheritAdd(row1, 'Customer');
      await formEditor.waitForDirty();

      const saved1 = await inheritsSection.findInherit('Customer');
      expect(saved1).toBeDefined();

      const row2 = await inheritsSection.startAddInherit();
      await inheritsSection.commitInheritAdd(row2, 'Order');
      await formEditor.waitForDirty();

      const saved2 = await inheritsSection.findInherit('Order');
      expect(saved2).toBeDefined();

      const allInherits = await inheritsSection.getAllInherits();
      // Expect at least the two we added plus any existing ones
      expect(allInherits.length).toBeGreaterThanOrEqual(2);

      // Verify code editor shows the new parents at exact lines (file starts with entity header)
      const entityCodeEditor = await formEditor.parent.switchToCodeEditor();
      expect(await entityCodeEditor.textContentOfLineByLineNumber(1)).toMatch('entity:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(2)).toMatch('id: AddEditDeleteInherits');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(3)).toMatch('name: "Inherits"');
      // The inherits section should start at line 4 once parents are added
      expect(await entityCodeEditor.textContentOfLineByLineNumber(4)).toMatch('inherits:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(5)).toMatch('- Customer');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(6)).toMatch('- Order');

      // Undo changes
      await formEditor.closeWithoutSave();
   });

   test('Modify existing parent entry', async () => {
      const formEditor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Form Editor');
      const form = await formEditor.formFor('entity');
      const inheritsSection = form.inheritsSection;

      // Add a parent first so we can modify it
      const created = await inheritsSection.startAddInherit();
      await inheritsSection.commitInheritAdd(created, 'Customer');
      await formEditor.waitForDirty();

      const inherit = await inheritsSection.getInherit('Customer');
      await inherit.setParentId('Order');
      await inherit.save();
      await formEditor.waitForDirty();

      const modified = await inheritsSection.findInherit('Order');
      expect(modified).toBeDefined();
      expect(await modified?.getParentId()).toBe('Order');

      const entityCodeEditor = await formEditor.parent.switchToCodeEditor();
      expect(await entityCodeEditor.textContentOfLineByLineNumber(4)).toMatch('inherits:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(5)).toMatch('- Order');

      // Undo changes
      await formEditor.closeWithoutSave();
   });

   test('Remove parent from inheritance list', async () => {
      const formEditor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Form Editor');
      const form = await formEditor.formFor('entity');
      const inheritsSection = form.inheritsSection;

      // Add a parent to delete
      const created = await inheritsSection.startAddInherit();
      await inheritsSection.commitInheritAdd(created, 'Customer');
      await formEditor.waitForDirty();

      const existing = await inheritsSection.findInherit('Customer');
      expect(existing).toBeDefined();
      await existing?.delete();
      await formEditor.waitForDirty();

      const deleted = await inheritsSection.findInherit('Customer');
      expect(deleted).toBeUndefined();

      // Verify code editor updated (parent removed) -> file should now have only the original 3 lines
      const entityCodeEditor = await formEditor.parent.switchToCodeEditor();
      expect(await entityCodeEditor.numberOfLines()).toBe(3);

      // Undo changes
      expect(formEditor.isDirty()).toBeTruthy();
      await formEditor.closeWithoutSave();
   });
});
