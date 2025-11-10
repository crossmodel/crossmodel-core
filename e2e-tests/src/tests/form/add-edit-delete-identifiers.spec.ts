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

      const saved1 = await identifiersSection.findIdentifier('TestPrimaryKey');
      expect(saved1).toBeDefined();
      expect(await saved1?.getName()).toBe('TestPrimaryKey');

      const id2 = await identifiersSection.startAddIdentifier();
      await identifiersSection.commitIdentifierAdd(id2, 'AlternateKey', ['FirstName', 'LastName'], false);

      const saved2 = await identifiersSection.findIdentifier('AlternateKey');
      expect(saved2).toBeDefined();
      expect(await saved2?.getName()).toBe('AlternateKey');
      expect(await saved2?.isPrimary()).toBe(false);

      const allIdentifiers = await identifiersSection.getAllIdentifiers();
      expect(allIdentifiers.length).toBeGreaterThanOrEqual(2);

      await identifiersSection.deleteIdentifier('TestPrimaryKey');
      await identifiersSection.deleteIdentifier('AlternateKey');
      await formEditor.saveAndClose();
   });

   test('Modify existing identifiers', async () => {
      const formEditor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Form Editor');
      const form = await formEditor.formFor('entity');
      const identifiersSection = form.identifiersSection;

      const newId = await identifiersSection.startAddIdentifier();
      await identifiersSection.commitIdentifierAdd(newId, 'ModifyTest', ['Phone'], false);
      await formEditor.page.waitForTimeout(500);

      const identifier = await identifiersSection.getIdentifier('ModifyTest');
      await identifier.setName('ModifiedTest');
      await identifier.save();
      await formEditor.page.waitForTimeout(500);

      const renamed = await identifiersSection.findIdentifier('ModifiedTest');
      expect(renamed).toBeDefined();
      expect(await renamed?.getName()).toBe('ModifiedTest');

      await identifiersSection.deleteIdentifier('ModifiedTest');
      await formEditor.saveAndClose();
   });

   test('Remove identifiers from entity', async () => {
      const formEditor = await app.openCompositeEditor(TEST_ENTITY_PATH, 'Form Editor');
      const form = await formEditor.formFor('entity');
      const identifiersSection = form.identifiersSection;

      const testId = await identifiersSection.startAddIdentifier();
      await identifiersSection.commitIdentifierAdd(testId, 'ToBeDeleted', ['City'], false);
      await formEditor.page.waitForTimeout(500);

      const countBefore = (await identifiersSection.getAllIdentifiers()).length;
      await identifiersSection.deleteIdentifier('ToBeDeleted');
      await formEditor.page.waitForTimeout(500);

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

      await formEditor.page.waitForTimeout(500);

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
      await formEditor.page.waitForTimeout(500);

      const firstKey = await identifiersSection.getIdentifier('FirstTestKey');
      expect(await firstKey.isPrimary()).toBe(false);

      const id2 = await identifiersSection.startAddIdentifier();
      await identifiersSection.commitIdentifierAdd(id2, 'SecondTestKey', ['BirthDate'], false);
      await formEditor.page.waitForTimeout(500);

      const secondKey = await identifiersSection.getIdentifier('SecondTestKey');
      expect(await secondKey.isPrimary()).toBe(false);

      await firstKey.setPrimary(true);
      await firstKey.save();
      await formEditor.page.waitForTimeout(500);

      expect(await (await identifiersSection.getIdentifier('FirstTestKey')).isPrimary()).toBe(true);

      const second = await identifiersSection.getIdentifier('SecondTestKey');
      await second.setPrimary(true);
      await second.save();
      await formEditor.page.waitForTimeout(1000);

      expect(await (await identifiersSection.getIdentifier('FirstTestKey')).isPrimary()).toBe(false);
      expect(await (await identifiersSection.getIdentifier('SecondTestKey')).isPrimary()).toBe(true);

      // Only one primary should exist
      const allIds = await identifiersSection.getAllIdentifiers();
      let primaryCount = 0;
      for (const id of allIds) {
         if (await id.isPrimary()) {
            primaryCount++;
         }
      }
      expect(primaryCount).toBe(1);

      await identifiersSection.deleteIdentifier('FirstTestKey');
      await identifiersSection.deleteIdentifier('SecondTestKey');
      await formEditor.saveAndClose();
   });
});
