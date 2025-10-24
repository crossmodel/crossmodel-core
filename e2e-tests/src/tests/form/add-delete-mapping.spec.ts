/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { expect, test } from '@playwright/test';
import { CMApp } from '../../page-objects/cm-app';

test.describe('Mapping Tests', () => {
   let app: CMApp;
   const EXISTING_MAPPING_PATH = 'ExampleCRM/mappings/TestMapping.mapping.cm';

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
   });
   test.afterAll(async () => {
      await app.page.close();
   });

   test('Open existing mapping in code editor', async () => {
      const codeEditor = await app.openCompositeEditor(EXISTING_MAPPING_PATH, 'Code Editor');

      // Verify the mapping structure
      expect(await codeEditor.textContentOfLineByLineNumber(1)).toBe('mapping:');
      expect((await codeEditor.textContentOfLineByLineNumber(2))?.trim()).toBe('id: TestMapping');
      expect((await codeEditor.textContentOfLineByLineNumber(3))?.trim()).toBe('name: "Test Mapping"');
      expect((await codeEditor.textContentOfLineByLineNumber(4))?.trim()).toBe('sources:');

      await codeEditor.close();
   });

   test('Verify mapping file exists in explorer', async () => {
      const explorer = await app.openExplorerView();

      // Verify the mapping file exists in the explorer
      expect(await explorer.existsFileNode(EXISTING_MAPPING_PATH)).toBeTruthy();
   });

   test('Switch between code and form editor for mapping', async () => {
      const compositeEditor = await app.openCompositeEditor(EXISTING_MAPPING_PATH, 'Code Editor');

      // Verify code editor is accessible
      const codeContent = await compositeEditor.textContentOfLineByLineNumber(1);
      expect(codeContent).toBe('mapping:');

      // Close the editor
      await compositeEditor.close();
   });
});
