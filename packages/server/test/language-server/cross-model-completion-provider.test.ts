/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { expandToString } from 'langium/generate';
import { expectCompletion } from 'langium/test';
import { address } from './test-utils/test-documents/entity/address.js';
import { customer } from './test-utils/test-documents/entity/customer.js';
import { dataModelA, dataModelB } from './test-utils/test-documents/entity/datamodels.js';
import { order } from './test-utils/test-documents/entity/order.js';
import { createCrossModelTestServices, MockFileSystem, parseDocuments, testUri } from './test-utils/utils.js';

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
         { services, text: address, documentUri: testUri('projectA', 'address.entity.cm') },
         { services, text: order, documentUri: testUri('projectA', 'order.entity.cm') }
      );

      await parseDocuments(
         { services, text: dataModelB, documentUri: testUri('projectB', 'datamodel.cm') },
         { services, text: customer, documentUri: testUri('projectB', 'customer.entity.cm') }
      );
   });

   test('Completion for entity references in project A', async () => {
      await assertCompletion({
         text,
         parseOptions: { documentUri: testUri('projectA', 'rel.relationship.cm') },
         index: 0,
         expectedItems: ['Address', 'Order'],
         disposeAfterCheck: true
      });
   });

   test('Completion for entity references in project A at scope of project A root directory', async () => {
      await assertCompletion({
         text,
         parseOptions: { documentUri: testUri('projectA') },
         index: 0,
         expectedItems: ['Address', 'Order'],
         disposeAfterCheck: false
      });
   });

   test('Completion for entity references in project B', async () => {
      await assertCompletion({
         text,
         parseOptions: { documentUri: testUri('projectB', 'rel.relationship.cm') },
         index: 0,
         expectedItems: ['Customer', 'DataModelA.Address', 'DataModelA.Order'],
         disposeAfterCheck: true
      });
   });
});
