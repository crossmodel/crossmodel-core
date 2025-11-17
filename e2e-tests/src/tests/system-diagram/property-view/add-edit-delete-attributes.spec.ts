/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { expect } from '@eclipse-glsp/glsp-playwright';
import { test } from '@playwright/test';
import { CMApp } from '../../../page-objects/cm-app';

test.describe('Add/Edit/Delete attributes to/from an entity in a diagram', () => {
   let app: CMApp;
   const SYSTEM_DIAGRAM_PATH = 'system-diagram/diagrams/AddEditDeleteAttributesDiagram.system-diagram.cm';
   const ENTITY_PATH = 'system-diagram/entities/AddEditDeleteAttributesEntity.entity.cm';
   const EMPTY_ENTITY_ID = 'AddEditDeleteAttributesEntity';

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
   });
   test.afterAll(async () => {
      await app.page.close();
   });

   test('Add attribute via properties view', async () => {
      const ATTRIBUTE_NAME_TO_ADD = 'AttributeToAdd';
      // Open the system diagram, select the existing empty entity and add an attribute via the property widget.
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyView = await diagramEditor.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const form = await propertyView.form();
      const attributeInEdit = await form.attributesSection.startAddAttribute();
      const attribute = await form.attributesSection.commitAttributeAdd(attributeInEdit, ATTRIBUTE_NAME_TO_ADD);
      await form.waitForDirty();

      // Verify that the attribute is added to the properties view with correct properties
      const properties = await attribute.getProperties();
      expect(properties).toMatchObject({ name: ATTRIBUTE_NAME_TO_ADD });
      // Datatype is not present by default anymore
      expect(properties.datatype).toBeFalsy();
      expect(properties.description).toBeFalsy();
      await propertyView.saveAndClose();

      // Verify that the attribute is added to the diagram
      const entity = await diagramEditor.getLogicalEntity(EMPTY_ENTITY_ID);
      const attributeNodes = await entity.children.attributes();
      expect(attributeNodes).toHaveLength(1);
      const attributeNode = attributeNodes[0];
      // Datatype is not present by default anymore
      expect(await attributeNode.datatype()).toBeFalsy();
      expect(await attributeNode.name()).toEqual(ATTRIBUTE_NAME_TO_ADD);
      await diagramEditor.saveAndClose();

      // Verify that the attribute is added to the entity file
      const entityCodeEditor = await app.openCompositeEditor(ENTITY_PATH, 'Code Editor');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(1)).toMatch('entity:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(2)).toMatch(`id: ${EMPTY_ENTITY_ID}`);
      expect(await entityCodeEditor.textContentOfLineByLineNumber(3)).toMatch(`name: "${EMPTY_ENTITY_ID}"`);
      expect(await entityCodeEditor.textContentOfLineByLineNumber(4)).toMatch('attributes:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(5)).toMatch(`- id: ${ATTRIBUTE_NAME_TO_ADD}`);
      expect(await entityCodeEditor.textContentOfLineByLineNumber(6)).toMatch(`name: "${ATTRIBUTE_NAME_TO_ADD}"`);
      // Datatype is not present by default anymore

      await entityCodeEditor.saveAndClose();

      // Cleanup for next test
      const diagramEditorForCleanup = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyViewForCleanup = await diagramEditorForCleanup.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const formForCleanup = await propertyViewForCleanup.form();
      await diagramEditorForCleanup.waitForModelUpdate(async () => {
         await formForCleanup.attributesSection.deleteAttribute(ATTRIBUTE_NAME_TO_ADD);
         await formForCleanup.waitForDirty();
      });

      await diagramEditorForCleanup.saveAndClose();
   });

   test('Edit attribute via properties view', async () => {
      const ATTRIBUTE_NAME_TO_EDIT = 'AttributeToEdit';
      const RENAMED_ATTRIBUTE_LABEL = 'Renamed Attribute';
      // Add attribute first to ensure it exists for editing
      const diagramEditorForAdd = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyViewForAdd = await diagramEditorForAdd.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const formForAdd = await propertyViewForAdd.form();

      // Wait for model update while adding the attribute
      await diagramEditorForAdd.waitForModelUpdate(async () => {
         const attributeInEdit = await formForAdd.attributesSection.startAddAttribute();
         await formForAdd.attributesSection.commitAttributeAdd(attributeInEdit, ATTRIBUTE_NAME_TO_EDIT);
         await formForAdd.waitForDirty();

         // Verify the new attribute properties
         const newAttribute = await formForAdd.attributesSection.getAttribute(ATTRIBUTE_NAME_TO_EDIT);
         const newProperties = await newAttribute.getProperties();
         expect(newProperties).toMatchObject({ name: ATTRIBUTE_NAME_TO_EDIT });
      });
      await diagramEditorForAdd.saveAndClose();

      // Now, open the system diagram again to edit the attribute
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyView = await diagramEditor.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const form = await propertyView.form();

      // Wait for model to be ready before getting the attribute
      const attribute = await form.attributesSection.getAttribute(ATTRIBUTE_NAME_TO_EDIT);

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
      expect(await entityCodeEditor.textContentOfLineByLineNumber(5)).toMatch(`- id: ${ATTRIBUTE_NAME_TO_EDIT}`); // ID stays the same
      expect(await entityCodeEditor.textContentOfLineByLineNumber(6)).toMatch(`name: "${RENAMED_ATTRIBUTE_LABEL}"`); // Name updates
      expect(await entityCodeEditor.textContentOfLineByLineNumber(7)).toMatch('description: "New Description"');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(8)).toMatch('datatype: "Boolean"');

      // Verify identifier section
      expect(await entityCodeEditor.textContentOfLineByLineNumber(9)).toMatch('identifiers:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(10)).toMatch('- id: PrimaryIdentifier');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(11)).toMatch('name: "PrimaryIdentifier"');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(12)).toMatch('primary: true');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(13)).toMatch('attributes:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(14)).toMatch(`- ${ATTRIBUTE_NAME_TO_EDIT}`);
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
      const ATTRIBUTE_NAME_TO_EDIT = 'AttributeToEdit';
      // Open the system diagram, select the existing empty entity and edit its attribute
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyView = await diagramEditor.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const form = await propertyView.form();
      const attributeInEdit = await form.attributesSection.startAddAttribute();
      await form.attributesSection.commitAttributeAdd(attributeInEdit, ATTRIBUTE_NAME_TO_EDIT);
      await form.waitForDirty();

      // Open the entity file in Code Editor to verify changes
      const entityEditor = await app.openCompositeEditor(ENTITY_PATH, 'Code Editor');
      expect(await entityEditor.textContentOfLineByLineNumber(1)).toMatch('entity:');
      expect(await entityEditor.textContentOfLineByLineNumber(2)).toMatch(`id: ${EMPTY_ENTITY_ID}`);
      expect(await entityEditor.textContentOfLineByLineNumber(3)).toMatch(`name: "${EMPTY_ENTITY_ID}"`);
      expect(await entityEditor.textContentOfLineByLineNumber(4)).toMatch('attributes:');
      expect(await entityEditor.textContentOfLineByLineNumber(5)).toMatch(`- id: ${ATTRIBUTE_NAME_TO_EDIT}`);
      expect(await entityEditor.textContentOfLineByLineNumber(6)).toMatch(`name: "${ATTRIBUTE_NAME_TO_EDIT}"`);
      // Datatype is not set by default anymore
      await entityEditor.closeWithoutSave();

      // Close both editors without saving
      await diagramEditor.closeWithoutSave();
   });

   test('Delete the attribute via properties view', async () => {
      const ATTRIBUTE_NAME_TO_DELETE = 'AttributeToDelete';
      // Add an attribute first to ensure it exists for deletion
      const diagramEditorForAdd = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyViewForAdd = await diagramEditorForAdd.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const formForAdd = await propertyViewForAdd.form();
      const attributeInEdit = await formForAdd.attributesSection.startAddAttribute();
      await formForAdd.attributesSection.commitAttributeAdd(attributeInEdit, ATTRIBUTE_NAME_TO_DELETE);
      await formForAdd.waitForDirty();
      await diagramEditorForAdd.saveAndClose();

      // Now, open the system diagram again to delete the attribute
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyView = await diagramEditor.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const form = await propertyView.form();

      // First verify the attribute exists
      const attributeBefore = await form.attributesSection.findAttribute(ATTRIBUTE_NAME_TO_DELETE);
      expect(attributeBefore).toBeDefined();
      await diagramEditor.saveAndClose();

      // Delete the attribute and wait for model update
      const diagramEditorForDelete = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyViewForDelete = await diagramEditorForDelete.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const formForDelete = await propertyViewForDelete.form();
      await diagramEditorForDelete.waitForModelUpdate(async () => {
         await formForDelete.attributesSection.deleteAttribute(ATTRIBUTE_NAME_TO_DELETE);
         await formForDelete.waitForDirty();
      });

      // Verify the attribute is no longer found
      expect(await formForDelete.attributesSection.findAttribute(ATTRIBUTE_NAME_TO_DELETE)).toBeUndefined();

      // Save the property-view form.
      await propertyViewForDelete.save();
      await diagramEditorForDelete.saveAndClose();

      // Verify that the attribute node is deleted from the diagram
      const diagramEditorForCheck = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      await diagramEditorForCheck.waitForModelUpdate(async () => {
         const entity = await diagramEditorForCheck.getLogicalEntity(EMPTY_ENTITY_ID);
         const attributeNodes = await entity.children.attributes();
         expect(attributeNodes).toHaveLength(0);
      });
      await diagramEditorForCheck.close();

      // Verify that the attribute is deleted from the entity file
      const entityCodeEditor = await app.openCompositeEditor(ENTITY_PATH, 'Code Editor');
      expect(await entityCodeEditor.numberOfLines()).toBe(3);
      expect(await entityCodeEditor.textContentOfLineByLineNumber(1)).toMatch('entity:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(2)).toMatch(`id: ${EMPTY_ENTITY_ID}`);
      expect(await entityCodeEditor.textContentOfLineByLineNumber(3)).toMatch(`name: "${EMPTY_ENTITY_ID}"`);
      await entityCodeEditor.saveAndClose();
   });
});