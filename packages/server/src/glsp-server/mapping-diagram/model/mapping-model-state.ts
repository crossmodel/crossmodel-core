/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { inject, injectable } from 'inversify';
import { CrossModelRoot, Mapping } from '../../../language-server/generated/ast.js';
import { CrossModelState } from '../../common/cross-model-state.js';
import { MappingModelIndex } from './mapping-model-index.js';

@injectable()
export class MappingModelState extends CrossModelState {
   @inject(MappingModelIndex) override readonly index: MappingModelIndex;

   override setSemanticRoot(uri: string, semanticRoot: CrossModelRoot): void {
      super.setSemanticRoot(uri, semanticRoot);
   }

   get mapping(): Mapping {
      return this.semanticRoot.mapping!;
   }
}
