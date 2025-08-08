/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { describe, expect, test } from '@jest/globals';
import { LogicalEntityNode } from '../../src/language-server/generated/ast.js';
import { createCrossModelTestServices, parseSystemDiagram } from './test-utils/utils.js';

const services = createCrossModelTestServices();

const ex1 = `systemDiagram:
    id: example1`;
const ex2 = `systemDiagram:
    id: example2
    nodes:
        - id: nodeA
          entity: NotExisting
          x: 0
          y: 0
          width: 0
          height: 0`;
const ex3 = `systemDiagram:
    id: example3
    nodes:
        - id: nodeA
          entity: NotExisting
          x: 0
          y: 0
          width: 0
          height: 0
        - id: nodeA1
          entity: NotExisting
          x: 0
          y: 0
          width: 0
          height: 0`;
const ex4 = `systemDiagram:
    id: example4
    nodes:
        - id: nodeA
          entity: NotExisting
          x: 0
          y: 0
          width: 0
          height: 0
        - id: nodeA1
          entity: NotExisting
          x: 0
          y: 0
          width: 0
          height: 0
        - id: nodeA2
          entity: NotExisting
          x: 0
          y: 0
          width: 0
          height: 0
        - id: nodeA4
          entity: NotExisting
          x: 0
          y: 0
          width: 0
          height: 0`;

describe('NameUtil', () => {
   describe('findAvailableNodeName', () => {
      test('should return given name if unique', async () => {
         const diagram = await parseSystemDiagram({ services, text: ex1 });
         expect(services.references.IdProvider.findNextId(LogicalEntityNode, 'nodeA', diagram)).toBe('nodeA');
      });

      test('should return unique name if given is taken', async () => {
         const diagram = await parseSystemDiagram({ services, text: ex2 });
         expect(services.references.IdProvider.findNextId(LogicalEntityNode, 'nodeA', diagram)).toBe('nodeA1');
      });

      test('should properly count up if name is taken', async () => {
         const diagram = await parseSystemDiagram({ services, text: ex3 });
         expect(services.references.IdProvider.findNextId(LogicalEntityNode, 'nodeA', diagram)).toBe('nodeA2');
      });

      test('should find lowest count if multiple are taken', async () => {
         const diagram = await parseSystemDiagram({ services, text: ex4 });
         expect(services.references.IdProvider.findNextId(LogicalEntityNode, 'nodeA', diagram)).toBe('nodeA3');
      });
   });

   describe('getGlobalId', () => {
      test('should not duplicate datamodel ID when local ID equals package name', () => {
         const idProvider = services.references.IdProvider;

         // Create a mock node with ID that matches the package name
         const mockNode = {
            id: 'example-dwh',
            $type: 'DataModel',
            $container: undefined
         };

         // Mock the getPackageName method to return the same ID
         const originalGetPackageName = idProvider.getDataModelId;
         idProvider.getDataModelId = () => 'example-dwh';

         try {
            const globalId = idProvider.getGlobalId(mockNode);
            // Should return just 'example-dwh', not 'example-dwh.example-dwh'
            expect(globalId).toBe('example-dwh');
         } finally {
            // Restore original method
            idProvider.getDataModelId = originalGetPackageName;
         }
      });

      test('should combine package name and local ID when they differ', () => {
         const idProvider = services.references.IdProvider;

         // Create a mock node with ID different from package name
         const mockNode = {
            id: 'entity1',
            $type: 'LogicalEntity',
            $container: undefined
         };

         // Mock the getPackageName method
         const originalGetPackageName = idProvider.getDataModelId;
         idProvider.getDataModelId = () => 'example-dwh';

         try {
            const globalId = idProvider.getGlobalId(mockNode);
            // Should return 'example-dwh.entity1'
            expect(globalId).toBe('example-dwh.entity1');
         } finally {
            // Restore original method
            idProvider.getDataModelId = originalGetPackageName;
         }
      });
   });
});
