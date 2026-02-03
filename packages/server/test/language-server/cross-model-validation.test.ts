/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { describe, expect, test } from '@jest/globals';
import { URI } from 'langium';
import { createCrossModelTestServices, MockFileSystem, parseDocument, parseDocuments, testUri } from './test-utils/utils';

const services = createCrossModelTestServices(MockFileSystem);

describe('CrossModel Validation - ID and Name Uniqueness', () => {
   describe('DataModel Global Uniqueness', () => {
      test('should error on duplicate DataModel IDs across workspace', async () => {
         const dm1Uri = testUri('dm1', 'datamodel.cm');
         const dm2Uri = testUri('dm2', 'datamodel.cm');

         // Parse both documents first
         await parseDocuments(
            {
               services,
               text: `datamodel:
    id: DuplicateID
    name: "DataModel One"
    type: logical
    version: 1.0.0`,
               documentUri: dm1Uri
            },
            {
               services,
               text: `datamodel:
    id: DuplicateID
    name: "DataModel Two"
    type: logical
    version: 1.0.0`,
               documentUri: dm2Uri
            }
         );

         // Initialize DataModelManager with both folders
         await services.shared.workspace.DataModelManager.initialize([
            { uri: dm1Uri, name: 'dm1' },
            { uri: dm2Uri, name: 'dm2' }
         ]);

         // Get the documents and trigger validation
         const doc1 = services.shared.workspace.LangiumDocuments.getDocument(URI.parse(dm1Uri));
         const doc2 = services.shared.workspace.LangiumDocuments.getDocument(URI.parse(dm2Uri));

         if (!doc1 || !doc2) {
            throw new Error('Documents not found');
         }

         // Rebuild with validation
         await services.shared.workspace.DocumentBuilder.build([doc1, doc2], { validation: true });

         const diagnostics1 = doc1.diagnostics ?? [];
         const diagnostics2 = doc2.diagnostics ?? [];

         // Should have duplicate ID error in at least one document (global scope validation)
         const idDuplicateErrors1 = diagnostics1.filter(d => d.message.includes('Must provide a unique id'));
         const idDuplicateErrors2 = diagnostics2.filter(d => d.message.includes('Must provide a unique id'));
         expect(idDuplicateErrors1.length + idDuplicateErrors2.length).toBeGreaterThan(0);
      });

      test('should NOT error on unique DataModel IDs', async () => {
         const dm1Uri = testUri('dm3', 'datamodel.cm');
         const dm2Uri = testUri('dm4', 'datamodel.cm');

         // Parse both documents first
         await parseDocuments(
            {
               services,
               text: `datamodel:
    id: UniqueOne
    name: "DataModel One"
    type: logical
    version: 1.0.0`,
               documentUri: dm1Uri
            },
            {
               services,
               text: `datamodel:
    id: UniqueTwo
    name: "DataModel Two"
    type: logical
    version: 1.0.0`,
               documentUri: dm2Uri
            }
         );

         // Initialize DataModelManager with both folders
         await services.shared.workspace.DataModelManager.initialize([
            { uri: dm1Uri, name: 'dm3' },
            { uri: dm2Uri, name: 'dm4' }
         ]);

         // Get the documents and trigger validation
         const doc1 = services.shared.workspace.LangiumDocuments.getDocument(URI.parse(dm1Uri));
         const doc2 = services.shared.workspace.LangiumDocuments.getDocument(URI.parse(dm2Uri));

         if (!doc1 || !doc2) {
            throw new Error('Documents not found');
         }

         // Rebuild with validation
         await services.shared.workspace.DocumentBuilder.build([doc1, doc2], { validation: true });

         const diagnostics1 = doc1.diagnostics ?? [];
         const diagnostics2 = doc2.diagnostics ?? [];
         const idErrors1 = diagnostics1.filter(d => d.message.includes('Must provide a unique id'));
         const idErrors2 = diagnostics2.filter(d => d.message.includes('Must provide a unique id'));

         // No duplicate ID errors when IDs are different
         expect(idErrors1.length + idErrors2.length).toBe(0);
      });
   });

   describe('Positive Tests - Valid Models', () => {
      test('should allow different attribute names within an entity', async () => {
         const text = `
logical datamodel TestModel
   entity Customer
      attributes
         Id: Id
            datatype: Integer
         Name: Name
            datatype: Text
         `;
         const document = await parseDocument({
            services,
            text,
            documentUri: testUri('test-unique-attr-names.cm')
         });

         const diagnostics = document.diagnostics ?? [];
         const nameDuplicateErrors = diagnostics.filter(d => d.message.includes('Must provide a unique name'));
         expect(nameDuplicateErrors.length).toBe(0);
      });

      test('should allow different entity names within a DataModel', async () => {
         const text = `
logical datamodel TestModel
   entity Customer
      attributes
         id: Id
            datatype: Integer
   
   entity Order
      attributes
         id: Id
            datatype: Integer
         `;
         const document = await parseDocument({
            services,
            text,
            documentUri: testUri('test-unique-entity-names.cm')
         });

         const diagnostics = document.diagnostics ?? [];
         const nameDuplicateErrors = diagnostics.filter(d => d.message.includes('Must provide a unique name'));
         expect(nameDuplicateErrors.length).toBe(0);
      });

      test('should allow attributes with same name in different entities', async () => {
         const text = `
logical datamodel TestModel
   entity Customer
      attributes
         id: Id
            datatype: Integer
         name: Name
            datatype: Text
   
   entity Order
      attributes
         id: Id
            datatype: Integer
         name: Name
            datatype: Text
         `;
         const document = await parseDocument({
            services,
            text,
            documentUri: testUri('test-attr-names-different-entities.cm')
         });

         const diagnostics = document.diagnostics ?? [];
         const nameDuplicateErrors = diagnostics.filter(d => d.message.includes('Must provide a unique name'));
         // Should have no duplicate name errors within same entity scope
         expect(nameDuplicateErrors.length).toBe(0);
      });

      test('should allow entity and relationship with same name (different types)', async () => {
         const text = `
logical datamodel TestModel
   entity Customer
      attributes
         id: Id
            datatype: Integer
   
   entity Order
      attributes
         id: Id
            datatype: Integer
   
   relationship Customer
      parent: Order
      child: Customer
         `;
         const document = await parseDocument({
            services,
            text,
            documentUri: testUri('test-entity-relationship-same-name.cm')
         });

         const diagnostics = document.diagnostics ?? [];
         const nameDuplicateErrors = diagnostics.filter(d => d.message.includes('Must provide a unique name'));
         // Should have no duplicate name errors since they are different types
         expect(nameDuplicateErrors.length).toBe(0);
      });

      test('should allow different DataModel names', async () => {
         const doc1 = await parseDocument({
            services,
            text: `logical datamodel TestModel1
   entity Customer
      attributes
         id: Id
            datatype: Integer`,
            documentUri: testUri('test-dm-1.cm')
         });

         const doc2 = await parseDocument({
            services,
            text: `logical datamodel TestModel2
   entity Order
      attributes
         id: Id
            datatype: Integer`,
            documentUri: testUri('test-dm-2.cm')
         });

         const diagnostics1 = doc1.diagnostics ?? [];
         const diagnostics2 = doc2.diagnostics ?? [];
         const nameDuplicateErrors1 = diagnostics1.filter(d => d.message.includes('Must provide a unique name'));
         const nameDuplicateErrors2 = diagnostics2.filter(d => d.message.includes('Must provide a unique name'));

         // Should have no duplicate name errors for different DataModels
         expect(nameDuplicateErrors1.length + nameDuplicateErrors2.length).toBe(0);
      });

      test('should allow different attribute IDs within an entity', async () => {
         const text = `
logical datamodel TestModel
   entity Customer
      attributes
         Id: Id
            datatype: Integer
         Name: Name
            datatype: Text
         `;
         const document = await parseDocument({
            services,
            text,
            documentUri: testUri('test-unique-attr-ids.cm')
         });

         const diagnostics = document.diagnostics ?? [];
         const idDuplicateErrors = diagnostics.filter(d => d.message.includes('Must provide a unique id'));
         expect(idDuplicateErrors.length).toBe(0);
      });

      test('should allow attributes with same ID in different entities', async () => {
         const text = `
logical datamodel TestModel
   entity Customer
      attributes
         Id: Id
            datatype: Integer
         Name: Name
            datatype: Text
   
   entity Order
      attributes
         Id: Id
            datatype: Integer
         `;
         const document = await parseDocument({
            services,
            text,
            documentUri: testUri('test-attr-ids-different-entities.cm')
         });

         const diagnostics = document.diagnostics ?? [];
         const idDuplicateErrors = diagnostics.filter(d => d.message.includes('Must provide a unique id'));
         // Should have no duplicate ID errors within same entity scope
         expect(idDuplicateErrors.length).toBe(0);
      });

      test('should allow different entity IDs within a DataModel', async () => {
         const text = `
logical datamodel TestModel
   entity Customer
      attributes
         Id: Id
            datatype: Integer
   
   entity Order
      attributes
         Id: Id
            datatype: Integer
         `;
         const document = await parseDocument({
            services,
            text,
            documentUri: testUri('test-unique-entity-ids.cm')
         });

         const diagnostics = document.diagnostics ?? [];
         const idDuplicateErrors = diagnostics.filter(d => d.message.includes('Must provide a unique id'));
         expect(idDuplicateErrors.length).toBe(0);
      });

      test('should allow entity and relationship with same ID (different types)', async () => {
         const text = `
logical datamodel TestModel
   entity MyEntity
      attributes
         Id: Id
            datatype: Integer
   
   entity Order
      attributes
         Id: Id
            datatype: Integer
   
   relationship MyEntity
      parent: Order
      child: MyEntity
         `;
         const document = await parseDocument({
            services,
            text,
            documentUri: testUri('test-entity-relationship-same-id.cm')
         });

         const diagnostics = document.diagnostics ?? [];
         const idDuplicateErrors = diagnostics.filter(d => d.message.includes('Must provide a unique id'));
         // Should have no duplicate ID errors since they are different types
         expect(idDuplicateErrors.length).toBe(0);
      });

      test('should allow different DataModel IDs', async () => {
         const doc1 = await parseDocument({
            services,
            text: `logical datamodel MyDataModel1
   entity Customer
      attributes
         Id: Id
            datatype: Integer`,
            documentUri: testUri('test-dm-id-1.cm')
         });

         const doc2 = await parseDocument({
            services,
            text: `logical datamodel MyDataModel2
   entity Order
      attributes
         Id: Id
            datatype: Integer`,
            documentUri: testUri('test-dm-id-2.cm')
         });

         const diagnostics1 = doc1.diagnostics ?? [];
         const diagnostics2 = doc2.diagnostics ?? [];
         const idDuplicateErrors1 = diagnostics1.filter(d => d.message.includes('Must provide a unique id'));
         const idDuplicateErrors2 = diagnostics2.filter(d => d.message.includes('Must provide a unique id'));

         // Should have no duplicate ID errors for different DataModels
         expect(idDuplicateErrors1.length + idDuplicateErrors2.length).toBe(0);
      });
   });

   describe('Edge Cases', () => {
      test('should handle single element without duplicate errors', async () => {
         const text = `
logical datamodel TestModel
   entity Customer
      attributes
         Id: Id
            datatype: Integer
         Name: Name
            datatype: Text
      identifiers
         pk: PrimaryKey
            attributes [Id]
         `;
         const document = await parseDocument({
            services,
            text,
            documentUri: testUri('test-single-elements.cm')
         });

         const diagnostics = document.diagnostics ?? [];
         const duplicateErrors = diagnostics.filter(d => d.message.includes('Must provide a unique'));
         expect(duplicateErrors.length).toBe(0);
      });

      test('should properly handle complex entities with multiple attributes', async () => {
         const text = `
logical datamodel TestModel
   entity Customer
      attributes
         CustomerId: CustomerId
            datatype: Integer
         FirstName: FirstName
            datatype: Text
         LastName: LastName
            datatype: Text
         Email: Email
            datatype: Text
      identifiers
         pk_customer: PrimaryKey
            attributes [CustomerId]
         uk_email: UniqueEmail
            attributes [Email]
         `;
         const document = await parseDocument({
            services,
            text,
            documentUri: testUri('test-complex-entity.cm')
         });

         const diagnostics = document.diagnostics ?? [];
         const duplicateErrors = diagnostics.filter(d => d.message.includes('Must provide a unique'));
         expect(duplicateErrors.length).toBe(0);
      });

      test('should validate identifier names are unique', async () => {
         const text = `
logical datamodel TestModel
   entity Customer
      attributes
         id: Id
            datatype: Integer
         name: Name
            datatype: Text
      identifiers
         pk_id: PrimaryKey
            attributes [Id]
         sk_name: SecondaryKey
            attributes [Name]
         `;
         const document = await parseDocument({
            services,
            text,
            documentUri: testUri('test-unique-identifier-names.cm')
         });

         const diagnostics = document.diagnostics ?? [];
         const nameDuplicateErrors = diagnostics.filter(d => d.message.includes('Must provide a unique name'));
         expect(nameDuplicateErrors.length).toBe(0);
      });
   });
});
