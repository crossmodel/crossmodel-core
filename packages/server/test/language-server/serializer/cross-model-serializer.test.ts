/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { beforeAll, describe, expect, test } from '@jest/globals';
import { Reference, URI } from 'langium';

import _ from 'lodash';
import { CrossModelSerializer } from '../../../src/language-server/cross-model-serializer.js';
import { CrossModelRoot, LogicalEntity, Relationship } from '../../../src/language-server/generated/ast.js';
import {
   createEntityNode,
   createLogicalAttribute,
   createLogicalEntity,
   createRelationship,
   createRelationshipEdge,
   createSystemDiagram
} from '../../../src/language-server/util/ast-util.js';
import { customer } from '../test-utils/test-documents/entity/customer.js';
import { sub_customer } from '../test-utils/test-documents/entity/sub_customer.js';
import { sub_customer_cycle } from '../test-utils/test-documents/entity/sub_customer_cycle.js';
import { sub_customer_multi } from '../test-utils/test-documents/entity/sub_customer_multi.js';
import { createCrossModelTestServices, parseDocuments, parseLogicalEntity, testUri } from '../test-utils/utils.js';

const services = createCrossModelTestServices();

describe('CrossModelLexer', () => {
   let serializer: CrossModelSerializer;

   beforeAll(() => {
      serializer = services.serializer.Serializer;
   });

   describe('Serialize entity', () => {
      let crossModelRoot: CrossModelRoot;
      let crossModelRootWithoutAttributes: CrossModelRoot;
      let crossModelRootWithAttributesDifPlace: CrossModelRoot;

      beforeAll(() => {
         crossModelRoot = { $type: 'CrossModelRoot' };
         crossModelRoot.entity = createLogicalEntity(crossModelRoot, 'testId', 'test Name', {
            description: 'Test description'
         });

         crossModelRootWithoutAttributes = _.cloneDeep(crossModelRoot);

         crossModelRoot.entity.attributes = [
            createLogicalAttribute(crossModelRoot.entity, 'Attribute1', 'Attribute 1'),
            createLogicalAttribute(crossModelRoot.entity, 'Attribute2', 'Attribute 2')
         ];

         crossModelRootWithAttributesDifPlace = { $type: 'CrossModelRoot' };
         crossModelRootWithAttributesDifPlace.entity = createLogicalEntity(crossModelRoot, 'testId', 'test Name', {
            description: 'Test description'
         });
         crossModelRootWithAttributesDifPlace.entity.attributes = [
            createLogicalAttribute(crossModelRoot.entity, 'Attribute1', 'Attribute 1'),
            createLogicalAttribute(crossModelRoot.entity, 'Attribute2', 'Attribute 2')
         ];
      });

      test('serialize entity with attributes', () => {
         const parseResult = serializer.serialize(crossModelRoot);
         expect(parseResult).toBe(expected_result);
      });

      test('serialize entity without attributes', () => {
         const parseResult = serializer.serialize(crossModelRootWithoutAttributes);
         expect(parseResult).toBe(expected_result2);
      });

      test('serialize entity with attributes in different place', () => {
         const parseResult = serializer.serialize(crossModelRootWithAttributesDifPlace);
         expect(parseResult).toBe(expected_result3);
      });
   });

   describe('Serialize relationship', () => {
      let crossModelRoot: CrossModelRoot;

      beforeAll(() => {
         crossModelRoot = {
            $type: 'CrossModelRoot'
         };

         const ref1: Reference<LogicalEntity> = {
            $refText: 'Ref1',
            ref: createLogicalEntity(crossModelRoot, 'Ref1', 'test Name', {
               description: 'Test description'
            })
         };

         const ref2: Reference<LogicalEntity> = {
            $refText: 'Ref2',
            ref: createLogicalEntity(crossModelRoot, 'Ref2', 'test Name', {
               description: 'Test description'
            })
         };

         crossModelRoot.relationship = createRelationship(crossModelRoot, 'testId', 'test Name', ref1, ref2, {
            description: 'Test description'
         });
      });

      test('serialize entity with attributes', () => {
         const parseResult = serializer.serialize(crossModelRoot);
         expect(parseResult).toBe(expected_result4);
      });
   });

   describe('Serialize diagram', () => {
      let crossModelRoot: CrossModelRoot;

      beforeAll(() => {
         crossModelRoot = {
            $type: 'CrossModelRoot'
         };

         const ref1: Reference<LogicalEntity> = {
            $refText: 'Ref1',
            ref: createLogicalEntity(crossModelRoot, 'Ref1', 'test Name', {
               description: 'Test description'
            })
         };

         const ref2: Reference<LogicalEntity> = {
            $refText: 'Ref2',
            ref: createLogicalEntity(crossModelRoot, 'Ref2', 'test Name', {
               description: 'Test description'
            })
         };

         const ref3: Reference<Relationship> = {
            $refText: 'Ref3',
            ref: createRelationship(crossModelRoot, 'testId', 'test Name', ref1, ref2, {
               description: 'Test description'
            })
         };

         crossModelRoot.systemDiagram = createSystemDiagram(crossModelRoot, 'testId');

         crossModelRoot.systemDiagram.nodes = [
            createEntityNode(crossModelRoot.systemDiagram, 'Node1', ref1, { x: 100, y: 101 }, { width: 102, height: 102 }),
            createEntityNode(crossModelRoot.systemDiagram, 'Node2', ref2, { x: 100, y: 101 }, { width: 102, height: 102 })
         ];

         crossModelRoot.systemDiagram.edges = [
            createRelationshipEdge(crossModelRoot.systemDiagram, 'Edge1', ref3, { $refText: 'A' }, { $refText: 'B' })
         ];
      });

      test('serialize entity with attributes', () => {
         const parseResult = serializer.serialize(crossModelRoot);
         expect(parseResult).toBe(expected_result5);
      });
   });

   describe('Serialize entity with inheritance', () => {
      const customerDocumentUri = testUri('customer');

      beforeAll(async () => {
         await parseDocuments({ services, text: customer, documentUri: customerDocumentUri });
      });

      test('Single inheritance', async () => {
         const subCustomer = await parseLogicalEntity({ services, text: sub_customer });
         expect(subCustomer.superEntities).toHaveLength(1);
         expect(subCustomer.superEntities[0].$refText).toBe('Customer');
      });

      test('Multiple inheritance', async () => {
         const subCustomer = await parseLogicalEntity({ services, text: sub_customer_multi });
         expect(subCustomer.superEntities).toHaveLength(2);
         expect(subCustomer.superEntities[0].$refText).toBe('Customer');
         expect(subCustomer.superEntities[1].$refText).toBe('SubCustomer');
      });

      test('Inheritance Cycle', async () => {
         services.shared.workspace.LangiumDocuments.deleteDocument(URI.parse(customerDocumentUri));
         const newCustomer = await parseLogicalEntity({ services, text: sub_customer_cycle, documentUri: 'customer', validation: true });
         expect(newCustomer.$document.diagnostics).toBeDefined();
         expect(newCustomer.$document.diagnostics).toEqual(
            expect.arrayContaining([
               expect.objectContaining({ message: 'Inheritance cycle detected: Customer -> SubCustomer -> Customer.' })
            ])
         );
      });
   });
});

const expected_result = `entity:
    id: testId
    name: "test Name"
    description: "Test description"
    attributes:
      - id: Attribute1
        name: "Attribute 1"
      - id: Attribute2
        name: "Attribute 2"`;
const expected_result2 = `entity:
    id: testId
    name: "test Name"
    description: "Test description"`;
const expected_result3 = `entity:
    id: testId
    name: "test Name"
    description: "Test description"
    attributes:
      - id: Attribute1
        name: "Attribute 1"
      - id: Attribute2
        name: "Attribute 2"`;

const expected_result4 = `relationship:
    id: testId
    name: "test Name"
    description: "Test description"
    parent: Ref1
    child: Ref2`;
const expected_result5 = `systemDiagram:
    id: testId
    nodes:
      - id: Node1
        entity: Ref1
        x: 100
        y: 101
        width: 102
        height: 102
      - id: Node2
        entity: Ref2
        x: 100
        y: 101
        width: 102
        height: 102
    edges:
      - id: Edge1
        relationship: Ref3
        sourceNode: A
        targetNode: B`;
