/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { ModelFileExtensions } from '@crossmodel/protocol';
import { entity1 } from './test-utils/test-documents/entity/entity1.js';
import { createCrossModelTestServices, parseLogicalEntity, testUri } from './test-utils/utils.js';

const services = createCrossModelTestServices();

describe('CrossModel Filename Validation', () => {
   test('Mismatching id and filename does not yield error', async () => {
      const entity = await parseLogicalEntity({
         services,
         text: entity1,
         validation: true,
         documentUri: testUri('Customer2' + ModelFileExtensions.LogicalEntity)
      });
      expect(entity.id).toBe('Customer');
      expect(entity.$document.diagnostics).toHaveLength(1);
      expect(entity.$document.diagnostics![0].message).toContain('Filename should match element id');
   });
});
