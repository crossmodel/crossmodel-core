/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import * as transfer from '@crossmodel/protocol';
import { beforeAll, describe, expect, test } from '@jest/globals';
import { Reference, URI } from 'langium';

import _ from 'lodash';
import { CrossModelRoot, LogicalEntity, Relationship } from '../../../src/language-server/ast';
import { CrossModelSerializer } from '../../../src/language-server/cross-model-serializer';
import { customer } from '../test-utils/test-documents/entity/customer';
import { sub_customer } from '../test-utils/test-documents/entity/sub_customer';
import { sub_customer_cycle } from '../test-utils/test-documents/entity/sub_customer_cycle';
import { sub_customer_multi } from '../test-utils/test-documents/entity/sub_customer_multi';
import { test_mapping } from '../test-utils/test-documents/mappings/test_mapping';
import {
   createCrossModelTestServices,
   createEntityNode,
   createLogicalEntity,
   createLogicalEntityAttribute,
   createRelationship,
   createRelationshipEdge,
   createSystemDiagram,
   entityDocumentUri,
   mappingDocumentUri,
   parseDocuments,
   parseLogicalEntity,
   parseMapping
} from '../test-utils/utils';

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
            createLogicalEntityAttribute(crossModelRoot.entity, 'Attribute1', 'Attribute 1'),
            createLogicalEntityAttribute(crossModelRoot.entity, 'Attribute2', 'Attribute 2')
         ];

         crossModelRootWithAttributesDifPlace = { $type: 'CrossModelRoot' };
         crossModelRootWithAttributesDifPlace.entity = createLogicalEntity(crossModelRoot, 'testId', 'test Name', {
            description: 'Test description'
         });
         crossModelRootWithAttributesDifPlace.entity.attributes = [
            createLogicalEntityAttribute(crossModelRoot.entity, 'Attribute1', 'Attribute 1'),
            createLogicalEntityAttribute(crossModelRoot.entity, 'Attribute2', 'Attribute 2')
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
            createRelationshipEdge(
               crossModelRoot.systemDiagram,
               'Edge1',
               ref3,
               { $refText: 'A', ref: undefined },
               { $refText: 'B', ref: undefined }
            )
         ];
      });

      test('serialize entity with attributes', () => {
         const parseResult = serializer.serialize(crossModelRoot);
         expect(parseResult).toBe(expected_result5);
      });
   });

   describe('Serialize mapping', () => {
      test('serialize mapping with sources, dependencies, conditions, and attribute mappings', async () => {
         const mapping = await parseMapping({
            services,
            text: test_mapping,
            documentUri: mappingDocumentUri('test_mapping')
         });
         const root = mapping.$document.parseResult.value;
         const parseResult = serializer.serialize(root);
         expect(parseResult).toBe(test_mapping);
      });
   });

   describe('Serialize entity with inheritance', () => {
      const customerDocumentUri = entityDocumentUri('customer');
      const subCustomerDocumentUri = entityDocumentUri('sub_customer');

      beforeAll(async () => {
         await parseDocuments(
            { services, text: customer, documentUri: customerDocumentUri },
            { services, text: sub_customer, documentUri: subCustomerDocumentUri }
         );
      });

      test('Single inheritance', async () => {
         const document = services.shared.workspace.LangiumDocuments.getDocument(URI.parse(subCustomerDocumentUri));
         expect(document).toBeDefined();
         const root = document!.parseResult.value as CrossModelRoot;
         const subCustomer = root.entity;
         expect(subCustomer).toBeDefined();
         expect(subCustomer!.inherits).toHaveLength(1);
         expect(subCustomer!.inherits[0].$refText).toBe('Customer');
      });

      test('Multiple inheritance', async () => {
         const subCustomer = await parseLogicalEntity({
            services,
            text: sub_customer_multi,
            documentUri: entityDocumentUri('sub_customer_multi')
         });
         expect(subCustomer.inherits).toHaveLength(2);
         expect(subCustomer.inherits[0].$refText).toBe('Customer');
         expect(subCustomer.inherits[1].$refText).toBe('SubCustomer');
      });

      test('Inheritance Cycle', async () => {
         services.shared.workspace.LangiumDocuments.deleteDocument(URI.parse(customerDocumentUri));
         const newCustomer = await parseLogicalEntity({
            services,
            text: sub_customer_cycle,
            documentUri: customerDocumentUri,
            validation: true
         });
         expect(newCustomer.$document.diagnostics).toBeDefined();
         expect(newCustomer.$document.diagnostics).toEqual(
            expect.arrayContaining([
               expect.objectContaining({ message: 'Inheritance cycle detected: Customer -> SubCustomer -> Customer.' })
            ])
         );
      });
   });

   describe('Serialize transfer model', () => {
      // These tests verify the serializer handles transfer model objects (plain objects
      // with string references instead of Langium Reference objects).

      test('entity with attributes', () => {
         const root: transfer.CrossModelRoot = {
            $type: 'CrossModelRoot',
            entity: {
               $type: 'LogicalEntity',
               id: 'testId',
               name: 'test Name',
               description: 'Test description',
               attributes: [
                  { $type: 'LogicalEntityAttribute', id: 'Attribute1', name: 'Attribute 1', mandatory: false, customProperties: [] },
                  { $type: 'LogicalEntityAttribute', id: 'Attribute2', name: 'Attribute 2', mandatory: false, customProperties: [] }
               ],
               identifiers: [],
               inherits: [],
               customProperties: []
            }
         };
         expect(serializer.serialize(root)).toBe(expected_result);
      });

      test('relationship with string references', () => {
         const root: transfer.CrossModelRoot = {
            $type: 'CrossModelRoot',
            relationship: {
               $type: 'Relationship',
               id: 'testId',
               name: 'test Name',
               description: 'Test description',
               parent: 'Ref1',
               child: 'Ref2',
               attributes: [],
               customProperties: []
            }
         };
         expect(serializer.serialize(root)).toBe(expected_result4);
      });

      test('entity with string inheritance references', () => {
         const root: transfer.CrossModelRoot = {
            $type: 'CrossModelRoot',
            entity: {
               $type: 'LogicalEntity',
               id: 'SubCustomer',
               name: 'Sub Customer',
               inherits: ['Customer', 'OtherEntity'],
               attributes: [],
               identifiers: [],
               customProperties: []
            }
         };
         expect(serializer.serialize(root)).toBe(expected_transfer_inheritance);
      });

      test('diagram with string references', () => {
         const root: transfer.CrossModelRoot = {
            $type: 'CrossModelRoot',
            systemDiagram: {
               $type: 'SystemDiagram',
               id: 'testId',
               nodes: [
                  { $type: 'LogicalEntityNode', id: 'Node1', entity: 'Ref1', x: 100, y: 101, width: 102, height: 102, _attributes: [] },
                  { $type: 'LogicalEntityNode', id: 'Node2', entity: 'Ref2', x: 100, y: 101, width: 102, height: 102, _attributes: [] }
               ],
               edges: [
                  {
                     $type: 'RelationshipEdge',
                     id: 'Edge1',
                     relationship: 'Ref3',
                     sourceNode: 'A',
                     targetNode: 'B'
                  } as transfer.RelationshipEdge
               ]
            }
         };
         expect(serializer.serialize(root)).toBe(expected_result5);
      });

      test('mapping with string references, dependencies, conditions, and attribute mappings', () => {
         const root: transfer.CrossModelRoot = {
            $type: 'CrossModelRoot',
            mapping: {
               $type: 'Mapping',
               id: 'TestMapping',
               sources: [
                  {
                     $type: 'SourceObject',
                     id: 'CustomerSource',
                     entity: 'Customer',
                     join: 'from',
                     dependencies: [],
                     conditions: [],
                     customProperties: [],
                     _attributes: []
                  },
                  {
                     $type: 'SourceObject',
                     id: 'OrderSource',
                     entity: 'Order',
                     join: 'inner-join',
                     dependencies: [{ $type: 'SourceObjectDependency', source: 'CustomerSource' }],
                     conditions: [
                        {
                           $type: 'JoinCondition',
                           expression: {
                              $type: 'BinaryExpression',
                              left: { $type: 'SourceObjectAttributeReference', value: 'OrderSource.CustomerId' },
                              op: '=',
                              right: { $type: 'SourceObjectAttributeReference', value: 'CustomerSource.Id' }
                           }
                        }
                     ],
                     customProperties: [],
                     _attributes: []
                  }
               ],
               target: {
                  $type: 'TargetObject',
                  entity: 'TargetEntity',
                  mappings: [
                     {
                        $type: 'AttributeMapping',
                        attribute: { $type: 'AttributeMappingTarget', value: 'Name' },
                        sources: [
                           { $type: 'AttributeMappingSource', value: 'CustomerSource.FirstName' },
                           { $type: 'AttributeMappingSource', value: 'CustomerSource.LastName' }
                        ],
                        expressions: [
                           {
                              $type: 'AttributeMappingExpression',
                              language: 'SQL',
                              expression: "CONCAT({{CustomerSource.FirstName}}, ' ', {{CustomerSource.LastName}})"
                           }
                        ],
                        customProperties: []
                     },
                     {
                        $type: 'AttributeMapping',
                        attribute: { $type: 'AttributeMappingTarget', value: 'OrderCount' },
                        sources: [],
                        expressions: [{ $type: 'AttributeMappingExpression', language: 'SQL', expression: 'COUNT(1)' }],
                        customProperties: []
                     }
                  ],
                  customProperties: [],
                  _id: undefined,
                  _attributes: []
               },
               customProperties: []
            }
         };
         expect(serializer.serialize(root)).toBe(test_mapping);
      });

      test('relationship with cardinalities and roles', () => {
         const root: transfer.CrossModelRoot = {
            $type: 'CrossModelRoot',
            relationship: {
               $type: 'Relationship',
               id: 'OrderCustomerRel',
               name: 'Order Customer',
               parent: 'Customer',
               parentRole: 'customer',
               parentCardinality: '1..1',
               child: 'Order',
               childRole: 'orders',
               childCardinality: '0..N',
               attributes: [{ $type: 'RelationshipAttribute', parent: 'Id', child: 'CustomerId', customProperties: [] }],
               customProperties: []
            }
         };
         expect(serializer.serialize(root)).toBe(expected_transfer_relationship_full);
      });

      test('entity with identifiers containing string reference arrays', () => {
         const root: transfer.CrossModelRoot = {
            $type: 'CrossModelRoot',
            entity: {
               $type: 'LogicalEntity',
               id: 'Customer',
               name: 'Customer',
               attributes: [
                  { $type: 'LogicalEntityAttribute', id: 'Id', name: 'Id', datatype: 'Integer', mandatory: false, customProperties: [] },
                  { $type: 'LogicalEntityAttribute', id: 'Name', name: 'Name', datatype: 'Varchar', mandatory: false, customProperties: [] }
               ],
               identifiers: [
                  {
                     $type: 'LogicalIdentifier',
                     id: 'PK',
                     name: 'Primary Key',
                     primary: false,
                     attributes: ['Id'],
                     customProperties: []
                  }
               ],
               inherits: [],
               customProperties: []
            }
         };
         expect(serializer.serialize(root)).toBe(expected_transfer_entity_with_identifiers);
      });

      test('join condition with StringLiteral', () => {
         const root: transfer.CrossModelRoot = {
            $type: 'CrossModelRoot',
            mapping: {
               $type: 'Mapping',
               id: 'FilterMapping',
               sources: [
                  {
                     $type: 'SourceObject',
                     id: 'CustomerSource',
                     entity: 'Customer',
                     join: 'from',
                     dependencies: [],
                     conditions: [
                        {
                           $type: 'JoinCondition',
                           expression: {
                              $type: 'BinaryExpression',
                              left: { $type: 'SourceObjectAttributeReference', value: 'CustomerSource.Status' },
                              op: '=',
                              right: { $type: 'StringLiteral', value: 'Active' }
                           }
                        }
                     ],
                     customProperties: [],
                     _attributes: []
                  }
               ],
               target: {
                  $type: 'TargetObject',
                  entity: 'TargetEntity',
                  mappings: [],
                  customProperties: [],
                  _id: undefined,
                  _attributes: []
               },
               customProperties: []
            }
         };
         expect(serializer.serialize(root)).toBe(expected_mapping_string_literal);
      });

      test('join condition with NumberLiteral', () => {
         const root: transfer.CrossModelRoot = {
            $type: 'CrossModelRoot',
            mapping: {
               $type: 'Mapping',
               id: 'ThresholdMapping',
               sources: [
                  {
                     $type: 'SourceObject',
                     id: 'OrderSource',
                     entity: 'Order',
                     join: 'from',
                     dependencies: [],
                     conditions: [
                        {
                           $type: 'JoinCondition',
                           expression: {
                              $type: 'BinaryExpression',
                              left: { $type: 'SourceObjectAttributeReference', value: 'OrderSource.Amount' },
                              op: '>',
                              right: { $type: 'NumberLiteral', value: 100 }
                           }
                        }
                     ],
                     customProperties: [],
                     _attributes: []
                  }
               ],
               target: {
                  $type: 'TargetObject',
                  entity: 'TargetEntity',
                  mappings: [],
                  customProperties: [],
                  _id: undefined,
                  _attributes: []
               },
               customProperties: []
            }
         };
         expect(serializer.serialize(root)).toBe(expected_mapping_number_literal);
      });

      test('join condition with non-equals operator', () => {
         const root: transfer.CrossModelRoot = {
            $type: 'CrossModelRoot',
            mapping: {
               $type: 'Mapping',
               id: 'CompareMapping',
               sources: [
                  {
                     $type: 'SourceObject',
                     id: 'OrderSource',
                     entity: 'Order',
                     join: 'from',
                     dependencies: [],
                     conditions: [
                        {
                           $type: 'JoinCondition',
                           expression: {
                              $type: 'BinaryExpression',
                              left: { $type: 'SourceObjectAttributeReference', value: 'OrderSource.Status' },
                              op: '!=',
                              right: { $type: 'StringLiteral', value: 'Cancelled' }
                           }
                        }
                     ],
                     customProperties: [],
                     _attributes: []
                  }
               ],
               target: {
                  $type: 'TargetObject',
                  entity: 'TargetEntity',
                  mappings: [],
                  customProperties: [],
                  _id: undefined,
                  _attributes: []
               },
               customProperties: []
            }
         };
         expect(serializer.serialize(root)).toBe(expected_mapping_not_equals);
      });

      test('data model with type, version, and dependencies', () => {
         const root: transfer.CrossModelRoot = {
            $type: 'CrossModelRoot',
            datamodel: {
               $type: 'DataModel',
               id: 'CustomerModel',
               name: 'Customer Model',
               description: 'Logical customer data model',
               type: 'logical',
               version: '1.0.0',
               dependencies: [{ $type: 'DataModelDependency', datamodel: 'BaseModel', version: '2.0.0' }],
               customProperties: []
            }
         };
         expect(serializer.serialize(root)).toBe(expected_data_model);
      });

      test('entity with custom properties', () => {
         const root: transfer.CrossModelRoot = {
            $type: 'CrossModelRoot',
            entity: {
               $type: 'LogicalEntity',
               id: 'Customer',
               name: 'Customer',
               attributes: [],
               identifiers: [],
               inherits: [],
               customProperties: [
                  { $type: 'CustomProperty', id: 'source', name: 'Source System', value: 'SAP' },
                  { $type: 'CustomProperty', id: 'owner', name: 'Data Owner' }
               ]
            }
         };
         expect(serializer.serialize(root)).toBe(expected_entity_with_custom_properties);
      });

      test('entity attribute with optional numeric fields and mandatory true', () => {
         const root: transfer.CrossModelRoot = {
            $type: 'CrossModelRoot',
            entity: {
               $type: 'LogicalEntity',
               id: 'Product',
               name: 'Product',
               attributes: [
                  {
                     $type: 'LogicalEntityAttribute',
                     id: 'Price',
                     name: 'Price',
                     datatype: 'Decimal',
                     length: 10,
                     precision: 2,
                     mandatory: true,
                     customProperties: []
                  },
                  {
                     $type: 'LogicalEntityAttribute',
                     id: 'Code',
                     name: 'Code',
                     datatype: 'Varchar',
                     length: 50,
                     scale: 0,
                     mandatory: false,
                     customProperties: []
                  }
               ],
               identifiers: [],
               inherits: [],
               customProperties: []
            }
         };
         expect(serializer.serialize(root)).toBe(expected_entity_with_attribute_fields);
      });

      test('diagram with inheritance edge', () => {
         const root: transfer.CrossModelRoot = {
            $type: 'CrossModelRoot',
            systemDiagram: {
               $type: 'SystemDiagram',
               id: 'TestDiagram',
               nodes: [
                  {
                     $type: 'LogicalEntityNode',
                     id: 'BaseNode',
                     entity: 'BaseEntity',
                     x: 0,
                     y: 0,
                     width: 100,
                     height: 100,
                     _attributes: []
                  },
                  { $type: 'LogicalEntityNode', id: 'SubNode', entity: 'SubEntity', x: 200, y: 0, width: 100, height: 100, _attributes: [] }
               ],
               edges: [
                  {
                     $type: 'InheritanceEdge',
                     id: 'InhEdge1',
                     baseNode: 'BaseNode',
                     superNode: 'SubNode'
                  } as transfer.InheritanceEdge
               ]
            }
         };
         expect(serializer.serialize(root)).toBe(expected_diagram_with_inheritance);
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

const expected_transfer_inheritance = `entity:
    id: SubCustomer
    name: "Sub Customer"
    inherits:
      - Customer
      - OtherEntity`;

const expected_transfer_relationship_full = `relationship:
    id: OrderCustomerRel
    name: "Order Customer"
    parent: Customer
    parentRole: "customer"
    parentCardinality: 1..1
    child: Order
    childRole: "orders"
    childCardinality: 0..N
    attributes:
      - parent: Id
        child: CustomerId`;

const expected_transfer_entity_with_identifiers = `entity:
    id: Customer
    name: "Customer"
    attributes:
      - id: Id
        name: "Id"
        datatype: "Integer"
      - id: Name
        name: "Name"
        datatype: "Varchar"
    identifiers:
      - id: PK
        name: "Primary Key"
        attributes:
          - Id`;

const expected_mapping_string_literal = `mapping:
    id: FilterMapping
    sources:
      - id: CustomerSource
        entity: Customer
        join: from
        conditions:
          - CustomerSource.Status = "Active"
    target:
        entity: TargetEntity`;

const expected_mapping_number_literal = `mapping:
    id: ThresholdMapping
    sources:
      - id: OrderSource
        entity: Order
        join: from
        conditions:
          - OrderSource.Amount > 100
    target:
        entity: TargetEntity`;

const expected_mapping_not_equals = `mapping:
    id: CompareMapping
    sources:
      - id: OrderSource
        entity: Order
        join: from
        conditions:
          - OrderSource.Status != "Cancelled"
    target:
        entity: TargetEntity`;

const expected_data_model = `datamodel:
    id: CustomerModel
    name: "Customer Model"
    description: "Logical customer data model"
    type: logical
    version: 1.0.0
    dependencies:
      - datamodel: BaseModel
        version: 2.0.0`;

const expected_entity_with_custom_properties = `entity:
    id: Customer
    name: "Customer"
    customProperties:
      - id: source
        name: "Source System"
        value: "SAP"
      - id: owner
        name: "Data Owner"`;

const expected_entity_with_attribute_fields = `entity:
    id: Product
    name: "Product"
    attributes:
      - id: Price
        name: "Price"
        datatype: "Decimal"
        length: 10
        precision: 2
        mandatory: true
      - id: Code
        name: "Code"
        datatype: "Varchar"
        length: 50
        scale: 0`;

const expected_diagram_with_inheritance = `systemDiagram:
    id: TestDiagram
    nodes:
      - id: BaseNode
        entity: BaseEntity
        x: 0
        y: 0
        width: 100
        height: 100
      - id: SubNode
        entity: SubEntity
        x: 200
        y: 0
        width: 100
        height: 100
    edges:
      - id: InhEdge1
        baseNode: BaseNode
        superNode: SubNode`;
