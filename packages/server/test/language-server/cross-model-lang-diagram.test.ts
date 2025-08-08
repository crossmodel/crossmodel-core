/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { describe, expect, test } from '@jest/globals';
import { isReference } from 'langium';

import { InheritanceEdge, RelationshipEdge, isInheritanceEdge, isRelationshipEdge } from '../../src/language-server/generated/ast.js';
import { diagram1, diagram2, diagram3, diagram4, diagram5, diagram6, diagram7 } from './test-utils/test-documents/diagram/index.js';
import { createCrossModelTestServices, parseSystemDiagram } from './test-utils/utils.js';

const services = createCrossModelTestServices();

describe('CrossModel language Diagram', () => {
   describe('Diagram without nodes and edges', () => {
      test('Simple file for diagram', async () => {
         const systemDiagram = await parseSystemDiagram({ services, text: diagram1 });
         expect(systemDiagram?.id).toBe('Systemdiagram1');
      });

      test('Diagram with indentation and dedentation error', async () => {
         await parseSystemDiagram({ services, text: diagram4 }, { parserErrors: 2 });
      });
   });

   describe('Diagram with nodes', () => {
      test('Simple file for diagram and nodes', async () => {
         const systemDiagram = await parseSystemDiagram({ services, text: diagram2 });

         expect(systemDiagram?.nodes).toHaveLength(1);
         const node1 = systemDiagram?.nodes[0];
         expect(node1?.id).toBe('CustomerNode');
         expect(isReference(node1?.entity)).toBe(true);
         expect(node1?.entity?.$refText).toBe('Customer');
         expect(node1?.x).toBe(100);
      });
   });

   describe('Diagram with relationship edges', () => {
      test('Simple file for diagram and relationship edges', async () => {
         const systemDiagram = await parseSystemDiagram({ services, text: diagram3 });

         expect(systemDiagram?.edges).toHaveLength(1);
         const edge1 = systemDiagram?.edges[0] as RelationshipEdge;
         expect(isRelationshipEdge(edge1)).toBe(true);
         expect(edge1?.id).toBe('OrderCustomerEdge');
         expect(isReference(edge1?.relationship)).toBe(true);
         expect(edge1?.relationship?.$refText).toBe('Order_Customer');
      });
   });

   describe('Diagram with nodes and relationship edges', () => {
      test('Simple file for diagram and relationship edges', async () => {
         const systemDiagram = await parseSystemDiagram({ services, text: diagram5 });

         expect(systemDiagram?.nodes).toHaveLength(1);
         const node1 = systemDiagram?.nodes[0];
         expect(node1?.id).toBe('CustomerNode');
         expect(isReference(node1?.entity)).toBe(true);
         expect(node1?.entity?.$refText).toBe('Customer');
         expect(node1?.x).toBe(100);

         expect(systemDiagram?.edges).toHaveLength(1);
         const edge1 = systemDiagram?.edges[0] as RelationshipEdge;
         expect(isRelationshipEdge(edge1)).toBe(true);
         expect(edge1?.id).toBe('OrderCustomerEdge');
         expect(isReference(edge1?.relationship)).toBe(true);
         expect(edge1?.relationship?.$refText).toBe('Order_Customer');
      });

      test('Simple file for diagram and edges, but edge source and target nodes are not specified', async () => {
         const systemDiagram = await parseSystemDiagram({ services, text: diagram6 }, { parserErrors: 1 });

         const node1 = systemDiagram?.nodes[0];

         expect(systemDiagram?.nodes).toHaveLength(1);
         expect(node1?.id).toBe('CustomerNode');
         expect(isReference(node1?.entity)).toBe(true);
         expect(node1?.entity?.$refText).toBe('Customer');
         expect(node1?.x).toBe(100);

         expect(systemDiagram?.edges).toHaveLength(1);
         const edge1 = systemDiagram?.edges[0] as RelationshipEdge;
         expect(isRelationshipEdge(edge1)).toBe(true);
         expect(edge1?.id).toBe('OrderCustomerEdge');
         expect(isReference(edge1?.relationship)).toBe(true);
         expect(edge1?.relationship?.$refText).toBe('Order_Customer');
      });

      describe('Diagram with nodes and inheritance edges', () => {
         test('Simple file for diagram and inheritance edges', async () => {
            const systemDiagram = await parseSystemDiagram({ services, text: diagram7 });

            expect(systemDiagram?.nodes).toHaveLength(2);

            const node1 = systemDiagram?.nodes[0];
            expect(node1?.id).toBe('CustomerNode');
            expect(isReference(node1?.entity)).toBe(true);
            expect(node1?.entity?.$refText).toBe('Customer');
            expect(node1?.x).toBe(100);

            const node2 = systemDiagram?.nodes[1];
            expect(node2?.id).toBe('SubCustomerNode');
            expect(isReference(node2?.entity)).toBe(true);
            expect(node2?.entity?.$refText).toBe('SubCustomer');
            expect(node2?.x).toBe(400);

            expect(systemDiagram?.edges).toHaveLength(1);
            const edge1 = systemDiagram?.edges[0] as InheritanceEdge;
            expect(isInheritanceEdge(edge1)).toBe(true);
            expect(edge1?.id).toBe('SubCustomerInheritanceEdge');
            expect(isReference(edge1?.baseNode)).toBe(true);
            expect(edge1?.baseNode?.$refText).toBe('SubCustomerNode');
            expect(isReference(edge1?.superNode)).toBe(true);
            expect(edge1?.superNode?.$refText).toBe('CustomerNode');
         });
      });
   });
});
