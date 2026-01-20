/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { expect } from '@eclipse-glsp/glsp-playwright';
import { test } from '@playwright/test';
import { CMApp } from '../../page-objects/cm-app';
import { LogicalEntity } from '../../page-objects/system-diagram/diagram-elements';
import { TheiaMinimalDialog } from '../../page-objects/theia-minimal-dialog';

test.describe.serial('Add/Edit/Delete entity in a diagram ', () => {
   let app: CMApp;
   const SYSTEM_DIAGRAM_PATH = 'system-diagram/diagrams/AddEditDeleteEntityDiagram.diagram.cm';
   const NEW_ENTITY_PATH = 'system-diagram/entities/NewEntity.entity.cm';
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
      // --- Part 1: Create entity and save diagram ---
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'Diagram');
      // Create new entity
      await diagramEditor.waitForCreationOfType(LogicalEntity, async () => {
         const existingEntity = await diagramEditor.getLogicalEntity('AddEditDeleteEntityEntity');
         await diagramEditor.enableTool('Create Entity');
         const taskBounds = await existingEntity.bounds();
         await taskBounds.position('top_center').moveRelative(0, -100).click();
         await new TheiaMinimalDialog(app).confirm();
      });

      // Verify that the entity node was created as expected in the diagram
      const newEntity = await diagramEditor.getLogicalEntity(NEW_ENTITY_LABEL);
      expect(newEntity).toBeDefined();

      // Save and close the diagram to ensure persistence
      await diagramEditor.parent.saveAndClose();

      // --- Part 2: Verify diagram file content ---
      const diagramEditorForVerification = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'Diagram');
      const diagramCodeEditor = await diagramEditorForVerification.parent.switchToCodeEditor();
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(10)).toMatch(`- id: ${NEW_ENTITY_LABEL}Node`);
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(11)).toMatch(`entity: ${NEW_ENTITY_LABEL}`);
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(12)).toMatch(/x:\s*\d+/);
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(13)).toMatch(/y:\s*\d+/);
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(14)).toMatch(/width:\s*\d+/);
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(15)).toMatch(/height:\s*\d+/);
      await diagramCodeEditor.saveAndClose();

      // --- Part 3: Verify new entity file ---
      // Verify that the entity file is listed in the explorer view
      const explorer = await app.openExplorerView();
      expect(await explorer.existsFileNode(NEW_ENTITY_PATH)).toBeTruthy();

      // Verify that the entities folder is expanded after entity creation
      const entitiesFolder = await explorer.findTreeNode('system-diagram/entities');
      expect(entitiesFolder).toBeDefined();
      expect(await entitiesFolder!.isCollapsed()).toBeFalsy();

      // Open the entity file in the code editor and check contents.
      const entityCodeEditor = await app.openCompositeEditor(NEW_ENTITY_PATH, 'Code Editor');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(1)).toBe('entity:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(2)).toMatch(`id: ${NEW_ENTITY_LABEL}`);
      expect(await entityCodeEditor.textContentOfLineByLineNumber(3)).toMatch(`name: "${NEW_ENTITY_LABEL}"`);

      await entityCodeEditor.saveAndClose();
   });

   test('Edit entity name & description via properties', async () => {
      // --- Setup: Create entity if it does not exist ---
      let diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'Diagram');
      const entity = await diagramEditor.findLogicalEntity(NEW_ENTITY_LABEL);
      if (!entity) {
         await diagramEditor.waitForCreationOfType(LogicalEntity, async () => {
            const existingEntity = await diagramEditor.getLogicalEntity('EmptyEntity');
            await diagramEditor.enableTool('Create Entity');
            const taskBounds = await existingEntity.bounds();
            await taskBounds.position('top_center').moveRelative(0, -100).click();
            await new TheiaMinimalDialog(app).confirm();
         });
         await diagramEditor.parent.saveAndClose();
         diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'Diagram');
      }

      // --- Test ---
      await diagramEditor.waitForVisible();
      // Poll until the entity is found, to avoid race conditions on diagram load
      await expect.poll(async () => diagramEditor.findLogicalEntity(NEW_ENTITY_LABEL)).toBeDefined();
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
      // --- Setup: Create and rename entity if it does not exist ---
      let diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'Diagram');
      const entity = await diagramEditor.findLogicalEntity(RENAMED_ENTITY_LABEL);

      if (!entity) {
         const originalEntity = await diagramEditor.findLogicalEntity(NEW_ENTITY_LABEL);
         if (!originalEntity) {
            // Create NewEntity
            await diagramEditor.waitForCreationOfType(LogicalEntity, async () => {
               const existingEntity = await diagramEditor.getLogicalEntity('EmptyEntity');
               await diagramEditor.enableTool('Create Entity');
               const taskBounds = await existingEntity.bounds();
               await taskBounds.position('top_center').moveRelative(0, -100).click();
               await new TheiaMinimalDialog(app).confirm();
            });
            await diagramEditor.parent.saveAndClose();
            diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'Diagram');
         }

         // Now, rename NewEntity to NewEntityRenamed
         const properties = await diagramEditor.selectLogicalEntityAndOpenProperties(NEW_ENTITY_LABEL);
         const form = await properties.form();
         await form.generalSection.setName(RENAMED_ENTITY_LABEL);
         await form.generalSection.setDescription(RENAMED_ENTITY_DESCRIPTION);
         await form.waitForDirty();
         await properties.saveAndClose();
         await diagramEditor.parent.saveAndClose();
      } else {
         // If renamed entity already exists, just close the editor
         await diagramEditor.parent.saveAndClose();
      }

      // --- Test ---
      diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'Diagram');
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
      // Open the diagram and check the entity is not listed in the suggestions anymore.
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'Diagram');
      const position = (await diagramEditor.diagram.graph.bounds()).position('middle_center');
      const commandPalette = await diagramEditor.invokeShowLogicalEntityToolAtPosition(position);
      const entitySuggestions = await commandPalette.suggestions();
      expect(entitySuggestions).not.toContain(NEW_ENTITY_LABEL);
      // Close the command palette by pressing Escape
      await diagramEditor.page.keyboard.press('Escape');

      await diagramEditor.saveAndClose();
   });
});
