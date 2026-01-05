/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { CrossModelRoot } from '@crossmodel/protocol';
import { DataModelDispatchAction, DataModelReducer, isDataModelDispatchAction } from './DataModelReducer';
import { EntityDispatchAction, EntityModelReducer, isEntityDispatchAction } from './EntityModelReducer';
import { MappingSourcesDispatchAction, MappingSourcesModelReducer, isMappingSourcesDispatchAction } from './MappingSourcesReducer';
import { MappingTargetDispatchAction, MappingTargetModelReducer, isMappingTargetDispatchAction } from './MappingTargetReducer';
import { RelationshipDispatchAction, RelationshipModelReducer, isRelationshipDispatchAction } from './RelationshipModelReducer';

export interface ModelAction {
   type: string;
}

export interface ModelUpdateAction extends ModelAction {
   type: 'model:update';
   model: CrossModelRoot;
}

export type DispatchAction =
   | ModelUpdateAction
   | DataModelDispatchAction
   | EntityDispatchAction
   | RelationshipDispatchAction
   | MappingTargetDispatchAction
   | MappingSourcesDispatchAction;

export type ModelStateReason = DispatchAction['type'] | 'model:initial';

export interface ModelState {
   model: CrossModelRoot;
   reason: ModelStateReason;
}

export function ModelReducer(state: ModelState, action: DispatchAction): ModelState {
   if (state.model === undefined) {
      throw Error('Model error: Model undefined');
   }
   console.debug('[ModelReducer]', action);
   state.reason = action.type;
   if (action.type === 'model:update') {
      state.model = action.model;
      return state;
   }
   if (isDataModelDispatchAction(action)) {
      return DataModelReducer(state, action);
   }
   if (isEntityDispatchAction(action)) {
      return EntityModelReducer(state, action);
   }
   if (isRelationshipDispatchAction(action)) {
      return RelationshipModelReducer(state, action);
   }
   if (isMappingTargetDispatchAction(action)) {
      return MappingTargetModelReducer(state, action);
   }
   if (isMappingSourcesDispatchAction(action)) {
      return MappingSourcesModelReducer(state, action);
   }
   throw Error('Unknown ModelReducer action');
}

export function moveUp<T>(list: T[], idx: number): void {
   swap(list, idx, idx - 1);
}

export function moveDown<T>(list: T[], idx: number): void {
   swap(list, idx, idx + 1);
}

export function swap<T>(list: T[], firstIdx: number, secondIdx: number): void {
   if (firstIdx >= 0 && firstIdx < list.length && secondIdx >= 0 && secondIdx < list.length) {
      const firstVal = list[firstIdx];
      list[firstIdx] = list[secondIdx];
      list[secondIdx] = firstVal;
   }
}

export function undefinedIfEmpty(string?: string): string | undefined {
   return valueIfEmpty(string, undefined);
}

export function valueIfEmpty<V, T extends V | undefined>(value: V | undefined, defaultValue: T): V | T {
   return !value ? defaultValue : value;
}
