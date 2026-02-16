/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/

/**
 * Transfer model — the serializable representation of the Langium AST used for
 * client-server communication.
 *
 * This file is the handwritten overlay on top of the generated transfer model.
 * It re-exports everything from the generated file and narrows types where the
 * transfer model intentionally differs from the AST (validated data, resolved
 * references, typed string unions).
 */

// Re-export everything from the generated transfer model.
// Local interface exports below shadow the generated versions where we narrow types.
export * from './generated/transfer-model';

import * as generated from './generated/transfer-model';

export interface DataModel extends generated.DataModel {
   type: generated.DataModelType;
}

export interface Mapping extends generated.Mapping {
   sources: Array<SourceObject>;
}

export interface SourceObject extends generated.SourceObject {
   join?: generated.JoinType;
}

export interface CrossModelRoot extends generated.CrossModelRoot {
   datamodel?: DataModel;
   relationship?: Relationship;
   mapping?: Mapping;
}

export interface Relationship extends generated.Relationship {
   childCardinality?: generated.Cardinality;
   parentCardinality?: generated.Cardinality;
}

export type SourceObjectJoinType = generated.JoinType;

export const CardinalityValues = ['0..1', '1..1', '0..N', '1..N'] as const;
