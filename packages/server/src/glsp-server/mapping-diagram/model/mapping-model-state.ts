/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { injectable } from 'inversify';
import { CrossModelRoot, Mapping } from '../../../language-server/ast.js';
import { CrossModelState } from '../../common/cross-model-state.js';
import { MappingModelIndex } from './mapping-model-index.js';

@injectable()
export class MappingModelState extends CrossModelState {
   declare readonly index: MappingModelIndex;

   override setSemanticRoot(uri: string, semanticRoot: CrossModelRoot): void {
      super.setSemanticRoot(uri, semanticRoot);
   }

   get mapping(): Mapping {
      return this.semanticRoot.mapping!;
   }
}
