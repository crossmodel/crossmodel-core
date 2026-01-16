/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { expect, test } from '@playwright/test';
import { CMApp } from '../page-objects/cm-app';
import { CMCompositeEditor } from '../page-objects/cm-composite-editor';

test.describe('CrossModel Error Views', () => {
   let app: CMApp;

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
   });

   test('Form Editor should show error if model code is broken', async () => {
      const editor = await app.openEditor('example-entity.entity.cm', CMCompositeEditor);
      expect(editor).toBeDefined();

      const codeEditor = await editor.switchToCodeEditor();
      expect(codeEditor).toBeDefined();
      await codeEditor.addTextToNewLineAfterLineByLineNumber(2, 'break-model');

      const formEditor = await editor.switchToFormEditor();
      expect(
         await formEditor.hasError(
            // eslint-disable-next-line max-len
            "The file contains one or more errors. Please fix the error(s) using the 'Code Editor'. This perspective will be read-only until the errors are resolved."
         )
      ).toBeTruthy();
   });

   test('Diagram Editor should show error if model code is broken', async () => {
      const editor = await app.openEditor('example-diagram.diagram.cm', CMCompositeEditor);
      expect(editor).toBeDefined();

      const codeEditor = await editor.switchToCodeEditor();
      await codeEditor.addTextToNewLineAfterLineByLineNumber(2, 'break-model');

      const diagramEditor = await editor.switchToSystemDiagram();
      expect(
         await diagramEditor.hasError(
            // eslint-disable-next-line max-len
            "The file contains one or more errors. Please fix the error(s) using the 'Code Editor'. This perspective will be read-only until the errors are resolved."
         )
      ).toBeTruthy();
   });
});
