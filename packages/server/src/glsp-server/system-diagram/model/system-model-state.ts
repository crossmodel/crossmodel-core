/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { injectable } from 'inversify';
import { SystemDiagram } from '../../../language-server/generated/ast.js';
import { CrossModelState } from '../../common/cross-model-state.js';
import { SystemModelIndex } from './system-model-index.js';

@injectable()
export class SystemModelState extends CrossModelState {
   declare readonly index: SystemModelIndex;

   get systemDiagram(): SystemDiagram {
      return this.semanticRoot.systemDiagram!;
   }
}
