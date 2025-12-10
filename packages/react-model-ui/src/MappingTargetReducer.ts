/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { AttributeMappingSource } from '@crossmodel/protocol';
import { DispatchAction, ModelAction, ModelState, moveDown, moveUp, undefinedIfEmpty } from './ModelReducer';

export interface AttributeMappingChangeExpressionAction extends ModelAction {
   type: 'attribute-mapping:change-expression';
   mappingIdx: number;
   expression: string;
}

export interface AttributeMappingUpdateSourceAction extends ModelAction {
   type: 'attribute-mapping:update-source';
   mappingIdx: number;
   sourceIdx: number;
   source: AttributeMappingSource;
}

export interface AttributeMappingAddEmptySourceAction extends ModelAction {
   type: 'attribute-mapping:add-source';
   mappingIdx: number;
   source: AttributeMappingSource;
}

export interface AttributeMappingMoveSourceUpAction extends ModelAction {
   type: 'attribute-mapping:move-source-up';
   mappingIdx: number;
   sourceIdx: number;
}

export interface AttributeMappingMoveSourceDownAction extends ModelAction {
   type: 'attribute-mapping:move-source-down';
   mappingIdx: number;
   sourceIdx: number;
}

export interface AttributeMappingDeleteSourceAction extends ModelAction {
   type: 'attribute-mapping:delete-source';
   mappingIdx: number;
   sourceIdx: number;
}

export interface AttributeMappingReorderSourcesAction extends ModelAction {
   type: 'attribute-mapping:source:reorder-sources';
   mappingIdx: number;
   sources: AttributeMappingSource[];
}

export type MappingTargetDispatchAction =
   | AttributeMappingChangeExpressionAction
   | AttributeMappingUpdateSourceAction
   | AttributeMappingAddEmptySourceAction
   | AttributeMappingMoveSourceUpAction
   | AttributeMappingMoveSourceDownAction
   | AttributeMappingDeleteSourceAction
   | AttributeMappingReorderSourcesAction;

export function isMappingTargetDispatchAction(action: DispatchAction): action is MappingTargetDispatchAction {
   return action.type.startsWith('attribute-mapping:');
}

export function MappingTargetModelReducer(state: ModelState, action: MappingTargetDispatchAction): ModelState {
   const mapping = state.model.mapping;
   if (mapping === undefined) {
      throw Error('Model error: Mapping action applied on undefined mapping');
   }

   const attributeMapping = mapping.target.mappings[action.mappingIdx];
   if (attributeMapping === undefined) {
      throw Error('Model error: Mapping action applied on undefined attribute mapping');
   }

   switch (action.type) {
      case 'attribute-mapping:change-expression':
         attributeMapping.expression = undefinedIfEmpty(action.expression);
         break;

      case 'attribute-mapping:update-source':
         attributeMapping.sources[action.sourceIdx] = { ...action.source };
         break;

      case 'attribute-mapping:add-source':
         attributeMapping.sources.push(action.source);
         break;

      case 'attribute-mapping:move-source-up':
         moveUp(attributeMapping.sources, action.sourceIdx);
         break;

      case 'attribute-mapping:move-source-down':
         moveDown(attributeMapping.sources, action.sourceIdx);
         break;

      case 'attribute-mapping:delete-source':
         attributeMapping.sources.splice(action.sourceIdx, 1);
         break;

      case 'attribute-mapping:source:reorder-sources':
         attributeMapping.sources = action.sources;
         break;
   }
   return state;
}
