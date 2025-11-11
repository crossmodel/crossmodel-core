/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { expect } from '@eclipse-glsp/glsp-playwright';
import { test } from '@playwright/test';
import { CMApp } from '../../../page-objects/cm-app';
test.describe.serial('Add/Edit/Delete identifiers via properties view', () => {
   let app: CMApp;

   const SYSTEM_DIAGRAM_PATH = 'ExampleCRM/diagrams/EMPTY.system-diagram.cm';
   const ENTITY_PATH = 'ExampleCRM/entities/EmptyEntity.entity.cm';
   const EMPTY_ENTITY_ID = 'EmptyEntity';

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
      const { diagramEditor, form } = await openEntityForm();

      await addAttribute(diagramEditor, form, ATTRIBUTE_ONE);
      await addAttribute(diagramEditor, form, ATTRIBUTE_TWO);

      await addIdentifier(diagramEditor, form, PRIMARY_IDENTIFIER_NAME, [ATTRIBUTE_ONE], true);

      const primaryIdentifier = await form.identifiersSection.getIdentifier(PRIMARY_IDENTIFIER_NAME);
      const attributeOne = await form.attributesSection.getAttribute(ATTRIBUTE_ONE);

      expect(await primaryIdentifier.isPrimary()).toBe(true);
      expect(await primaryIdentifier.getAttributes()).toEqual([ATTRIBUTE_ONE]);
      expect(await attributeOne.isIdentifier()).toBe(true);

      await closePropertiesTab(app.page);
      await diagramEditor.saveAndClose();

      const fileContent = await readEntityFile();
      expect(fileContent).toContain('identifiers:');
      expect(fileContent).toContain(`id: ${PRIMARY_IDENTIFIER_NAME}`);
      expect(fileContent).toContain(`name: "${PRIMARY_IDENTIFIER_NAME}"`);
      expect(fileContent).toContain('primary: true');
      expect(fileContent).toContain(ATTRIBUTE_ONE);

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
      await closePropertiesTab(app.page);
   });

   test('Modify identifier attributes', async () => {
      const { diagramEditor, form } = await openEntityForm();

      await addAttribute(diagramEditor, form, ATTRIBUTE_ONE);
      await addAttribute(diagramEditor, form, ATTRIBUTE_TWO);

      await addIdentifier(diagramEditor, form, PRIMARY_IDENTIFIER_NAME, [ATTRIBUTE_ONE], true);

      // Modify the identifier's attributes by adding ATTRIBUTE_TWO
      await diagramEditor.waitForModelUpdate(async () => {
         const identifier = await form.identifiersSection.getIdentifier(PRIMARY_IDENTIFIER_NAME);
         await identifier.setAttributes([ATTRIBUTE_TWO]);
         await identifier.save();
         await form.waitForDirty();
      });

      const identifier = await form.identifiersSection.getIdentifier(PRIMARY_IDENTIFIER_NAME);
      const attrs = await identifier.getAttributes();
      const attrList = attrs.flatMap((a: string) => a.split(',').map((s: string) => s.trim()));
      expect(attrList).toEqual(expect.arrayContaining([ATTRIBUTE_ONE, ATTRIBUTE_TWO]));

      await closePropertiesTab(app.page);
      await diagramEditor.saveAndClose();

      const fileContent = await readEntityFile();
      expect(fileContent).toContain(`name: "${PRIMARY_IDENTIFIER_NAME}"`);
      expect(fileContent).toContain('primary: true');
      expect(fileContent).toContain(ATTRIBUTE_ONE);
      expect(fileContent).toContain(ATTRIBUTE_TWO);

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
      await closePropertiesTab(app.page);
   });

   test('Support multiple identifiers', async () => {
      const { diagramEditor, form } = await openEntityForm();

      await addAttribute(diagramEditor, form, ATTRIBUTE_ONE);
      await addAttribute(diagramEditor, form, ATTRIBUTE_TWO);

      await addIdentifier(diagramEditor, form, PRIMARY_IDENTIFIER_NAME, [ATTRIBUTE_ONE], true);
      await addIdentifier(diagramEditor, form, SECONDARY_IDENTIFIER_NAME, [ATTRIBUTE_TWO], false);

      const allIdentifiers = await form.identifiersSection.getAllIdentifiers();
      expect(allIdentifiers).toHaveLength(2);
      expect(await allIdentifiers[0].getName()).toBe(PRIMARY_IDENTIFIER_NAME);
      expect(await allIdentifiers[1].getName()).toBe(SECONDARY_IDENTIFIER_NAME);

      await closePropertiesTab(app.page);
      await diagramEditor.saveAndClose();

      const fileContent = await readEntityFile();
      expect(fileContent).toContain(`name: "${PRIMARY_IDENTIFIER_NAME}"`);
      expect(fileContent).toContain('primary: true');
      expect(fileContent).toContain(`name: "${SECONDARY_IDENTIFIER_NAME}"`);

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
      await closePropertiesTab(app.page);
   });

   test('Enforce single primary identifier', async () => {
      const { diagramEditor, form } = await openEntityForm();

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

      await closePropertiesTab(app.page);
      await diagramEditor.saveAndClose();

      const fileContent = await readEntityFile();
      expect(fileContent).toContain(`name: "${RENAMED_IDENTIFIER_NAME}"`);
      expect(fileContent).toContain('primary: true');

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
      await closePropertiesTab(app.page);
   });

   test('Remove identifiers via properties view', async () => {
      const { diagramEditor, form } = await openEntityForm();

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

      await closePropertiesTab(app.page);
      await diagramEditor.saveAndClose();

      const fileContent = await readEntityFile();
      expect(fileContent).not.toContain(PRIMARY_IDENTIFIER_NAME);
      expect(fileContent).toContain(`name: "${SECONDARY_IDENTIFIER_NAME}"`);

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
      await closePropertiesTab(app.page);
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

   async function readEntityFile(): Promise<string> {
      const entityEditor = await app.openCompositeEditor(ENTITY_PATH, 'Code Editor');
      await entityEditor.waitForVisible();
      await entityEditor.activate();

      const lines: string[] = [];
      for (let index = 1; index <= 80; index++) {
         try {
            const line = await entityEditor.textContentOfLineByLineNumber(index);
            if (line) {
               lines.push(line);
            }
         } catch (error) {
            break;
         }
      }

      await entityEditor.saveAndClose();
      return lines.join('\n');
   }
});

