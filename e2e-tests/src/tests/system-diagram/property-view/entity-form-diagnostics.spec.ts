/********************************************************************************
 * Copyright (c) 2026 CrossModel.
 ********************************************************************************/
import { expect } from '@eclipse-glsp/glsp-playwright';
import { test } from '@playwright/test';
import { CMApp } from '../../../page-objects/cm-app';
import { LogicalEntityForm } from '../../../page-objects/form/entity-form';
import { IntegratedSystemDiagramEditor } from '../../../page-objects/system-diagram/integrated-system-diagram-editor';

test.describe('Entity Form Diagnostics', () => {
   let app: CMApp;
   let diagramEditor: IntegratedSystemDiagramEditor;
   let form: LogicalEntityForm;

   const SYSTEM_DIAGRAM_PATH = 'system-diagram/diagrams/AddEditDeleteAttributesDiagram.diagram.cm';
   const EMPTY_ENTITY_ID = 'AddEditDeleteAttributesEntity';

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
   });

   test.beforeEach(async () => {
      diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'Diagram');
      const propertyView = await diagramEditor.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      form = await propertyView.form();
   });

   test.afterEach(async () => {
      if (diagramEditor) {
         await diagramEditor.saveAndClose();
      }
   });

   test.afterAll(async () => {
      await app.page.close();
   });

   test('Should show error when creating attribute without name', async () => {
      // Start adding attribute
      const attributeInEdit = await form.attributesSection.startAddAttribute();
      
      // Select datatype 'Text'
      const dataTypeCell = attributeInEdit.locator.locator('td:not(.p-selection-column):not(.p-reorder-column)').nth(1);
      await dataTypeCell.locator('.p-autocomplete-dropdown').click();
      const autocompletePanel = app.page.locator('.p-autocomplete-panel').first();
      await autocompletePanel.waitFor({ state: 'visible' });
      await autocompletePanel.getByRole('option', { name: 'Text' }).click();
      await autocompletePanel.waitFor({ state: 'hidden' });

      // Click save button
      const saveButton = attributeInEdit.locator.locator('button.p-row-editor-save');
      await saveButton.first().click();

      // Verify validation error
      const invalidElement = form.attributesSection.locator.locator('.p-invalid');
      await expect(invalidElement.first()).toBeVisible({ timeout: 15000 });
      
      const cancelButton = attributeInEdit.locator.locator('button.p-row-editor-cancel');
      if (await cancelButton.isVisible()) {
         await cancelButton.click();
      }
   });

   test('Should show error when creating identifier without attributes', async () => {
      // Start adding identifier
      const identifierInEdit = await form.identifiersSection.startAddIdentifier();

      // Set name but no attributes 
      await identifierInEdit.setName('InvalidIdentifier');

      await identifierInEdit.save().catch(() => {});

      // Verify validation error on the identifiers section
      const invalidElement = form.identifiersSection.locator.locator('.p-invalid');
      await expect(invalidElement.first()).toBeVisible({ timeout: 15000 });

      // Cancel edit if still in edit mode
      const cancelButton = identifierInEdit.locator.locator('button.p-row-editor-cancel');
      if (await cancelButton.isVisible()) {
         await cancelButton.click();
      }
   });

});