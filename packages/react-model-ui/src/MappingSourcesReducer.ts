/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import {
   BooleanExpression,
   SourceObjectAttributeReferenceType,
   SourceObjectCondition,
   SourceObjectDependency,
   SourceObjectJoinType
} from '@crossmodel/protocol';
import { DispatchAction, ModelAction, ModelState, moveDown, moveUp } from './ModelReducer';

export interface SourceObjectChangeJoinAction extends ModelAction {
   type: 'source-object:change-join';
   sourceObjectIdx: number;
   join: SourceObjectJoinType;
}

export interface SourceObjectUpdateDependencyAction extends ModelAction {
   type: 'source-object:update-dependency';
   sourceObjectIdx: number;
   dependencyIdx: number;
   dependency: SourceObjectDependency;
}

export interface SourceObjectAddDependencyAction extends ModelAction {
   type: 'source-object:add-dependency';
   sourceObjectIdx: number;
   dependency: SourceObjectDependency;
}

export interface SourceObjectDeleteDependencyAction extends ModelAction {
   type: 'source-object:delete-dependency';
   sourceObjectIdx: number;
   dependencyIdx: number;
}

export interface SourceObjectMoveDependencyUpAction extends ModelAction {
   type: 'source-object:move-dependency-up';
   sourceObjectIdx: number;
   dependencyIdx: number;
}

export interface SourceObjectMoveDependencyDownAction extends ModelAction {
   type: 'source-object:move-dependency-down';
   sourceObjectIdx: number;
   dependencyIdx: number;
}

export interface SourceObjectReorderDependenciesAction extends ModelAction {
   type: 'source-object:reorder-dependencies';
   sourceObjectIdx: number;
   dependencies: SourceObjectDependency[];
}

export interface SourceObjectDependencyUpdateConditionAction extends ModelAction {
   type: 'source-object:update-condition';
   sourceObjectIdx: number;
   conditionIdx: number;
   condition: SourceObjectCondition;
}

export interface SourceObjectDependencyAddConditionAction extends ModelAction {
   type: 'source-object:add-condition';
   sourceObjectIdx: number;
   condition: SourceObjectCondition;
}

export interface SourceObjectDependencyDeleteConditionAction extends ModelAction {
   type: 'source-object:delete-condition';
   sourceObjectIdx: number;
   conditionIdx: number;
}

export interface SourceObjectDependencyMoveConditionUpAction extends ModelAction {
   type: 'source-object:move-condition-up';
   sourceObjectIdx: number;
   conditionIdx: number;
}

export interface SourceObjectDependencyMoveConditionDownAction extends ModelAction {
   type: 'source-object:move-condition-down';
   sourceObjectIdx: number;
   conditionIdx: number;
}

export interface SourceObjectReorderConditionsAction extends ModelAction {
   type: 'source-object:reorder-conditions';
   sourceObjectIdx: number;
   conditions: SourceObjectCondition[];
}

export type SourceObjectDependencyAction =
   | SourceObjectUpdateDependencyAction
   | SourceObjectAddDependencyAction
   | SourceObjectMoveDependencyUpAction
   | SourceObjectMoveDependencyDownAction
   | SourceObjectDeleteDependencyAction
   | SourceObjectReorderDependenciesAction;

export type SourceObjectConditionAction =
   | SourceObjectDependencyUpdateConditionAction
   | SourceObjectDependencyAddConditionAction
   | SourceObjectDependencyDeleteConditionAction
   | SourceObjectDependencyMoveConditionUpAction
   | SourceObjectDependencyMoveConditionDownAction
   | SourceObjectReorderConditionsAction;

export type MappingSourcesDispatchAction = SourceObjectChangeJoinAction | SourceObjectDependencyAction | SourceObjectConditionAction;

export function isMappingSourcesDispatchAction(action: DispatchAction): action is MappingSourcesDispatchAction {
   return action.type.startsWith('source-object:');
}

export function MappingSourcesModelReducer(state: ModelState, action: MappingSourcesDispatchAction): ModelState {
   const mapping = state.model.mapping;
   if (mapping === undefined) {
      throw Error('Model error: Mapping action applied on undefined mapping');
   }

   const sourceObject = mapping.sources[action.sourceObjectIdx];
   if (sourceObject === undefined) {
      throw Error('Model error: Mapping action applied on undefined source object');
   }
   switch (action.type) {
      case 'source-object:change-join':
         sourceObject.join = action.join;
         break;

      case 'source-object:update-dependency':
         sourceObject.dependencies[action.dependencyIdx] = action.dependency;
         break;

      case 'source-object:add-dependency':
         sourceObject.dependencies.push(action.dependency);
         break;

      case 'source-object:move-dependency-up':
         moveUp(sourceObject.dependencies, action.dependencyIdx);
         break;

      case 'source-object:move-dependency-down':
         moveDown(sourceObject.dependencies, action.dependencyIdx);
         break;

      case 'source-object:delete-dependency':
         {
            const dependency = sourceObject.dependencies[action.dependencyIdx];
            const isDependencyExpression: (expr: BooleanExpression) => boolean = expr =>
               expr.$type === SourceObjectAttributeReferenceType && expr.value.startsWith(dependency.source + '.');
            sourceObject.conditions = sourceObject.conditions.filter(
               condition => !isDependencyExpression(condition.expression.left) && !isDependencyExpression(condition.expression.right)
            );
            sourceObject.dependencies.splice(action.dependencyIdx, 1);
         }
         break;

      case 'source-object:reorder-dependencies':
         sourceObject.dependencies = action.dependencies;
         break;

      case 'source-object:update-condition':
         sourceObject.conditions[action.conditionIdx] = action.condition;
         break;

      case 'source-object:add-condition':
         sourceObject.conditions.push(action.condition);
         break;

      case 'source-object:delete-condition':
         sourceObject.conditions.splice(action.conditionIdx, 1);
         break;

      case 'source-object:move-condition-up':
         moveUp(sourceObject.conditions, action.conditionIdx);
         break;

      case 'source-object:move-condition-down':
         moveDown(sourceObject.conditions, action.conditionIdx);
         break;

      case 'source-object:reorder-conditions':
         sourceObject.conditions = action.conditions;
         break;
   }
   return state;
}
