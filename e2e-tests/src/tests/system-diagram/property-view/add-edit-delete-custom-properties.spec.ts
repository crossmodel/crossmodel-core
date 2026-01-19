/********************************************************************************
 * Copyright (c) 2026 CrossBreeze.
 ********************************************************************************/
import { expect } from '@eclipse-glsp/glsp-playwright';
import { test } from '@playwright/test';
import 'reflect-metadata';
import { CMApp } from '../../../page-objects/cm-app';

test.describe('Add/Edit/Delete custom properties to/from an entity in a diagram', () => {
   let app: CMApp;
   const SYSTEM_DIAGRAM_PATH = 'system-diagram/diagrams/AddEditDeleteCustomPropertiesDiagram.system-diagram.cm';
   const ENTITY_PATH = 'system-diagram/entities/AddEditDeleteCustomPropertiesEntity.entity.cm';
   const EMPTY_ENTITY_ID = 'AddEditDeleteCustomPropertiesEntity';

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
   });
   test.afterAll(async () => {
      await app.page.close();
   });

   test('Add custom property via properties view', async () => {
      const PROPERTY_NAME = 'MyCustomProp';
      const PROPERTY_VALUE = 'MyValue';

      // Open the system diagram
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyView = await diagramEditor.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const form = await propertyView.form();

      // Add custom property
      const propertyInEdit = await form.customPropertiesSection.startAddProperty();
      const property = await form.customPropertiesSection.commitPropertyAdd(propertyInEdit, PROPERTY_NAME, PROPERTY_VALUE);
      await form.waitForDirty();

      // Verify that the property is added to the properties view with correct values
      const values = await property.getValues();
      expect(values).toMatchObject({
         name: PROPERTY_NAME,
         value: PROPERTY_VALUE
      });

      await propertyView.saveAndClose();
      await diagramEditor.saveAndClose();

      // Verify changes in code editor
      const entityCodeEditor = await app.openCompositeEditor(ENTITY_PATH, 'Code Editor');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(4)).toMatch('customProperties:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(5)).toMatch(`- id: ${PROPERTY_NAME}`);
      expect(await entityCodeEditor.textContentOfLineByLineNumber(6)).toMatch(`name: "${PROPERTY_NAME}"`);
      expect(await entityCodeEditor.textContentOfLineByLineNumber(7)).toMatch(`value: "${PROPERTY_VALUE}"`);

      await entityCodeEditor.closeWithoutSave();

      // Cleanup
      const diagramEditorForCleanup = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyViewForCleanup = await diagramEditorForCleanup.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const formForCleanup = await propertyViewForCleanup.form();

      await diagramEditorForCleanup.waitForModelUpdate(async () => {
         await formForCleanup.customPropertiesSection.deleteProperty(PROPERTY_NAME);
         await formForCleanup.waitForDirty();
      });

      await diagramEditorForCleanup.saveAndClose();
   });

   test('Edit custom property via properties view', async () => {
      const PROP_NAME = 'PropToEdit';
      const NEW_VAL = 'NewVal';
      const NEW_DESC = 'NewDesc';

      // Add property
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyView = await diagramEditor.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const form = await propertyView.form();

      await diagramEditor.waitForModelUpdate(async () => {
         const p = await form.customPropertiesSection.startAddProperty();
         await form.customPropertiesSection.commitPropertyAdd(p, PROP_NAME);
         await form.waitForDirty();
      });

      await diagramEditor.saveAndClose();

      // Edit
      const diagramEditorEdit = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyViewEdit = await diagramEditorEdit.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const formEdit = await propertyViewEdit.form();

      const property = await formEdit.customPropertiesSection.getProperty(PROP_NAME);

      await diagramEditorEdit.waitForModelUpdate(async () => {
         await property.setValue(NEW_VAL);
         await property.setDescription(NEW_DESC);
         await formEdit.waitForDirty();
      });

      const values = await property.getValues();
      expect(values).toMatchObject({
         name: PROP_NAME,
         value: NEW_VAL,
         description: NEW_DESC
      });

      await diagramEditorEdit.saveAndClose();

      // Verify changes in code editor
      const entityCodeEditor = await app.openCompositeEditor(ENTITY_PATH, 'Code Editor');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(4)).toMatch('customProperties:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(5)).toMatch(`- id: ${PROP_NAME}`);
      expect(await entityCodeEditor.textContentOfLineByLineNumber(6)).toMatch(`name: "${PROP_NAME}"`);
      expect(await entityCodeEditor.textContentOfLineByLineNumber(7)).toMatch(`description: "${NEW_DESC}"`);
      expect(await entityCodeEditor.textContentOfLineByLineNumber(8)).toMatch(`value: "${NEW_VAL}"`);

      await entityCodeEditor.closeWithoutSave();

      // Cleanup
      const diagramEditorForCleanup = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyViewForCleanup = await diagramEditorForCleanup.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const formForCleanup = await propertyViewForCleanup.form();

      await diagramEditorForCleanup.waitForModelUpdate(async () => {
         await formForCleanup.customPropertiesSection.deleteProperty(PROP_NAME);
         await formForCleanup.waitForDirty();
      });

      await diagramEditorForCleanup.saveAndClose();
   });

   test('Edit custom property and verify changes in code editor before saving', async () => {
      const PROPERTY_NAME = 'PropToEditBeforeSave';
      const PROPERTY_VALUE = 'TestValue';

      // Open the system diagram and add a custom property
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyView = await diagramEditor.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const form = await propertyView.form();
      const propertyInEdit = await form.customPropertiesSection.startAddProperty();
      await form.customPropertiesSection.commitPropertyAdd(propertyInEdit, PROPERTY_NAME, PROPERTY_VALUE);
      await form.waitForDirty();

      // Open the entity file in Code Editor to verify changes WITHOUT saving diagram first
      const entityEditor = await app.openCompositeEditor(ENTITY_PATH, 'Code Editor');
      expect(await entityEditor.textContentOfLineByLineNumber(1)).toMatch('entity:');
      expect(await entityEditor.textContentOfLineByLineNumber(2)).toMatch(`id: ${EMPTY_ENTITY_ID}`);
      expect(await entityEditor.textContentOfLineByLineNumber(3)).toMatch(`name: "${EMPTY_ENTITY_ID}"`);
      expect(await entityEditor.textContentOfLineByLineNumber(4)).toMatch('customProperties:');
      expect(await entityEditor.textContentOfLineByLineNumber(5)).toMatch(`- id: ${PROPERTY_NAME}`);
      expect(await entityEditor.textContentOfLineByLineNumber(6)).toMatch(`name: "${PROPERTY_NAME}"`);
      expect(await entityEditor.textContentOfLineByLineNumber(7)).toMatch(`value: "${PROPERTY_VALUE}"`);

      await entityEditor.closeWithoutSave();

      // Close both editors without saving
      await diagramEditor.closeWithoutSave();
   });

   test('Delete the custom property via properties view', async () => {
      const PROP_NAME = 'PropToDelete';

      // Clean up properties from previous tests if they exist
      const diagramEditorForCleanup = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyViewForCleanup = await diagramEditorForCleanup.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const formForCleanup = await propertyViewForCleanup.form();
      const props = await formForCleanup.customPropertiesSection.getAllProperties();
      if (props.length > 0) {
         const values = await props[0].getValues();
         await diagramEditorForCleanup.waitForModelUpdate(async () => {
            await formForCleanup.customPropertiesSection.deleteProperty(values.name);
            await formForCleanup.waitForDirty();
         });
         await propertyViewForCleanup.save();
      }
      await diagramEditorForCleanup.close();

      // Add property
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyView = await diagramEditor.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const form = await propertyView.form();

      await diagramEditor.waitForModelUpdate(async () => {
         const p = await form.customPropertiesSection.startAddProperty();
         await form.customPropertiesSection.commitPropertyAdd(p, PROP_NAME);
         await form.waitForDirty();
      });
      await diagramEditor.saveAndClose();

      // Delete
      const diagramEditorDelete = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyViewDelete = await diagramEditorDelete.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const formDelete = await propertyViewDelete.form();

      await diagramEditorDelete.waitForModelUpdate(async () => {
         await formDelete.customPropertiesSection.deleteProperty(PROP_NAME);
         await formDelete.waitForDirty();
      });

      const deletedProp = await formDelete.customPropertiesSection.findProperty(PROP_NAME);
      expect(deletedProp).toBeUndefined();

      await diagramEditorDelete.saveAndClose();

      const entityEditor = await app.openCompositeEditor(ENTITY_PATH, 'Code Editor');
      // Verify that the file does not contain the property ID
      expect(await entityEditor.numberOfLines()).toBe(3);
      expect(await entityEditor.textContentOfLineByLineNumber(1)).toMatch('entity:');
      expect(await entityEditor.textContentOfLineByLineNumber(2)).toMatch(`id: ${EMPTY_ENTITY_ID}`);
      expect(await entityEditor.textContentOfLineByLineNumber(3)).toMatch(`name: \"${EMPTY_ENTITY_ID}\"`);

      await entityEditor.closeWithoutSave();
   });
});