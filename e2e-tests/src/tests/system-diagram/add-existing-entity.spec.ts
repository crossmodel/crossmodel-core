/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { expect } from '@eclipse-glsp/glsp-playwright';
import { test } from '@playwright/test';
import { CMApp } from '../../page-objects/cm-app';
import { LogicalEntity } from '../../page-objects/system-diagram/diagram-elements';

test.describe.serial('Add existing entity to a diagram', () => {
   let app: CMApp;
   const SYSTEM_DIAGRAM_PATH = 'system-diagram/diagrams/AddExistingEntityDiagram.system-diagram.cm';
   const CUSTOMER_ENTITY_ID = 'Customer';

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
   });
   test.afterAll(async () => {
      await app.page.close();
   });

   test('Add existing entity via toolbox', async () => {
      // Open the system diagram and add the existing entity via the 'Show Entity' tool.
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const diagram = diagramEditor.diagram;
      await diagram.graph.waitForCreationOfType(LogicalEntity, async () => {
         const position = (await diagram.graph.bounds()).position('middle_center');
         const commandPalette = await diagramEditor.invokeShowLogicalEntityToolAtPosition(position);
         await commandPalette.search(CUSTOMER_ENTITY_ID, { confirm: true });
      });

      // Verify that the entity node was created as expected
      const customer = await diagramEditor.getLogicalEntity(CUSTOMER_ENTITY_ID);
      expect(customer).toBeDefined();

      // Open the diagram code editor and check the Customer entity node was added.
      const diagramCodeEditor = await diagramEditor.parent.switchToCodeEditor();
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(10)).toMatch(`- id: ${CUSTOMER_ENTITY_ID}Node`);
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(11)).toMatch(`entity: ${CUSTOMER_ENTITY_ID}`);
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(12)).toMatch(/x:\s*\d+/);
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(13)).toMatch(/y:\s*\d+/);
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(14)).toMatch(/width:\s*\d+/);
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(15)).toMatch(/height:\s*\d+/);
      await diagramCodeEditor.saveAndClose();
   });

   test('Add existing entity via keyboard shortcut', async () => {
      // Open the system diagram and add the existing customer entity via keyboard shortcut.
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const diagram = diagramEditor.diagram;
      await diagram.graph.waitForCreationOfType(LogicalEntity, async () => {
         await diagram.globalCommandPalette.open();
         await diagram.globalCommandPalette.search(CUSTOMER_ENTITY_ID, { confirm: true });
      });

      // Verify that the entity node was created as expected (at this point we have 2 customer nodes).
      const customers = await diagramEditor.getLogicalEntities(CUSTOMER_ENTITY_ID);
      expect(customers).toHaveLength(2);

      // Open the diagram code editor and check the second Customer entity node is added.
      const diagramCodeEditor = await diagramEditor.parent.switchToCodeEditor();
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(16)).toMatch(`- id: ${CUSTOMER_ENTITY_ID}Node1`);
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(17)).toMatch(`entity: ${CUSTOMER_ENTITY_ID}`);
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(18)).toMatch(/x:\s*\d+/);
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(19)).toMatch(/y:\s*\d+/);
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(20)).toMatch(/width:\s*\d+/);
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(21)).toMatch(/height:\s*\d+/);
      await diagramCodeEditor.saveAndClose();
   });
});
