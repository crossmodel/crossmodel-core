/********************************************************************************
 * Copyright (c) 2026 CrossBreeze.
 ********************************************************************************/
import { expect } from '@eclipse-glsp/glsp-playwright';
import { test } from '@playwright/test';
import { CMApp } from '../../../page-objects/cm-app';

test.describe('Empty autocomplete fields', () => {
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

   test('Verify autocomplete component accepts empty string to unset values', async () => {
      const ATTRIBUTE_NAME = 'AttributeForEmptyTest';

      // Open the system diagram
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyView = await diagramEditor.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const form = await propertyView.form();

      // Add an attribute
      const attributeInEdit = await form.attributesSection.startAddAttribute();
      await form.attributesSection.commitAttributeAdd(attributeInEdit, ATTRIBUTE_NAME);
      await form.waitForDirty();

      const attribute = await form.attributesSection.getAttribute(ATTRIBUTE_NAME);

      // Set a datatype
      await diagramEditor.waitForModelUpdate(async () => {
         await attribute.setDatatype('Text');
         await form.waitForDirty();
      });

      expect(await attribute.getDatatype()).toBe('Text');

      // Clear the datatype
      await diagramEditor.waitForModelUpdate(async () => {
         const actionsLocator = attribute.locator.locator('td').last();
         await actionsLocator.locator('button:has(.pi-pencil)').click();

         const dataTypeCell = attribute.locator.locator('td:not(.p-selection-column):not(.p-reorder-column)').nth(1);
         const autocompleteInput = dataTypeCell.locator('.p-autocomplete-input');
         await autocompleteInput.waitFor({ state: 'visible' });

         await autocompleteInput.click();
         await autocompleteInput.press('Control+A');
         await autocompleteInput.press('Backspace');

         const saveButton = actionsLocator.locator('button.p-row-editor-save');
         await saveButton.first().waitFor({ state: 'visible', timeout: 500 });
         await saveButton.first().click();

         await form.waitForDirty();
      });

      // Verify datatype is empty in UI
      const datatype = await attribute.getDatatype();
      expect(datatype?.trim()).toBe('');

      await diagramEditor.saveAndClose();

      // Verify that the datatype is removed from the entity file
      const entityCodeEditor = await app.openCompositeEditor(ENTITY_PATH, 'Code Editor');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(1)).toMatch('entity:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(2)).toMatch(`id: ${EMPTY_ENTITY_ID}`);
      expect(await entityCodeEditor.textContentOfLineByLineNumber(3)).toMatch(`name: "${EMPTY_ENTITY_ID}"`);
      expect(await entityCodeEditor.textContentOfLineByLineNumber(4)).toMatch('attributes:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(5)).toMatch(`- id: ${ATTRIBUTE_NAME}`);
      expect(await entityCodeEditor.textContentOfLineByLineNumber(6)).toMatch(`name: "${ATTRIBUTE_NAME}"`);

      await entityCodeEditor.saveAndClose();

      // Cleanup
      const diagramEditorForCleanup = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyViewForCleanup = await diagramEditorForCleanup.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const formForCleanup = await propertyViewForCleanup.form();
      await diagramEditorForCleanup.waitForModelUpdate(async () => {
         await formForCleanup.attributesSection.deleteAttribute(ATTRIBUTE_NAME);
         await formForCleanup.waitForDirty();
      });
      await diagramEditorForCleanup.saveAndClose();
   });
});