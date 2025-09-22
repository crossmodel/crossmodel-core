/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { expect } from '@eclipse-glsp/glsp-playwright';
import { test } from '@playwright/test';
import { CMApp } from '../../../page-objects/cm-app';
import { LogicalEntity } from '../../../page-objects/system-diagram/diagram-elements';
import { TheiaMinimalDialog } from '../../../page-objects/theia-minimal-dialog';

test.describe.serial('Add/Edit/Delete entity in a diagram ', () => {
   let app: CMApp;
   const SYSTEM_DIAGRAM_PATH = 'ExampleCRM/diagrams/EMPTY.system-diagram.cm';
   const NEW_ENTITY_PATH = 'ExampleCRM/entities/NewEntity.entity.cm';
   const NEW_ENTITY_LABEL = 'NewEntity';
   const RENAMED_ENTITY_LABEL = 'NewEntityRenamed';
   const RENAMED_ENTITY_DESCRIPTION = 'NewEntityDescription';

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
   });
   test.afterAll(async () => {
      await app.page.close();
   });

   test('Create new entity via toolbox', async () => {
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      // Create new entity
      await diagramEditor.waitForCreationOfType(LogicalEntity, async () => {
         const existingEntity = await diagramEditor.getLogicalEntity('EmptyEntity');
         await diagramEditor.enableTool('Create Entity');
         const taskBounds = await existingEntity.bounds();
         await taskBounds.position('top_center').moveRelative(0, -100).click();
         await new TheiaMinimalDialog(app).confirm();
      });

      // Verify that the entity node was created as expected in the diagram
      const newEntity = await diagramEditor.getLogicalEntity(NEW_ENTITY_LABEL);
      expect(newEntity).toBeDefined();

      // Switch to diagram code editor and check the file contains the new entity node
      const diagramCodeEditor = await diagramEditor.parent.switchToCodeEditor();
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(10)).toMatch(`- id: ${NEW_ENTITY_LABEL}Node`);
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(11)).toMatch(`entity: ${NEW_ENTITY_LABEL}`);
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(12)).toMatch(/x:\s*\d+/);
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(13)).toMatch(/y:\s*\d+/);
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(14)).toMatch(/width:\s*\d+/);
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(15)).toMatch(/height:\s*\d+/);
      await diagramCodeEditor.saveAndClose();

      // Verify that the entity file is listed in the explorer view
      const explorer = await app.openExplorerView();
      expect(await explorer.existsFileNode(NEW_ENTITY_PATH)).toBeTruthy();

      // Open the entity file in the code editor and check contents.
      const entityCodeEditor = await app.openCompositeEditor(NEW_ENTITY_PATH, 'Code Editor');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(1)).toBe('entity:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(2)).toMatch(`id: ${NEW_ENTITY_LABEL}`);
      expect(await entityCodeEditor.textContentOfLineByLineNumber(3)).toMatch(`name: "${NEW_ENTITY_LABEL}"`);

      await entityCodeEditor.saveAndClose();
   });

   test('Edit entity name & description via properties', async () => {
      // Open the system diagram with the new entity
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      // Open the property widget of the new entity and update it's name and description
      const properties = await diagramEditor.selectLogicalEntityAndOpenProperties(NEW_ENTITY_LABEL);
      const form = await properties.form();
      await form.generalSection.setName(RENAMED_ENTITY_LABEL);
      await form.generalSection.setDescription(RENAMED_ENTITY_DESCRIPTION);
      await form.waitForDirty();
      // Verify that the entity was renamed as expected
      expect(await form.generalSection.getName()).toBe(RENAMED_ENTITY_LABEL);
      expect(await form.generalSection.getDescription()).toBe(RENAMED_ENTITY_DESCRIPTION);
      // Save and close the entity and diagram.
      await properties.saveAndClose();
      await diagramEditor.activate();
      await diagramEditor.saveAndClose();

      // Open the new entity with the code editor and check it's file contents to be updated
      const entityCodeEditor = await app.openCompositeEditor(NEW_ENTITY_PATH, 'Code Editor');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(3)).toMatch(`name: "${RENAMED_ENTITY_LABEL}"`);
      expect(await entityCodeEditor.textContentOfLineByLineNumber(4)).toMatch(`description: "${RENAMED_ENTITY_DESCRIPTION}"`);

      await entityCodeEditor.saveAndClose();
   });

   test('Hide new entity', async () => {
      // Open the system diagram with the renamed entity node
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      await diagramEditor.activate();
      const renamedEntity = await diagramEditor.getLogicalEntity(RENAMED_ENTITY_LABEL);
      // Hide the entity node
      await diagramEditor.waitForModelUpdate(async () => {
         await diagramEditor.enableTool('Hide');
         await renamedEntity.click();
      });

      // Check if entity is actually just hidden, i.e. can be shown again
      const position = (await diagramEditor.diagram.graph.bounds()).position('middle_center');
      const commandPalette = await diagramEditor.invokeShowLogicalEntityToolAtPosition(position);
      const entitySuggestions = await commandPalette.suggestions();
      // The suggestions are Ids and the Id property of the new entity hasn't changed (yet).
      expect(entitySuggestions).toContain(NEW_ENTITY_LABEL);

      await diagramEditor.saveAndClose();
   });

   test('Delete new entity', async () => {
      // Delete the new entity file from the explorer view.
      const explorer = await app.openExplorerView();
      await explorer.deleteNode(NEW_ENTITY_PATH, true);
      expect(await explorer.findTreeNode(NEW_ENTITY_PATH)).toBeUndefined();
      // Open the system diagram and check the entity is not listed in the suggestions anymore.
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const position = (await diagramEditor.diagram.graph.bounds()).position('middle_center');
      const commandPalette = await diagramEditor.invokeShowLogicalEntityToolAtPosition(position);
      const entitySuggestions = await commandPalette.suggestions();
      expect(entitySuggestions).not.toContain(NEW_ENTITY_LABEL);

      await diagramEditor.close();
   });
});
