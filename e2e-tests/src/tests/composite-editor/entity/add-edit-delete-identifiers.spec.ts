/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { expect, test } from '@playwright/test';
import { CMApp } from '../../../page-objects/cm-app';

test.describe('Add/Edit/Delete identifiers of an entity using the composite editor', () => {
   let app: CMApp;
   const TEST_ENTITY_PATH = 'composite-editor/entities/AddEditDeleteIdentifiers.entity.cm';

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
   });

   test.afterAll(async () => {
      await app.page.close();
   });

   test('Add multiple identifiers to entity', async () => {
      const formEditor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Form Editor');
      const form = await formEditor.formFor('entity');
      const identifiersSection = form.identifiersSection;

      const id1 = await identifiersSection.startAddIdentifier();
      await identifiersSection.commitIdentifierAdd(id1, 'TestPrimaryKey', ['Id'], false);
      await formEditor.waitForDirty();

      const saved1 = await identifiersSection.findIdentifier('TestPrimaryKey');
      expect(saved1).toBeDefined();
      expect(await saved1?.getName()).toBe('TestPrimaryKey');

      const id2 = await identifiersSection.startAddIdentifier();
      await identifiersSection.commitIdentifierAdd(id2, 'AlternateKey', ['FirstName', 'LastName'], false);
      await formEditor.waitForDirty();

      const saved2 = await identifiersSection.findIdentifier('AlternateKey');
      expect(saved2).toBeDefined();
      expect(await saved2?.getName()).toBe('AlternateKey');
      expect(await saved2?.isPrimary()).toBe(false);

      const allIdentifiers = await identifiersSection.getAllIdentifiers();
      // The Customer entity initially has one identifier defined
      expect(allIdentifiers.length).toBe(3);

      // Switch to code editor to verify file contents.
      const entityCodeEditor = await formEditor.parent.switchToCodeEditor();

      expect(await entityCodeEditor.textContentOfLineByLineNumber(20)).toMatch('id: TestPrimaryKey');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(21)).toMatch('name: "TestPrimaryKey"');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(22)).toMatch('attributes:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(23)).toMatch('- Id');

      expect(await entityCodeEditor.textContentOfLineByLineNumber(24)).toMatch('id: AlternateKey');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(25)).toMatch('name: "AlternateKey"');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(26)).toMatch('attributes:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(27)).toMatch('- FirstName');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(28)).toMatch('- LastName');

      // Undo all changes made in this test.
      await formEditor.closeWithoutSave();
   });

   test('Modify existing identifier', async () => {
      const formEditor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Form Editor');
      const form = await formEditor.formFor('entity');

      const identifiersSection = form.identifiersSection;

      // The Primary_Identifier is already defined in the Customer entity, so let's change it.
      const identifier = await identifiersSection.getIdentifier('Primary Identifier');

      await identifier.setName('ModifiedTest');
      await identifier.setPrimary(false);
      await identifier.setAttributes(['FirstName', 'LastName']);
      await identifier.setDescription('Modified identifier description');
      await identifier.save();
      await formEditor.waitForDirty();

      const modified = await identifiersSection.findIdentifier('ModifiedTest');
      expect(modified).toBeDefined();
      expect(await modified?.getName()).toBe('ModifiedTest');
      expect(await modified?.isPrimary()).toBe(false);
      expect(await modified?.getDescription()).toBe('Modified identifier description');

      const attributes = await modified?.getAttributes();
      expect(attributes?.length).toBe(2);
      expect(attributes).toEqual(['FirstName', 'LastName']);

      // Switch to code editor to verify file contents.
      const entityCodeEditor = await formEditor.parent.switchToCodeEditor();

      expect(await entityCodeEditor.textContentOfLineByLineNumber(15)).toMatch('id: Primary_Identifier');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(16)).toMatch('name: "ModifiedTest"');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(17)).toMatch('description: "Modified identifier description"');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(18)).toMatch('attributes:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(19)).toMatch('- FirstName');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(20)).toMatch('- LastName');

      // Undo all changes made in this test.
      await formEditor.closeWithoutSave();
   });

   test('Remove identifier from entity', async () => {
      const formEditor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Form Editor');
      const form = await formEditor.formFor('entity');

      // The Primary_Identifier is already defined in the Customer entity, so let's remove it.
      const identifiersSection = form.identifiersSection;
      const primaryIdentifier = await identifiersSection.findIdentifier('Primary Identifier');
      expect(primaryIdentifier).toBeDefined();
      await primaryIdentifier?.delete();
      await formEditor.waitForDirty();

      const deleted = await identifiersSection.findIdentifier('Primary Identifier');
      expect(deleted).toBeUndefined();

      // Switch to code editor to verify file contents.
      const entityCodeEditor = await formEditor.parent.switchToCodeEditor();
      expect(await entityCodeEditor.numberOfLines()).toBe(13);

      // Undo all changes made in this test.
      expect(formEditor.isDirty()).toBeTruthy();
      await formEditor.closeWithoutSave();
   });

   test('Only one identifier can be primary - switch primary between identifiers', async () => {
      const formEditor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Form Editor');
      const form = await formEditor.formFor('entity');
      const identifiersSection = form.identifiersSection;

      const id1 = await identifiersSection.startAddIdentifier();
      await identifiersSection.commitIdentifierAdd(id1, 'FirstTestKey', ['FirstName'], false);
      await formEditor.waitForDirty();

      const firstKey = await identifiersSection.getIdentifier('FirstTestKey');
      expect(await firstKey.isPrimary()).toBe(false);

      const id2 = await identifiersSection.startAddIdentifier();
      await identifiersSection.commitIdentifierAdd(id2, 'SecondTestKey', ['LastName'], false);
      await formEditor.waitForDirty();

      const secondKey = await identifiersSection.getIdentifier('SecondTestKey');
      expect(await secondKey.isPrimary()).toBe(false);

      await firstKey.setPrimary(true);
      await firstKey.save();
      await formEditor.waitForDirty();

      expect(await (await identifiersSection.getIdentifier('FirstTestKey')).isPrimary()).toBe(true);

      await secondKey.setPrimary(true);
      await secondKey.save();
      await formEditor.waitForDirty();

      expect(await (await identifiersSection.getIdentifier('SecondTestKey')).isPrimary()).toBe(true);
      expect(await (await identifiersSection.getIdentifier('FirstTestKey')).isPrimary()).toBe(false);

      // Switch to code editor to verify file contents.
      const entityCodeEditor = await formEditor.parent.switchToCodeEditor();

      expect(await entityCodeEditor.textContentOfLineByLineNumber(15)).toMatch('id: Primary_Identifier');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(16)).toMatch('name: "Primary Identifier"');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(17)).toMatch('attributes:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(18)).toMatch('- Id');

      expect(await entityCodeEditor.textContentOfLineByLineNumber(19)).toMatch('id: FirstTestKey');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(20)).toMatch('name: "FirstTestKey"');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(21)).toMatch('attributes:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(22)).toMatch('- FirstName');

      expect(await entityCodeEditor.textContentOfLineByLineNumber(23)).toMatch('id: SecondTestKey');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(24)).toMatch('name: "SecondTestKey"');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(25)).toMatch('primary: true');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(26)).toMatch('attributes:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(27)).toMatch('- LastName');

      // Undo all changes made in this test.
      await formEditor.closeWithoutSave();
   });
});
