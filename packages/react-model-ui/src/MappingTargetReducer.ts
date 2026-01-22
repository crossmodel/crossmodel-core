/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { AttributeMappingExpression, AttributeMappingExpressionType, AttributeMappingSource } from '@crossmodel/protocol';
import { DispatchAction, ModelAction, ModelState, moveDown, moveUp, undefinedIfEmpty } from './ModelReducer';

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

   const getExpressions = (): AttributeMappingExpression[] => {
      const current = (attributeMapping as any).expressions as AttributeMappingExpression[] | undefined;
      if (current) {
         return current;
      }
      const initialized: AttributeMappingExpression[] = [];
      (attributeMapping as any).expressions = initialized;
      return initialized;
   };

   const setExpressions = (expressions: AttributeMappingExpression[]): void => {
      (attributeMapping as any).expressions = expressions;
   };

   const getSources = (): AttributeMappingSource[] => {
      const current = attributeMapping.sources as AttributeMappingSource[] | undefined;
      if (current) {
         return current;
      }
      const initialized: AttributeMappingSource[] = [];
      attributeMapping.sources = initialized;
      return initialized;
   };

   const setSources = (sources: AttributeMappingSource[]): void => {
      attributeMapping.sources = sources;
   };

   switch (action.type) {
      case 'attribute-mapping:change-expression': {
         const expressions = getExpressions();
         const existing = expressions[0] ?? { $type: AttributeMappingExpressionType, language: '', expression: '' };
         const updated: AttributeMappingExpression = {
            $type: AttributeMappingExpressionType,
            language: existing.language ?? '',
            expression: undefinedIfEmpty(action.expression)
         };
         setExpressions([updated, ...expressions.slice(1)]);
         break;
      }

      case 'attribute-mapping:add-expression': {
         const expressions = getExpressions();
         const next: AttributeMappingExpression[] = [
            ...expressions,
            {
               $type: AttributeMappingExpressionType,
               language: action.expression.language,
               expression: action.expression.expression
            }
         ];
         setExpressions(next as AttributeMappingExpression[]);
         break;
      }

      case 'attribute-mapping:update-expression': {
         const expressions = getExpressions();
         if (expressions[action.expressionIdx]) {
            const next = expressions.slice();
            next[action.expressionIdx] = {
               $type: AttributeMappingExpressionType,
               language: action.expression.language,
               expression: action.expression.expression
            } as AttributeMappingExpression;
            setExpressions(next as AttributeMappingExpression[]);
         }
         break;
      }

      case 'attribute-mapping:delete-expression': {
         const expressions = getExpressions();
         const next = expressions.slice();
         next.splice(action.expressionIdx, 1);
         setExpressions(next as AttributeMappingExpression[]);
         break;
      }

      case 'attribute-mapping:reorder-expressions': {
         setExpressions(
            action.expressions.map(
               expr =>
                  ({
                     $type: AttributeMappingExpressionType,
                     language: expr.language,
                     expression: expr.expression
                  }) as AttributeMappingExpression
            )
         );
         break;
      }

      case 'attribute-mapping:update-source': {
         const next = getSources().slice();
         next[action.sourceIdx] = { ...action.source };
         setSources(next);
         break;
      }

      case 'attribute-mapping:add-source': {
         const next = getSources().slice();
         next.push(action.source);
         setSources(next);
         break;
      }

      case 'attribute-mapping:move-source-up': {
         const next = getSources().slice();
         moveUp(next, action.sourceIdx);
         setSources(next);
         break;
      }

      case 'attribute-mapping:move-source-down': {
         const next = getSources().slice();
         moveDown(next, action.sourceIdx);
         setSources(next);
         break;
      }

      case 'attribute-mapping:delete-source': {
         const next = getSources().slice();
         next.splice(action.sourceIdx, 1);
         setSources(next);
         break;
      }

      case 'attribute-mapping:source:reorder-sources': {
         setSources(action.sources.slice());
         break;
      }
   }
   return state;
}
