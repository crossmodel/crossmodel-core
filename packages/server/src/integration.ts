/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { CrossModelServices, CrossModelSharedServices } from './language-server/cross-model-module.js';

export const CrossModelLSPServices = Symbol('CrossModelLSPServices');
export interface CrossModelLSPServices {
  shared: CrossModelSharedServices;
  language: CrossModelServices;
}
