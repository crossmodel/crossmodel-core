/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { expect } from '@eclipse-glsp/glsp-playwright';
import { test } from '@playwright/test';
import { CMApp } from '../../../page-objects/cm-app';

test.describe('Add/Edit/Delete attributes to/from an entity in a diagram', () => {
   let app: CMApp;
   const SYSTEM_DIAGRAM_PATH = 'ExampleCRM/diagrams/EMPTY.system-diagram.cm';
   const ENTITY_PATH = 'ExampleCRM/entities/EmptyEntity.entity.cm';
   const EMPTY_ENTITY_ID = 'EmptyEntity';
   const ATTRIBUTE_NAME = 'MyTestAttribute';
   const RENAMED_ATTRIBUTE_LABEL = 'Renamed Attribute';

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
   });
   test.afterAll(async () => {
      await app.page.close();
   });

   test('Add attribute via properties view', async () => {
      // Open the system diagram, select the existing empty entity and add an attribute via the property widget.
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyView = await diagramEditor.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const form = await propertyView.form();
      const attributeInEdit = await form.attributesSection.startAddAttribute();
      const attribute = await form.attributesSection.commitAttributeAdd(attributeInEdit, ATTRIBUTE_NAME);
      await form.waitForDirty();

      // Verify that the attribute is added to the properties view with correct properties
      const properties = await attribute.getProperties();
      expect(properties).toMatchObject({ name: ATTRIBUTE_NAME, datatype: 'Text' });
      expect(properties.description).toBeFalsy();
      await propertyView.saveAndClose();

      // Verify that the attribute is added to the diagram
      const entity = await diagramEditor.getLogicalEntity(EMPTY_ENTITY_ID);
      const attributeNodes = await entity.children.attributes();
      expect(attributeNodes).toHaveLength(1);
      const attributeNode = attributeNodes[0];
      expect(await attributeNode.datatype()).toEqual('Text');
      expect(await attributeNode.name()).toEqual(ATTRIBUTE_NAME);
      await diagramEditor.saveAndClose();

      // Verify that the attribute is added to the entity file
      const entityCodeEditor = await app.openCompositeEditor(ENTITY_PATH, 'Code Editor');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(1)).toMatch('entity:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(2)).toMatch(`id: ${EMPTY_ENTITY_ID}`);
      expect(await entityCodeEditor.textContentOfLineByLineNumber(3)).toMatch(`name: "${EMPTY_ENTITY_ID}"`);
      expect(await entityCodeEditor.textContentOfLineByLineNumber(4)).toMatch('attributes:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(5)).toMatch('- id: MyTestAttribute');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(6)).toMatch('name: "MyTestAttribute"');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(7)).toMatch('datatype: "Text"');

      await entityCodeEditor.saveAndClose();

      // Cleanup for next test
      const diagramEditorForCleanup = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyViewForCleanup = await diagramEditorForCleanup.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const formForCleanup = await propertyViewForCleanup.form();
      await diagramEditorForCleanup.waitForModelUpdate(async () => {
         await formForCleanup.attributesSection.deleteAttribute('MyTestAttribute');
         await formForCleanup.waitForDirty();
      });

      await diagramEditorForCleanup.saveAndClose();
   });

   test('Edit attribute via properties view', async () => {
      // Add attribute first to ensure it exists for editing
      const diagramEditorForAdd = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyViewForAdd = await diagramEditorForAdd.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const formForAdd = await propertyViewForAdd.form();

      // Wait for model update while adding the attribute
      await diagramEditorForAdd.waitForModelUpdate(async () => {
         const attributeInEdit = await formForAdd.attributesSection.startAddAttribute();
         await formForAdd.attributesSection.commitAttributeAdd(attributeInEdit, 'MyTestAttribute');
         await formForAdd.waitForDirty();

         // Verify the new attribute properties
         const newAttribute = await formForAdd.attributesSection.getAttribute('MyTestAttribute');
         const newProperties = await newAttribute.getProperties();
         expect(newProperties).toMatchObject({ name: 'MyTestAttribute' });
      });
      await diagramEditorForAdd.saveAndClose();

      // Now, open the system diagram again to edit the attribute
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyView = await diagramEditor.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const form = await propertyView.form();

      // Wait for model to be ready before getting the attribute
      const attribute = await form.attributesSection.getAttribute('MyTestAttribute');

      // Wait for all attribute updates to complete and verify
      await diagramEditor.waitForModelUpdate(async () => {
         await attribute.setName(RENAMED_ATTRIBUTE_LABEL);
         await attribute.setDatatype('Boolean');
         await attribute.setDescription('New Description');
         await form.waitForDirty();

         // Verify the changes took effect with clean properties
         const properties = await attribute.getProperties();
         expect(properties).toMatchObject({
            name: RENAMED_ATTRIBUTE_LABEL,
            datatype: 'Boolean',
            description: 'New Description'
         });
      });

      // Add identifier first, then verify it's set correctly
      await diagramEditor.waitForModelUpdate(async () => {
         const identifierInEdit = await form.identifiersSection.startAddIdentifier();
         await form.identifiersSection.commitIdentifierAdd(identifierInEdit, 'PrimaryIdentifier', [RENAMED_ATTRIBUTE_LABEL], true);
         await form.waitForDirty();

         // Verify the attribute properties after adding to identifier
         const addedIdentifier = await form.identifiersSection.findIdentifier('PrimaryIdentifier');
         expect(addedIdentifier).toBeDefined();
         expect(await addedIdentifier?.getName()).toBe('PrimaryIdentifier');
         expect(await addedIdentifier?.isPrimary()).toBe(true);
         expect(await addedIdentifier?.getAttributes()).toEqual([RENAMED_ATTRIBUTE_LABEL]);
      });

      await diagramEditorForAdd.saveAndClose();

      // Verify that the attribute is changed in the entity file
      const entityCodeEditor = await app.openCompositeEditor(ENTITY_PATH, 'Code Editor');

      // Verify attribute properties are correct
      expect(await entityCodeEditor.textContentOfLineByLineNumber(4)).toMatch('attributes:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(5)).toMatch('- id: MyTestAttribute'); // ID stays the same
      expect(await entityCodeEditor.textContentOfLineByLineNumber(6)).toMatch(`name: "${RENAMED_ATTRIBUTE_LABEL}"`); // Name updates
      expect(await entityCodeEditor.textContentOfLineByLineNumber(7)).toMatch('description: "New Description"');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(8)).toMatch('datatype: "Boolean"');

      // Verify identifier section
      expect(await entityCodeEditor.textContentOfLineByLineNumber(9)).toMatch('identifiers:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(10)).toMatch('- id: PrimaryIdentifier');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(11)).toMatch('name: "PrimaryIdentifier"');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(12)).toMatch('primary: true');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(13)).toMatch('attributes:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(14)).toMatch('- MyTestAttribute');
      await entityCodeEditor.saveAndClose();

      // Cleanup for next test
      const diagramEditorForCleanup = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyViewForCleanup = await diagramEditorForCleanup.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const formForCleanup = await propertyViewForCleanup.form();
      await diagramEditorForCleanup.waitForModelUpdate(async () => {
         await formForCleanup.attributesSection.deleteAttribute(RENAMED_ATTRIBUTE_LABEL);
         await formForCleanup.identifiersSection.deleteIdentifier('PrimaryIdentifier');
         await formForCleanup.waitForDirty();
      });
      await diagramEditorForCleanup.saveAndClose();
   });

   test('Edit attribute and verify changes in code editor before saving', async () => {
      // Open the system diagram, select the existing empty entity and edit its attribute
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyView = await diagramEditor.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const form = await propertyView.form();
      const attributeInEdit = await form.attributesSection.startAddAttribute();
      await form.attributesSection.commitAttributeAdd(attributeInEdit, ATTRIBUTE_NAME);
      await form.waitForDirty();

      // Open the entity file in Code Editor to verify changes
      const entityEditor = await app.openCompositeEditor(ENTITY_PATH, 'Code Editor');
      expect(await entityEditor.textContentOfLineByLineNumber(1)).toMatch('entity:');
      expect(await entityEditor.textContentOfLineByLineNumber(2)).toMatch(`id: ${EMPTY_ENTITY_ID}`);
      expect(await entityEditor.textContentOfLineByLineNumber(3)).toMatch(`name: "${EMPTY_ENTITY_ID}"`);
      expect(await entityEditor.textContentOfLineByLineNumber(4)).toMatch('attributes:');
      expect(await entityEditor.textContentOfLineByLineNumber(5)).toMatch('- id: MyTestAttribute');
      expect(await entityEditor.textContentOfLineByLineNumber(6)).toMatch('name: "MyTestAttribute"');
      expect(await entityEditor.textContentOfLineByLineNumber(7)).toMatch('datatype: "Text"');

      // Close both editors without saving
      await diagramEditor.closeWithoutSave();
      await entityEditor.closeWithoutSave();
   });

   test('Delete the attribute via properties view', async () => {
      // Add an attribute first to ensure it exists for deletion
      const diagramEditorForAdd = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyViewForAdd = await diagramEditorForAdd.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const formForAdd = await propertyViewForAdd.form();
      const attributeInEdit = await formForAdd.attributesSection.startAddAttribute();
      await formForAdd.attributesSection.commitAttributeAdd(attributeInEdit, ATTRIBUTE_NAME);
      await formForAdd.waitForDirty();
      await diagramEditorForAdd.saveAndClose();

      // Now, open the system diagram again to delete the attribute
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyView = await diagramEditor.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const form = await propertyView.form();

      // First verify the attribute exists
      const attributeBefore = await form.attributesSection.findAttribute(ATTRIBUTE_NAME);
      expect(attributeBefore).toBeDefined();

      // Delete the attribute and wait for model update
      await diagramEditor.waitForModelUpdate(async () => {
         await form.attributesSection.deleteAttribute(ATTRIBUTE_NAME);
         await form.waitForDirty();

         // Verify the attribute is no longer found
         expect(await form.attributesSection.findAttribute(ATTRIBUTE_NAME)).toBeUndefined();
      });
      // Save the diagram, but leave it open.
      await diagramEditor.save();

      // Verify that the attribute is deleted from the entity file
      const entityCodeEditor = await app.openCompositeEditor(ENTITY_PATH, 'Code Editor');
      expect(await entityCodeEditor.numberOfLines()).toBe(3);
      expect(await entityCodeEditor.textContentOfLineByLineNumber(1)).toMatch('entity:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(2)).toMatch(`id: ${EMPTY_ENTITY_ID}`);
      expect(await entityCodeEditor.textContentOfLineByLineNumber(3)).toMatch(`name: "${EMPTY_ENTITY_ID}"`);
      await entityCodeEditor.saveAndClose();

      // Verify that the attribute node is deleted from the diagram
      await diagramEditor.activate();
      const entity = await diagramEditor.getLogicalEntity(EMPTY_ENTITY_ID);
      const attributeNodes = await entity.children.attributes();
      expect(attributeNodes).toHaveLength(0);
      await diagramEditor.saveAndClose();
   });
});
