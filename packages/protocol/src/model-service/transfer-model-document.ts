/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

/**
 * Document envelope and diagnostic types for the transfer model.
 *
 * These types wrap the pure model types with document-level concerns
 * (URI, diagnostics) used for client-server communication.
 */

import { CrossModelRoot } from './transfer-model';
import { ModelDiagnostic } from './transfer-model-validation';

export interface CrossModelDocument<T = CrossModelRoot, D = ModelDiagnostic> {
   uri: string;
   root: T;
   diagnostics: D[];
}
