/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

import { describe, expect, test } from '@jest/globals';
import { NodeFileSystem } from 'langium/node';
import { createCrossModelServices } from '../../src/language-server/cross-model-module.js';
import { ModelService } from '../../src/model-server/model-service.js';

// the model service actually needs a file system, so we use the NodeFileSystem
const services = createCrossModelServices({ ...NodeFileSystem });
const sharedServices = services.shared;

const modelService = new ModelService(sharedServices);

describe('Model Service', () => {
   test('Open on non-existing file should throw exception', async () => {
      try {
         await modelService.open({ uri: 'non-existing-uri', clientId: 'non-existing-client' });
      } catch (error) {
         expect(error).toBeDefined();
         // We expect the ENOENT (Error No Entity) error to be thrown, because the file doesn't exist.
         expect(error).toHaveProperty('code', 'ENOENT');
      }
   });
});
