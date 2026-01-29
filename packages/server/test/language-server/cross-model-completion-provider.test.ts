/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { expandToString } from 'langium/generate';
import { expectCompletion } from 'langium/test';
import { address } from './test-utils/test-documents/entity/address';
import { customer } from './test-utils/test-documents/entity/customer';
import { dataModelA, dataModelB } from './test-utils/test-documents/entity/datamodels';
import { order } from './test-utils/test-documents/entity/order';
import {
   createCrossModelTestServices,
   entityDocumentUri,
   MockFileSystem,
   parseDocuments,
   relationshipDocumentUri,
   testUri
} from './test-utils/utils';

const services = createCrossModelTestServices(MockFileSystem);
const assertCompletion = expectCompletion(services);

describe.only('CrossModelCompletionProvider', () => {
   const text = expandToString`
    relationship:
       id: Address_Customer
       name: "Address - Customer"
       parent: <|>
    `;

   beforeAll(async () => {
      await parseDocuments(
         { services, text: dataModelA, documentUri: testUri('projectA', 'datamodel.cm') },
         { services, text: address, documentUri: entityDocumentUri('projectA', 'address') },
         { services, text: order, documentUri: entityDocumentUri('projectA', 'order') }
      );

      await parseDocuments(
         { services, text: dataModelB, documentUri: testUri('projectB', 'datamodel.cm') },
         { services, text: customer, documentUri: entityDocumentUri('projectB', 'customer') }
      );
   });

   test('Completion for entity references in project A', async () => {
      await assertCompletion({
         text,
         parseOptions: { documentUri: relationshipDocumentUri('projectA', 'rel') },
         index: 0,
         expectedItems: ['Address', 'Order'],
         disposeAfterCheck: true
      });
   });

   test('Completion for entity references in project A at scope of project A root directory', async () => {
      await assertCompletion({
         text,
         parseOptions: { documentUri: relationshipDocumentUri('projectA', 'test') },
         index: 0,
         expectedItems: ['Address', 'Order'],
         disposeAfterCheck: false
      });
   });

   test('Completion for entity references in project B', async () => {
      await assertCompletion({
         text,
         parseOptions: { documentUri: relationshipDocumentUri('projectB', 'rel') },
         index: 0,
         expectedItems: ['Customer', 'DataModelA.Address', 'DataModelA.Order'],
         disposeAfterCheck: true
      });
   });
});
