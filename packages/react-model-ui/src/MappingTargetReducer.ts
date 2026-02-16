/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { AttributeMappingExpression, AttributeMappingExpressionType, AttributeMappingSource } from '@crossmodel/protocol';
import { DispatchAction, ModelAction, ModelState, moveDown, moveUp } from './ModelReducer';

export interface AttributeMappingChangeExpressionAction extends ModelAction {
   type: 'attribute-mapping:change-expression';
   mappingIdx: number;
   expression: string;
}

export interface AttributeMappingAddExpressionAction extends ModelAction {
   type: 'attribute-mapping:add-expression';
   mappingIdx: number;
   expression: AttributeMappingExpression;
}

export interface AttributeMappingUpdateExpressionAction extends ModelAction {
   type: 'attribute-mapping:update-expression';
   mappingIdx: number;
   expressionIdx: number;
   expression: AttributeMappingExpression;
}

export interface AttributeMappingDeleteExpressionAction extends ModelAction {
   type: 'attribute-mapping:delete-expression';
   mappingIdx: number;
   expressionIdx: number;
}

export interface AttributeMappingReorderExpressionsAction extends ModelAction {
   type: 'attribute-mapping:reorder-expressions';
   mappingIdx: number;
   expressions: AttributeMappingExpression[];
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
   | AttributeMappingAddExpressionAction
   | AttributeMappingUpdateExpressionAction
   | AttributeMappingDeleteExpressionAction
   | AttributeMappingReorderExpressionsAction
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

   state.reason = action.type;
   switch (action.type) {
      case 'attribute-mapping:change-expression': {
         const expressions = attributeMapping.expressions;
         const existing = expressions[0] ?? { $type: AttributeMappingExpressionType, language: '', expression: '' };
         const updated: AttributeMappingExpression = {
            $type: AttributeMappingExpressionType,
            language: existing.language,
            expression: action.expression
         };
         attributeMapping.expressions = [updated, ...expressions.slice(1)];
         break;
      }

      case 'attribute-mapping:add-expression': {
         const expressions = attributeMapping.expressions;
         const next: AttributeMappingExpression[] = [
            ...expressions,
            {
               $type: AttributeMappingExpressionType,
               language: action.expression.language,
               expression: action.expression.expression
            }
         ];
         attributeMapping.expressions = next;
         break;
      }

      case 'attribute-mapping:update-expression': {
         const expressions = attributeMapping.expressions;
         if (expressions[action.expressionIdx]) {
            const next = expressions.slice();
            next[action.expressionIdx] = {
               $type: AttributeMappingExpressionType,
               language: action.expression.language,
               expression: action.expression.expression
            };
            attributeMapping.expressions = next;
         }
         break;
      }

      case 'attribute-mapping:delete-expression': {
         const expressions = attributeMapping.expressions;
         const next = expressions.slice();
         next.splice(action.expressionIdx, 1);
         attributeMapping.expressions = next;
         break;
      }

      case 'attribute-mapping:reorder-expressions': {
         attributeMapping.expressions = action.expressions.slice();
         break;
      }

      case 'attribute-mapping:update-source': {
         const next = attributeMapping.sources.slice();
         next[action.sourceIdx] = { ...action.source };
         attributeMapping.sources = next;
         break;
      }

      case 'attribute-mapping:add-source': {
         const next = attributeMapping.sources.slice();
         next.push(action.source);
         attributeMapping.sources = next;
         break;
      }

      case 'attribute-mapping:move-source-up': {
         const next = attributeMapping.sources.slice();
         moveUp(next, action.sourceIdx);
         attributeMapping.sources = next;
         break;
      }

      case 'attribute-mapping:move-source-down': {
         const next = attributeMapping.sources.slice();
         moveDown(next, action.sourceIdx);
         attributeMapping.sources = next;
         break;
      }

      case 'attribute-mapping:delete-source': {
         const next = attributeMapping.sources.slice();
         next.splice(action.sourceIdx, 1);
         attributeMapping.sources = next;
         break;
      }

      case 'attribute-mapping:source:reorder-sources': {
         attributeMapping.sources = action.sources.slice();
         break;
      }
   }
   return state;
}
