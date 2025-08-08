/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { CrossModelServices, CrossModelSharedServices } from './language-server/cross-model-module.js';

/**
 * Language services required in GLSP.
 */
export const CrossModelLSPServices = Symbol('CrossModelLSPServices');
export interface CrossModelLSPServices {
   /** Language services shared across all languages. */
   shared: CrossModelSharedServices;
   /** CrossModel language-specific services. */
   language: CrossModelServices;
}
