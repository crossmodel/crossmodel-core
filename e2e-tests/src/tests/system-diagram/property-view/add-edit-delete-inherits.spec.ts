/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { expect } from '@eclipse-glsp/glsp-playwright';
import { test } from '@playwright/test';
import { CMApp } from '../../../page-objects/cm-app';

test.describe('Add/Edit/Delete inherits via properties view', () => {
   let app: CMApp;

   const SYSTEM_DIAGRAM_PATH = 'system-diagram/diagrams/AddEditDeleteInheritsDiagram.diagram.cm';
   const ENTITY_PATH = 'system-diagram/entities/AddEditDeleteInheritsEntity.entity.cm';
   const EMPTY_ENTITY_ID = 'AddEditDeleteInheritsEntity';

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
   });

   test.afterAll(async () => {
      await app.page.close();
   });

   test('Add multiple parents via properties view', async () => {
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'Diagram');
      const propertyView = await diagramEditor.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const form = await propertyView.form();

      // Add first parent
      const row1 = await form.inheritsSection.startAddInherit();
      await form.inheritsSection.commitInheritAdd(row1, 'Customer');
      await form.waitForDirty();

      const row2 = await form.inheritsSection.startAddInherit();
      await form.inheritsSection.commitInheritAdd(row2, 'Order');
      await form.waitForDirty();

      await propertyView.saveAndClose();
      await diagramEditor.saveAndClose();

      // Verify both parents present in code editor
      const entityEditor = await app.openCompositeEditor(ENTITY_PATH, 'Code Editor');
      expect(await entityEditor.textContentOfLineByLineNumber(1)).toMatch('entity:');
      expect(await entityEditor.textContentOfLineByLineNumber(2)).toMatch('id: AddEditDeleteInheritsEntity');
      expect(await entityEditor.textContentOfLineByLineNumber(3)).toMatch('name: "AddEditDeleteInheritsEntity"');
      expect(await entityEditor.textContentOfLineByLineNumber(4)).toMatch('inherits:');
      expect(await entityEditor.textContentOfLineByLineNumber(5)).toMatch('- Customer');
      expect(await entityEditor.textContentOfLineByLineNumber(6)).toMatch('- Order');

      await entityEditor.closeWithoutSave();

      // Cleanup
      const diagramEditorForCleanup = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'Diagram');
      const propertyViewForCleanup = await diagramEditorForCleanup.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const formForCleanup = await propertyViewForCleanup.form();
      await diagramEditorForCleanup.waitForModelUpdate(async () => {
         await formForCleanup.inheritsSection.deleteInherit('Customer');
         await formForCleanup.inheritsSection.deleteInherit('Order');
         await formForCleanup.waitForDirty();
      });
      await propertyViewForCleanup.saveAndClose();
      await diagramEditorForCleanup.saveAndClose();
   });

   test('Modify existing parent entry via properties view', async () => {
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'Diagram');
      const propertyView = await diagramEditor.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const form = await propertyView.form();

      // Ensure a parent exists to modify
      const created = await form.inheritsSection.startAddInherit();
      await form.inheritsSection.commitInheritAdd(created, 'Customer');
      await form.waitForDirty();

      const inherit = await form.inheritsSection.getInherit('Customer');
      await inherit.setParentId('Order');
      await inherit.save();
      await form.waitForDirty();

      await propertyView.saveAndClose();
      await diagramEditor.saveAndClose();

      // Verify code shows updated parent
      const entityEditor = await app.openCompositeEditor(ENTITY_PATH, 'Code Editor');
      expect(await entityEditor.textContentOfLineByLineNumber(4)).toMatch('inherits:');
      expect(await entityEditor.textContentOfLineByLineNumber(5)).toMatch('- Order');

      await entityEditor.closeWithoutSave();

      // Cleanup
      const diagramEditorForCleanup = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'Diagram');
      const propertyViewForCleanup = await diagramEditorForCleanup.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const formForCleanup = await propertyViewForCleanup.form();
      await diagramEditorForCleanup.waitForModelUpdate(async () => {
         await formForCleanup.inheritsSection.deleteInherit('Order');
         await formForCleanup.waitForDirty();
      });
      await propertyViewForCleanup.saveAndClose();
      await diagramEditorForCleanup.saveAndClose();
   });

   test('Remove parent via properties view', async () => {
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'Diagram');
      const propertyView = await diagramEditor.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const form = await propertyView.form();

      // Add then remove
      const created = await form.inheritsSection.startAddInherit();
      await form.inheritsSection.commitInheritAdd(created, 'Customer');
      await form.waitForDirty();
      await propertyView.save();

      const existing = await form.inheritsSection.findInherit('Customer');
      expect(existing).toBeDefined();
      await diagramEditor.waitForModelUpdate(async () => {
         await form.inheritsSection.deleteInherit('Customer');
         await form.waitForDirty();
      });
      await propertyView.save();

      await diagramEditor.saveAndClose();

      // Verify code editor shows no inherits (only base entity)
      const entityEditor = await app.openCompositeEditor(ENTITY_PATH, 'Code Editor');
      expect(await entityEditor.textContentOfLineByLineNumber(1)).toMatch('entity:');
      expect(await entityEditor.textContentOfLineByLineNumber(2)).toMatch('id: AddEditDeleteInheritsEntity');
      expect(await entityEditor.textContentOfLineByLineNumber(3)).toMatch('name: "AddEditDeleteInheritsEntity"');
      expect(await entityEditor.numberOfLines()).toBe(3);

      await entityEditor.closeWithoutSave();
   });
});
