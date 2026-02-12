/********************************************************************************
 * Copyright (c) 2026 CrossBreeze.
 ********************************************************************************/

import { describe, expect, test } from '@jest/globals';
import { AstUtils } from 'langium';
import {
   isIdentifiedObject,
   isLogicalEntityNode,
   isSourceObject,
   isTargetObject
} from '../../../src/language-server/ast';
import { diagram5 } from '../test-utils/test-documents/diagram/diagram5';
import { customer } from '../test-utils/test-documents/entity/customer';
import { order } from '../test-utils/test-documents/entity/order';
import { test_mapping } from '../test-utils/test-documents/mappings/test_mapping';
import {
   createCrossModelTestServices,
   diagramDocumentUri,
   entityDocumentUri,
   mappingDocumentUri,
   parseDocument,
   parseLogicalEntity,
   parseMapping,
   parseSystemDiagram
} from '../test-utils/utils';

const services = createCrossModelTestServices();

/**
 * Verifies that the AST extension service (CrossModelAstExtensionService) sets all
 * derived `_`-prefixed properties declared in the module augmentation (ast.ts).
 *
 * These tests catch mismatches between the module augmentation (which declares properties
 * as non-optional) and the AST extension service (which must actually set them). If a new
 * AST type is added to the augmentation but the extension branch is missing, these tests fail.
 */
describe('CrossModelAstExtensionService — derived property completeness', () => {
   describe('_globalId on IdentifiedObject', () => {
      test('all IdentifiedObject nodes in an entity have _globalId', async () => {
         const entity = await parseLogicalEntity({
            services,
            text: customer,
            documentUri: entityDocumentUri('ast_ext_globalId_entity')
         });

         let count = 0;
         AstUtils.streamAst(entity.$document.parseResult.value).forEach(node => {
            if (isIdentifiedObject(node)) {
               count++;
               expect('_globalId' in node).toBe(true);
            }
         });
         expect(count).toBeGreaterThan(0);
      });

      test('all IdentifiedObject nodes in a mapping have _globalId', async () => {
         await parseDocument({ services, text: customer, documentUri: entityDocumentUri('ast_ext_globalId_cust') });
         await parseDocument({ services, text: order, documentUri: entityDocumentUri('ast_ext_globalId_ord') });
         const mapping = await parseMapping({
            services,
            text: test_mapping,
            documentUri: mappingDocumentUri('ast_ext_globalId_mapping')
         });

         let count = 0;
         AstUtils.streamAst(mapping.$document.parseResult.value).forEach(node => {
            if (isIdentifiedObject(node)) {
               count++;
               expect('_globalId' in node).toBe(true);
            }
         });
         expect(count).toBeGreaterThan(0);
      });
   });

   describe('_attributes on entity-referencing types', () => {
      test('LogicalEntityNode has _attributes array', async () => {
         await parseDocument({ services, text: customer, documentUri: entityDocumentUri('ast_ext_attrs_cust') });
         const diagram = await parseSystemDiagram({
            services,
            text: diagram5,
            documentUri: diagramDocumentUri('ast_ext_attrs_diagram')
         });

         let count = 0;
         AstUtils.streamAst(diagram.$document.parseResult.value).forEach(node => {
            if (isLogicalEntityNode(node)) {
               count++;
               expect(Array.isArray(node._attributes)).toBe(true);
            }
         });
         expect(count).toBeGreaterThan(0);
      });

      test('SourceObject and TargetObject have _attributes array', async () => {
         await parseDocument({ services, text: customer, documentUri: entityDocumentUri('ast_ext_attrs2_cust') });
         await parseDocument({ services, text: order, documentUri: entityDocumentUri('ast_ext_attrs2_ord') });
         const mapping = await parseMapping({
            services,
            text: test_mapping,
            documentUri: mappingDocumentUri('ast_ext_attrs_mapping')
         });

         let sourceCount = 0;
         let targetCount = 0;
         AstUtils.streamAst(mapping.$document.parseResult.value).forEach(node => {
            if (isSourceObject(node)) {
               sourceCount++;
               expect(Array.isArray(node._attributes)).toBe(true);
            }
            if (isTargetObject(node)) {
               targetCount++;
               expect(Array.isArray(node._attributes)).toBe(true);
            }
         });
         expect(sourceCount).toBeGreaterThan(0);
         expect(targetCount).toBeGreaterThan(0);
      });
   });

   describe('_id on TargetObject', () => {
      test('TargetObject has _id property', async () => {
         await parseDocument({ services, text: customer, documentUri: entityDocumentUri('ast_ext_id_cust') });
         await parseDocument({ services, text: order, documentUri: entityDocumentUri('ast_ext_id_ord') });
         const mapping = await parseMapping({
            services,
            text: test_mapping,
            documentUri: mappingDocumentUri('ast_ext_id_mapping')
         });

         let count = 0;
         AstUtils.streamAst(mapping.$document.parseResult.value).forEach(node => {
            if (isTargetObject(node)) {
               count++;
               expect('_id' in node).toBe(true);
            }
         });
         expect(count).toBeGreaterThan(0);
      });
   });

});