async function closePropertiesTab(page: import('@playwright/test').Page): Promise<void> {
   await page.keyboard.press(process.platform === 'darwin' ? 'Meta+S' : 'Control+S');
   await page.waitForTimeout(500);

   const tab = page.locator('#shell-tab-property-view');
   const view = page.locator('#property-view');

   const tabCount = await tab.count();
   if (tabCount === 0 || !(await tab.isVisible().catch(() => false))) {
      return;
   }

   const closeIcon = tab.locator('.lm-TabBar-tabCloseIcon');
   if (await closeIcon.isVisible().catch(() => false)) {
      await closeIcon.click();
   }

   const timeoutMs = process.env.CI ? 20000 : 10000;
   const start = Date.now();

   while (Date.now() - start < timeoutMs) {
      const attached = await tab
         .count()
         .then(c => c > 0)
         .catch(() => false);
      if (!attached) {
         return;
      }

      const cls = await tab.getAttribute('class').catch(() => '');
      const notCurrent = cls ? !cls.includes('lm-mod-current') : true;
      const viewHidden = await view.isHidden().catch(() => true);

      if (notCurrent || viewHidden) {
         return;
      }

      await page.waitForTimeout(300);
   }

   console.warn('Properties tab may still be active after timeout, but continuing...');
}
