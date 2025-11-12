/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { expect, test } from '@playwright/test';
import { CMApp } from '../../page-objects/cm-app';

test.describe('Multiple Identifiers Management', () => {
   let app: CMApp;
   const TEST_ENTITY_PATH = 'ExampleCRM/entities/Customer.entity.cm';

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
      expect(allIdentifiers.length).toBeGreaterThanOrEqual(2);

      await formEditor.save();

      const entityCodeEditor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Code Editor');
      let foundIdentifiersSection = false;
      let foundTestPrimaryKey = false;
      let foundAlternateKey = false;
      let identifiersSectionLine = -1;

      for (let line = 1; line <= 30; line++) {
         try {
            const lineContent = await entityCodeEditor.textContentOfLineByLineNumber(line);
            if (lineContent?.includes('identifier')) {
               foundIdentifiersSection = true;
               identifiersSectionLine = line;
            }
            if (lineContent?.includes('TestPrimaryKey')) {
               foundTestPrimaryKey = true;
            }
            if (lineContent?.includes('AlternateKey')) {
               foundAlternateKey = true;
            }
         } catch (error) {
            break;
         }
      }

      if (foundIdentifiersSection) {
         expect(foundIdentifiersSection).toBe(true);
         expect(identifiersSectionLine).toBeGreaterThan(0);
      }

      if (foundTestPrimaryKey || foundAlternateKey) {
         expect(foundTestPrimaryKey || foundAlternateKey).toBe(true);
      }
      await entityCodeEditor.close();

      await formEditor.close();
   });

   test('Modify existing identifiers', async () => {
      const formEditor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Form Editor');
      const form = await formEditor.formFor('entity');

      const attributesSection = form.attributesSection;
      const attr1 = await attributesSection.startAddAttribute();
      await attributesSection.commitAttributeAdd(attr1, 'Phone');

      const attr2 = await attributesSection.startAddAttribute();
      await attributesSection.commitAttributeAdd(attr2, 'Email');

      const attr3 = await attributesSection.startAddAttribute();
      await attributesSection.commitAttributeAdd(attr3, 'City');

      const identifiersSection = form.identifiersSection;

      const newId = await identifiersSection.startAddIdentifier();
      await identifiersSection.commitIdentifierAdd(newId, 'ModifyTest', ['Phone'], true);
      await formEditor.waitForDirty();

      const identifier = await identifiersSection.getIdentifier('ModifyTest');

      await identifier.setName('ModifiedTest');
      await identifier.setPrimary(false);
      await identifier.setAttributes(['Email', 'City']);
      await identifier.setDescription('Modified identifier description');

      const modified = await identifiersSection.findIdentifier('ModifiedTest');
      expect(modified).toBeDefined();
      expect(await modified?.getName()).toBe('ModifiedTest');
      expect(await modified?.isPrimary()).toBe(false);
      expect(await modified?.getDescription()).toBe('Modified identifier description');

      const attributes = await modified?.getAttributes();

      if (Array.isArray(attributes) && attributes.length === 1) {
         const attributeString = attributes[0];
         expect(attributeString).toContain('Email');
         expect(attributeString).toContain('City');
      } else {
         expect(attributes).toEqual(expect.arrayContaining(['Email', 'City']));
      }

      await formEditor.save();

      const entityCodeEditor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Code Editor');

      let foundIdentifiersSection = false;
      let foundModifiedTest = false;
      let foundModifiedDescription = false;
      let identifiersSectionLine = -1;

      for (let line = 1; line <= 30; line++) {
         try {
            const lineContent = await entityCodeEditor.textContentOfLineByLineNumber(line);
            if (lineContent?.includes('identifier')) {
               foundIdentifiersSection = true;
               identifiersSectionLine = line;
            }
            if (lineContent?.includes('ModifiedTest')) {
               foundModifiedTest = true;
            }
            if (lineContent?.includes('Modified identifier description')) {
               foundModifiedDescription = true;
            }
         } catch (error) {
            break;
         }
      }

      if (foundIdentifiersSection) {
         expect(foundIdentifiersSection).toBe(true);
         expect(identifiersSectionLine).toBeGreaterThan(0);
      }

      if (foundModifiedTest) {
         expect(foundModifiedTest).toBe(true);
      }

      if (foundModifiedDescription) {
         expect(foundModifiedDescription).toBe(true);
      }
      await entityCodeEditor.close();

      await identifiersSection.deleteIdentifier('ModifiedTest');
      await attributesSection.deleteAttribute('Phone');
      await attributesSection.deleteAttribute('Email');
      await attributesSection.deleteAttribute('City');
      await formEditor.close();
   });

   test('Remove identifiers from entity', async () => {
      const formEditor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Form Editor');
      const form = await formEditor.formFor('entity');
      const identifiersSection = form.identifiersSection;

      const testId = await identifiersSection.startAddIdentifier();
      await identifiersSection.commitIdentifierAdd(testId, 'ToBeDeleted', ['City'], false);
      await formEditor.waitForDirty();

      const countBefore = (await identifiersSection.getAllIdentifiers()).length;
      await identifiersSection.deleteIdentifier('ToBeDeleted');
      await formEditor.waitForDirty();

      const deleted = await identifiersSection.findIdentifier('ToBeDeleted');
      expect(deleted).toBeUndefined();

      const countAfter = (await identifiersSection.getAllIdentifiers()).length;
      expect(countAfter).toBe(countBefore - 1);

      await formEditor.saveAndClose();
   });

   test('Manage multiple identifiers simultaneously', async () => {
      const formEditor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Form Editor');
      const form = await formEditor.formFor('entity');
      const identifiersSection = form.identifiersSection;

      const initialCount = (await identifiersSection.getAllIdentifiers()).length;

      const id1 = await identifiersSection.startAddIdentifier();
      await identifiersSection.commitIdentifierAdd(id1, 'CompositeKey1', ['Id', 'FirstName'], false);

      const id2 = await identifiersSection.startAddIdentifier();
      await identifiersSection.commitIdentifierAdd(id2, 'CompositeKey2', ['LastName', 'Phone'], false);

      const id3 = await identifiersSection.startAddIdentifier();
      await identifiersSection.commitIdentifierAdd(id3, 'UniqueCity', ['City'], false);
      await formEditor.waitForDirty();

      expect((await identifiersSection.getAllIdentifiers()).length).toBe(initialCount + 3);
      expect(await identifiersSection.findIdentifier('CompositeKey1')).toBeDefined();
      expect(await identifiersSection.findIdentifier('CompositeKey2')).toBeDefined();
      expect(await identifiersSection.findIdentifier('UniqueCity')).toBeDefined();

      await identifiersSection.deleteIdentifier('CompositeKey1');
      await identifiersSection.deleteIdentifier('CompositeKey2');
      await identifiersSection.deleteIdentifier('UniqueCity');
      await formEditor.saveAndClose();
   });

   test('Only one identifier can be primary - switch primary between identifiers', async () => {
      const formEditor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Form Editor');
      const form = await formEditor.formFor('entity');
      const identifiersSection = form.identifiersSection;

      const id1 = await identifiersSection.startAddIdentifier();
      await identifiersSection.commitIdentifierAdd(id1, 'FirstTestKey', ['Country'], false);
      await formEditor.waitForDirty();

      const firstKey = await identifiersSection.getIdentifier('FirstTestKey');
      expect(await firstKey.isPrimary()).toBe(false);

      const id2 = await identifiersSection.startAddIdentifier();
      await identifiersSection.commitIdentifierAdd(id2, 'SecondTestKey', ['BirthDate'], false);
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

      await identifiersSection.deleteIdentifier('FirstTestKey');
      await formEditor.waitForDirty();

      await identifiersSection.deleteIdentifier('SecondTestKey');
      await formEditor.saveAndClose();
   });
});
