/********************************************************************************
 * Copyright (c) 2026 CrossBreeze.
 ********************************************************************************/

import { describe, expect, test } from '@jest/globals';

import { ModelFileExtensions } from '@crossmodel/protocol';
import { customer } from './test-utils/test-documents/entity/customer';
import { dataModelA, dataModelB } from './test-utils/test-documents/entity/datamodels';
import { createCrossModelTestServices, MockFileSystem, parseDocuments, parseLogicalEntity, testUri } from './test-utils/utils';

const services = createCrossModelTestServices(MockFileSystem);

describe('CrossModel Name Uniqueness Validation', () => {
   describe('Local Name Uniqueness - Within a Single File', () => {
      describe('LogicalEntity - Duplicate Attribute Names', () => {
         test('Should error on duplicate attribute names', async () => {
            const entityWithDuplicateAttributes = `entity:
    id: CustomerLocal1
    name: "Customer"
    attributes:
        - id: Id
          name: "Id"
          datatype: "Integer"
        - id: Name
          name: "Name"
          datatype: "Text"
        - id: DuplicateName
          name: "Name"
          datatype: "Text"`;

            const entity = await parseLogicalEntity({
               services,
               text: entityWithDuplicateAttributes,
               validation: true,
               documentUri: testUri('CustomerLocal1' + ModelFileExtensions.LogicalEntity)
            });

            expect(entity.attributes).toHaveLength(3);
            expect(entity.$document.diagnostics).toHaveLength(1);
            expect(entity.$document.diagnostics![0].message).toContain('Must provide a unique name');
         });

         test('Should NOT error on unique attribute names', async () => {
            const entityWithUniqueAttributes = `entity:
    id: CustomerLocal2
    name: "Customer"
    attributes:
        - id: Id
          name: "Id"
          datatype: "Integer"
        - id: Name
          name: "Name"
          datatype: "Text"
        - id: Email
          name: "Email"
          datatype: "Text"`;

            const entity = await parseLogicalEntity({
               services,
               text: entityWithUniqueAttributes,
               validation: true,
               documentUri: testUri('CustomerLocal2' + ModelFileExtensions.LogicalEntity)
            });

            expect(entity.attributes).toHaveLength(3);
            expect(entity.$document.diagnostics).toHaveLength(0);
         });

         test('Should error on case-insensitive duplicate names', async () => {
            const entityWithCaseDuplicates = `entity:
    id: CustomerLocal3
    name: "Customer"
    attributes:
        - id: Id
          name: "Name"
          datatype: "Text"
        - id: Name2
          name: "name"
          datatype: "Text"`;

            const entity = await parseLogicalEntity({
               services,
               text: entityWithCaseDuplicates,
               validation: true,
               documentUri: testUri('CustomerLocal3' + ModelFileExtensions.LogicalEntity)
            });

            expect(entity.attributes).toHaveLength(2);
            expect(entity.$document.diagnostics).toHaveLength(1);
            expect(entity.$document.diagnostics![0].message).toContain('Must provide a unique name');
         });
      });

      describe('LogicalEntity - Duplicate Identifier Names', () => {
         test('Should error on duplicate identifier names', async () => {
            const entityWithDuplicateIdentifiers = `entity:
    id: CustomerLocal4
    name: "Customer"
    attributes:
        - id: Id
          name: "Id"
          datatype: "Integer"
        - id: Name
          name: "Name"
          datatype: "Text"
    identifiers:
        - id: PK
          name: "PrimaryKey"
          primary: true
          attributes:
              - Id
        - id: AK
          name: "PrimaryKey"
          attributes:
              - Name`;

            const entity = await parseLogicalEntity({
               services,
               text: entityWithDuplicateIdentifiers,
               validation: true,
               documentUri: testUri('CustomerLocal4' + ModelFileExtensions.LogicalEntity)
            });

            expect(entity.identifiers).toHaveLength(2);
            expect(entity.$document.diagnostics).toHaveLength(1);
            expect(entity.$document.diagnostics![0].message).toContain('Must provide a unique name');
         });
      });
   });

   describe('Global Name Uniqueness - Across Files in Same DataModel', () => {
      describe('Duplicate Entity Names', () => {
         test('Should warn on duplicate entity names in same data model', async () => {
            const dmUri = testUri('TestDataModel', 'datamodel.cm');
            const e1Uri = testUri('TestDataModel', 'Customer' + ModelFileExtensions.LogicalEntity);
            const e2Uri = testUri('TestDataModel', 'CustomerDuplicate' + ModelFileExtensions.LogicalEntity);

            await parseDocuments(
               { services, text: dataModelA, documentUri: dmUri },
               { services, text: customer, documentUri: e1Uri }
            );

            await services.shared.workspace.DataModelManager.initialize([{ uri: dmUri, name: 'DataModelA' }]);

            const entity2 = await parseLogicalEntity({
               services,
               text: `entity:
    id: CustomerDuplicate
    name: "Customer"`,
               validation: true,
               documentUri: e2Uri
            });

            expect(entity2.$document.diagnostics).toHaveLength(1);
            expect(entity2.$document.diagnostics![0].message).toContain('must be unique within the data model');
         });

         test('Should NOT warn on same entity names in different data models', async () => {
            const dm1Uri = testUri('DataModel1', 'datamodel.cm');
            const dm2Uri = testUri('DataModel2', 'datamodel.cm');
            const e1Uri = testUri('DataModel1', 'CustomerDiff1' + ModelFileExtensions.LogicalEntity);
            const e2Uri = testUri('DataModel2', 'CustomerDiff2' + ModelFileExtensions.LogicalEntity);

            await parseDocuments(
               { services, text: dataModelA, documentUri: dm1Uri },
               {
                  services,
                  text: `entity:
    id: CustomerDiff1
    name: "Customer"`,
                  documentUri: e1Uri
               },
               { services, text: dataModelB, documentUri: dm2Uri }
            );

            await services.shared.workspace.DataModelManager.initialize([
               { uri: dm1Uri, name: 'DataModelA' },
               { uri: dm2Uri, name: 'DataModelB' }
            ]);

            const entity2 = await parseLogicalEntity({
               services,
               text: `entity:
    id: CustomerDiff2
    name: "Customer"`,
               validation: true,
               documentUri: e2Uri
            });

            expect(entity2.$document.diagnostics).toHaveLength(0);
         });
      });
   });
});
