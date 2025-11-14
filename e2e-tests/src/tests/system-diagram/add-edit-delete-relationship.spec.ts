/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { expect, test } from '@playwright/test';
import { CMApp } from '../../page-objects/cm-app';
import { RelationshipPropertiesView } from '../../page-objects/cm-properties-view';
import { Relationship } from '../../page-objects/system-diagram/diagram-elements';
import { IntegratedSystemDiagramEditor } from '../../page-objects/system-diagram/integrated-system-diagram-editor';

test.describe.serial('Add/Edit/Delete relationship in a diagram ', () => {
   let app: CMApp;
   const SYSTEM_DIAGRAM_PATH = 'system-diagram/diagrams/AddEditDeleteRelationshipDiagram.system-diagram.cm';
   const CUSTOMER_ENTITY_ID = 'Customer';
   const ORDER_ENTITY_ID = 'Order';
   const NEW_RELATIONSHIP_PATH = 'system-diagram/relationships/Customer_to_Order.relationship.cm';

   test.beforeAll(async ({ browser, playwright }) => {
      app = await CMApp.load({ browser, playwright });
   });
   test.afterAll(async () => {
      await app.page.close();
   });

   async function getNewRelationship(diagramEditor: IntegratedSystemDiagramEditor): Promise<Relationship> {
      const sourceEntity = await diagramEditor.getLogicalEntity(CUSTOMER_ENTITY_ID);
      const targetEntity = await diagramEditor.getLogicalEntity(ORDER_ENTITY_ID);
      return diagramEditor.diagram.graph.getEdgeBetween(Relationship, { sourceNode: sourceEntity, targetNode: targetEntity });
   }

   test('Create new relationship via toolbox', async () => {
      // Open the system diagram and create a relationship between the customer and order entity using the '1:1 Relationship tool'.
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const sourceEntity = await diagramEditor.getLogicalEntity(CUSTOMER_ENTITY_ID);
      const targetEntity = await diagramEditor.getLogicalEntity(ORDER_ENTITY_ID);

      await diagramEditor.waitForCreationOfType(Relationship, async () => {
         await diagramEditor.enableTool('Create Relationship');
         const targetPosition = (await targetEntity.bounds()).position('middle_center');
         await sourceEntity.dragToAbsolutePosition(targetPosition.data);
      });

      // Verify that the relationship edge is created in the diagram
      const diagramCodeEditor = await diagramEditor.parent.switchToCodeEditor();
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(16)).toMatch('edges:');
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(17)).toMatch('- id: Customer_to_OrderEdge');
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(18)).toMatch('relationship: system-diagram.Customer_to_Order');
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(19)).toMatch('sourceNode: CustomerNode');
      expect(await diagramCodeEditor.textContentOfLineByLineNumber(20)).toMatch('targetNode: OrderNode');
      await diagramCodeEditor.saveAndClose();

      // Verify that the relationship file is created
      const explorer = await app.openExplorerView();
      expect(await explorer.existsFileNode(NEW_RELATIONSHIP_PATH)).toBeTruthy();

      // Verify the relationship file contents is as expected
      const entityCodeEditor = await app.openCompositeEditor(NEW_RELATIONSHIP_PATH, 'Code Editor');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(1)).toBe('relationship:');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(2)).toMatch('id: Customer_to_Order');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(3)).toMatch('name: "Customer to Order"');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(4)).toMatch('parent: Customer');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(5)).toMatch('child: Order');
      await entityCodeEditor.saveAndClose();
   });

   test('Edit relationship name & description via properties', async () => {
      // Open the system diagram and change it using the property widget
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const relationship = await getNewRelationship(diagramEditor);
      await relationship.select();
      const properties = await app.openView(RelationshipPropertiesView);
      const form = await properties.form();
      await form.generalSection.setName('RenamedRelationship');
      await form.generalSection.setDescription('RenamedRelationshipDescription');
      await form.waitForDirty();

      // Verify that the entity is renamed in the form
      expect(await form.generalSection.getName()).toBe('RenamedRelationship');
      expect(await form.generalSection.getDescription()).toBe('RenamedRelationshipDescription');
      await properties.saveAndClose();

      // Verify the relationship file contents is updated
      const entityCodeEditor = await app.openCompositeEditor(NEW_RELATIONSHIP_PATH, 'Code Editor');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(3)).toMatch('name: "RenamedRelationship');
      expect(await entityCodeEditor.textContentOfLineByLineNumber(4)).toMatch('description: "RenamedRelationshipDescription"');
      await entityCodeEditor.saveAndClose();
   });

   // Note: Currently the delete operation is actual the 'Hide' operation compared to entities.
   // This means the relationship file isn't actually removed.
   // TODO: Have separate Hide and Delete tools so the behavior is equal to entities.
   test('Hide new relationship', async () => {
      // Open the system diagram and delete the relationship edge from the diagram.
      const diagramEditor = await app.openCompositeEditor(SYSTEM_DIAGRAM_PATH, 'System Diagram');
      const relationship = await getNewRelationship(diagramEditor);
      await relationship.delete();
      const diagramCodeEditor = await diagramEditor.parent.switchToCodeEditor();
      expect(await diagramCodeEditor.numberOfLines()).toBe(15);
      await diagramCodeEditor.saveAndClose();

      // TODO: See comment at top of test, we should have separate hide and delete tools.
      // const explorer = await app.openExplorerView();
      // expect(await explorer.findTreeNode(NEW_RELATIONSHIP_PATH)).toBeUndefined();
   });
});
