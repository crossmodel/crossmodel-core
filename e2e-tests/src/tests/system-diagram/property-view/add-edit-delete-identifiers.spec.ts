/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { expect } from '@eclipse-glsp/glsp-playwright';
import { test } from '@playwright/test';
import { CMApp } from '../../../page-objects/cm-app';

test.describe('Add/Edit/Delete identifiers via properties view', () => {
   let app: CMApp;

   const SYSTEM_DIAGRAM_PATH = 'system-diagram/diagrams/AddEditDeleteIdentifiersDiagram.system-diagram.cm';
   const ENTITY_PATH = 'system-diagram/entities/AddEditDeleteIdentifiersEntity.entity.cm';
   const EMPTY_ENTITY_ID = 'AddEditDeleteIdentifiersEntity';

   const ATTRIBUTE_ONE = 'IdentifierAttrOne';
   const ATTRIBUTE_TWO = 'IdentifierAttrTwo';

   const PRIMARY_IDENTIFIER_NAME = 'PrimaryIdentifier';
   const SECONDARY_IDENTIFIER_NAME = 'SecondaryIdentifier';
   const RENAMED_IDENTIFIER_NAME = 'SecondaryIdentifierRenamed';

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
   });

   test.afterAll(async () => {
      await app.page.close();
   });

   test('Add identifiers via properties view', async () => {
      const { diagramEditor, propertyView, form } = await openEntityForm();

      await addAttribute(diagramEditor, form, ATTRIBUTE_ONE);
      await addAttribute(diagramEditor, form, ATTRIBUTE_TWO);

      await addIdentifier(diagramEditor, form, PRIMARY_IDENTIFIER_NAME, [ATTRIBUTE_ONE], true);

      const primaryIdentifier = await form.identifiersSection.getIdentifier(PRIMARY_IDENTIFIER_NAME);
      const attributeOne = await form.attributesSection.getAttribute(ATTRIBUTE_ONE);

      expect(await primaryIdentifier.isPrimary()).toBe(true);
      expect(await primaryIdentifier.getAttributes()).toEqual([ATTRIBUTE_ONE]);
      expect(await attributeOne.isIdentifier()).toBe(true);

      await propertyView.save();
      await diagramEditor.saveAndClose();

      const entityEditor = await app.openCompositeEditor(ENTITY_PATH, 'Code Editor');
      expect(await entityEditor.textContentOfLineByLineNumber(11)).toMatch('identifiers:');
      expect(await entityEditor.textContentOfLineByLineNumber(12)).toMatch(`id: ${PRIMARY_IDENTIFIER_NAME}`);
      expect(await entityEditor.textContentOfLineByLineNumber(13)).toMatch(`name: "${PRIMARY_IDENTIFIER_NAME}"`);
      expect(await entityEditor.textContentOfLineByLineNumber(14)).toMatch('primary: true');
      expect(await entityEditor.textContentOfLineByLineNumber(15)).toMatch('attributes:');
      expect(await entityEditor.textContentOfLineByLineNumber(16)).toMatch(`- ${ATTRIBUTE_ONE}`);
      entityEditor.closeWithoutSave();

      // Cleanup
      const diagramEditorForCleanup = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyViewForCleanup = await diagramEditorForCleanup.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const formForCleanup = await propertyViewForCleanup.form();
      await diagramEditorForCleanup.waitForModelUpdate(async () => {
         await formForCleanup.identifiersSection.deleteIdentifier(PRIMARY_IDENTIFIER_NAME);
         await formForCleanup.attributesSection.deleteAttribute(ATTRIBUTE_ONE);
         await formForCleanup.attributesSection.deleteAttribute(ATTRIBUTE_TWO);
         await formForCleanup.waitForDirty();
      });
      await propertyViewForCleanup.save();
      await diagramEditorForCleanup.saveAndClose();
   });

   test('Modify identifier attributes', async () => {
      const { diagramEditor, propertyView, form } = await openEntityForm();

      await addAttribute(diagramEditor, form, ATTRIBUTE_ONE);
      await addAttribute(diagramEditor, form, ATTRIBUTE_TWO);

      await addIdentifier(diagramEditor, form, PRIMARY_IDENTIFIER_NAME, [ATTRIBUTE_ONE], true);

      // Modify the identifier's attributes by adding ATTRIBUTE_TWO
      await diagramEditor.waitForModelUpdate(async () => {
         const modifyIdentifier = await form.identifiersSection.getIdentifier(PRIMARY_IDENTIFIER_NAME);
         await modifyIdentifier.setAttributes([ATTRIBUTE_ONE, ATTRIBUTE_TWO]);
         await modifyIdentifier.save();
         await form.waitForDirty();
      });

      const identifier = await form.identifiersSection.getIdentifier(PRIMARY_IDENTIFIER_NAME);
      const attrs = await identifier.getAttributes();
      expect(attrs).toEqual([ATTRIBUTE_ONE, ATTRIBUTE_TWO]);

      await propertyView.save();
      await diagramEditor.saveAndClose();

      const entityEditor = await app.openCompositeEditor(ENTITY_PATH, 'Code Editor');
      expect(await entityEditor.textContentOfLineByLineNumber(11)).toMatch('identifiers:');
      expect(await entityEditor.textContentOfLineByLineNumber(12)).toMatch(`id: ${PRIMARY_IDENTIFIER_NAME}`);
      expect(await entityEditor.textContentOfLineByLineNumber(13)).toMatch(`name: "${PRIMARY_IDENTIFIER_NAME}"`);
      expect(await entityEditor.textContentOfLineByLineNumber(14)).toMatch('primary: true');
      expect(await entityEditor.textContentOfLineByLineNumber(15)).toMatch('attributes:');
      expect(await entityEditor.textContentOfLineByLineNumber(16)).toMatch(`- ${ATTRIBUTE_ONE}`);
      expect(await entityEditor.textContentOfLineByLineNumber(17)).toMatch(`- ${ATTRIBUTE_TWO}`);
      entityEditor.closeWithoutSave();

      // Cleanup
      const diagramEditorForCleanup = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyViewForCleanup = await diagramEditorForCleanup.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const formForCleanup = await propertyViewForCleanup.form();
      await diagramEditorForCleanup.waitForModelUpdate(async () => {
         await formForCleanup.identifiersSection.deleteIdentifier(PRIMARY_IDENTIFIER_NAME);
         await formForCleanup.attributesSection.deleteAttribute(ATTRIBUTE_ONE);
         await formForCleanup.attributesSection.deleteAttribute(ATTRIBUTE_TWO);
         await formForCleanup.waitForDirty();
      });
      await propertyViewForCleanup.save();
      await diagramEditorForCleanup.saveAndClose();
   });

   test('Support multiple identifiers', async () => {
      const { diagramEditor, propertyView, form } = await openEntityForm();

      await addAttribute(diagramEditor, form, ATTRIBUTE_ONE);
      await addAttribute(diagramEditor, form, ATTRIBUTE_TWO);

      await addIdentifier(diagramEditor, form, PRIMARY_IDENTIFIER_NAME, [ATTRIBUTE_ONE], true);
      await addIdentifier(diagramEditor, form, SECONDARY_IDENTIFIER_NAME, [ATTRIBUTE_TWO], false);

      const allIdentifiers = await form.identifiersSection.getAllIdentifiers();
      expect(allIdentifiers).toHaveLength(2);
      expect(await allIdentifiers[0].getName()).toBe(PRIMARY_IDENTIFIER_NAME);
      expect(await allIdentifiers[1].getName()).toBe(SECONDARY_IDENTIFIER_NAME);

      await propertyView.save();
      await diagramEditor.saveAndClose();

      const entityEditor = await app.openCompositeEditor(ENTITY_PATH, 'Code Editor');
      expect(await entityEditor.textContentOfLineByLineNumber(11)).toMatch('identifiers:');
      expect(await entityEditor.textContentOfLineByLineNumber(12)).toMatch(`id: ${PRIMARY_IDENTIFIER_NAME}`);
      expect(await entityEditor.textContentOfLineByLineNumber(13)).toMatch(`name: "${PRIMARY_IDENTIFIER_NAME}"`);
      expect(await entityEditor.textContentOfLineByLineNumber(14)).toMatch('primary: true');
      expect(await entityEditor.textContentOfLineByLineNumber(15)).toMatch('attributes:');
      expect(await entityEditor.textContentOfLineByLineNumber(16)).toMatch(`- ${ATTRIBUTE_ONE}`);

      expect(await entityEditor.textContentOfLineByLineNumber(17)).toMatch(`id: ${SECONDARY_IDENTIFIER_NAME}`);
      expect(await entityEditor.textContentOfLineByLineNumber(18)).toMatch(`name: "${SECONDARY_IDENTIFIER_NAME}"`);
      expect(await entityEditor.textContentOfLineByLineNumber(19)).toMatch('attributes:');
      expect(await entityEditor.textContentOfLineByLineNumber(20)).toMatch(`- ${ATTRIBUTE_TWO}`);

      entityEditor.closeWithoutSave();

      // Cleanup
      const diagramEditorForCleanup = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyViewForCleanup = await diagramEditorForCleanup.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const formForCleanup = await propertyViewForCleanup.form();
      await diagramEditorForCleanup.waitForModelUpdate(async () => {
         await formForCleanup.identifiersSection.deleteIdentifier(PRIMARY_IDENTIFIER_NAME);
         await formForCleanup.identifiersSection.deleteIdentifier(SECONDARY_IDENTIFIER_NAME);
         await formForCleanup.attributesSection.deleteAttribute(ATTRIBUTE_ONE);
         await formForCleanup.attributesSection.deleteAttribute(ATTRIBUTE_TWO);
         await formForCleanup.waitForDirty();
      });
      await propertyViewForCleanup.save();
      await diagramEditorForCleanup.saveAndClose();
   });

   test('Enforce single primary identifier', async () => {
      const { diagramEditor, propertyView, form } = await openEntityForm();

      await addAttribute(diagramEditor, form, ATTRIBUTE_ONE);
      await addAttribute(diagramEditor, form, ATTRIBUTE_TWO);

      await addIdentifier(diagramEditor, form, PRIMARY_IDENTIFIER_NAME, [ATTRIBUTE_ONE], true);
      await addIdentifier(diagramEditor, form, SECONDARY_IDENTIFIER_NAME, [ATTRIBUTE_TWO], false);

      // Add new primary identifier - should demote the existing primary
      await addIdentifier(diagramEditor, form, RENAMED_IDENTIFIER_NAME, [ATTRIBUTE_ONE, ATTRIBUTE_TWO], true);

      const promotedIdentifier = await form.identifiersSection.getIdentifier(RENAMED_IDENTIFIER_NAME);
      const demotedIdentifier = await form.identifiersSection.getIdentifier(PRIMARY_IDENTIFIER_NAME);

      expect(await promotedIdentifier.isPrimary()).toBe(true);
      expect(await demotedIdentifier.isPrimary()).toBe(false);

      await propertyView.save();
      await diagramEditor.saveAndClose();

      const entityEditor = await app.openCompositeEditor(ENTITY_PATH, 'Code Editor');
      expect(await entityEditor.textContentOfLineByLineNumber(11)).toMatch('identifiers:');
      expect(await entityEditor.textContentOfLineByLineNumber(12)).toMatch(`id: ${PRIMARY_IDENTIFIER_NAME}`);
      expect(await entityEditor.textContentOfLineByLineNumber(13)).toMatch(`name: "${PRIMARY_IDENTIFIER_NAME}"`);
      expect(await entityEditor.textContentOfLineByLineNumber(14)).toMatch('attributes:');
      expect(await entityEditor.textContentOfLineByLineNumber(15)).toMatch(`- ${ATTRIBUTE_ONE}`);

      expect(await entityEditor.textContentOfLineByLineNumber(16)).toMatch(`id: ${SECONDARY_IDENTIFIER_NAME}`);
      expect(await entityEditor.textContentOfLineByLineNumber(17)).toMatch(`name: "${SECONDARY_IDENTIFIER_NAME}"`);
      expect(await entityEditor.textContentOfLineByLineNumber(18)).toMatch('attributes:');
      expect(await entityEditor.textContentOfLineByLineNumber(19)).toMatch(`- ${ATTRIBUTE_TWO}`);

      expect(await entityEditor.textContentOfLineByLineNumber(20)).toMatch(`id: ${RENAMED_IDENTIFIER_NAME}`);
      expect(await entityEditor.textContentOfLineByLineNumber(21)).toMatch(`name: "${RENAMED_IDENTIFIER_NAME}"`);
      expect(await entityEditor.textContentOfLineByLineNumber(22)).toMatch('primary: true');
      expect(await entityEditor.textContentOfLineByLineNumber(23)).toMatch('attributes:');
      expect(await entityEditor.textContentOfLineByLineNumber(24)).toMatch(`- ${ATTRIBUTE_ONE}`);
      expect(await entityEditor.textContentOfLineByLineNumber(25)).toMatch(`- ${ATTRIBUTE_TWO}`);

      entityEditor.closeWithoutSave();

      // Cleanup
      const diagramEditorForCleanup = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyViewForCleanup = await diagramEditorForCleanup.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const formForCleanup = await propertyViewForCleanup.form();
      await diagramEditorForCleanup.waitForModelUpdate(async () => {
         await formForCleanup.identifiersSection.deleteIdentifier(RENAMED_IDENTIFIER_NAME);
         await formForCleanup.identifiersSection.deleteIdentifier(PRIMARY_IDENTIFIER_NAME);
         await formForCleanup.identifiersSection.deleteIdentifier(SECONDARY_IDENTIFIER_NAME);
         await formForCleanup.attributesSection.deleteAttribute(ATTRIBUTE_ONE);
         await formForCleanup.attributesSection.deleteAttribute(ATTRIBUTE_TWO);
         await formForCleanup.waitForDirty();
      });
      await propertyViewForCleanup.save();
      await diagramEditorForCleanup.saveAndClose();
   });

   test('Remove identifiers via properties view', async () => {
      const { diagramEditor, propertyView, form } = await openEntityForm();

      await addAttribute(diagramEditor, form, ATTRIBUTE_ONE);
      await addAttribute(diagramEditor, form, ATTRIBUTE_TWO);

      await addIdentifier(diagramEditor, form, PRIMARY_IDENTIFIER_NAME, [ATTRIBUTE_ONE], true);
      await addIdentifier(diagramEditor, form, SECONDARY_IDENTIFIER_NAME, [ATTRIBUTE_TWO], false);

      await diagramEditor.waitForModelUpdate(async () => {
         await form.identifiersSection.deleteIdentifier(PRIMARY_IDENTIFIER_NAME);
         await form.waitForDirty();
      });

      const identifiers = await form.identifiersSection.getAllIdentifiers();
      expect(identifiers).toHaveLength(1);
      expect(await identifiers[0].getName()).toBe(SECONDARY_IDENTIFIER_NAME);
      expect(await identifiers[0].isPrimary()).toBe(false);

      const attributeOne = await form.attributesSection.getAttribute(ATTRIBUTE_ONE);
      expect(await attributeOne.isIdentifier()).toBe(false);

      await propertyView.save();
      await diagramEditor.saveAndClose();

      const entityEditor = await app.openCompositeEditor(ENTITY_PATH, 'Code Editor');
      expect(await entityEditor.textContentOfLineByLineNumber(11)).toMatch('identifiers:');
      expect(await entityEditor.textContentOfLineByLineNumber(12)).toMatch(`id: ${SECONDARY_IDENTIFIER_NAME}`);
      expect(await entityEditor.textContentOfLineByLineNumber(13)).toMatch(`name: "${SECONDARY_IDENTIFIER_NAME}"`);
      expect(await entityEditor.textContentOfLineByLineNumber(14)).toMatch('attributes:');
      expect(await entityEditor.textContentOfLineByLineNumber(15)).toMatch(`- ${ATTRIBUTE_TWO}`);
      entityEditor.closeWithoutSave();

      // Cleanup
      const diagramEditorForCleanup = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyViewForCleanup = await diagramEditorForCleanup.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const formForCleanup = await propertyViewForCleanup.form();
      await diagramEditorForCleanup.waitForModelUpdate(async () => {
         await formForCleanup.identifiersSection.deleteIdentifier(SECONDARY_IDENTIFIER_NAME);
         await formForCleanup.attributesSection.deleteAttribute(ATTRIBUTE_ONE);
         await formForCleanup.attributesSection.deleteAttribute(ATTRIBUTE_TWO);
         await formForCleanup.waitForDirty();
      });
      await propertyViewForCleanup.save();
      await diagramEditorForCleanup.saveAndClose();
   });

   async function openEntityForm(): Promise<{ diagramEditor: any; propertyView: any; form: any }> {
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const propertyView = await diagramEditor.selectLogicalEntityAndOpenProperties(EMPTY_ENTITY_ID);
      const form = await propertyView.form();
      return { diagramEditor, propertyView, form };
   }

   async function addAttribute(diagramEditor: any, form: any, name: string): Promise<void> {
      await diagramEditor.waitForModelUpdate(async () => {
         const attributeInEdit = await form.attributesSection.startAddAttribute();
         await form.attributesSection.commitAttributeAdd(attributeInEdit, name);
         await form.waitForDirty();
      });
   }

   async function addIdentifier(diagramEditor: any, form: any, name: string, attributeNames: string[], primary = false): Promise<void> {
      await diagramEditor.waitForModelUpdate(async () => {
         const identifierInEdit = await form.identifiersSection.startAddIdentifier();
         await form.identifiersSection.commitIdentifierAdd(identifierInEdit, name, attributeNames, primary);
         await form.waitForDirty();
      });
   }
});
