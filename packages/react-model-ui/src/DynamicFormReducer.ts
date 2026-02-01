/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/
import { DispatchAction, ModelAction, ModelState } from './ModelReducer';

export interface DynamicSetPropertyAction extends ModelAction {
   type: 'dynamic:set-property';
   /** The root key on CrossModelRoot (e.g., 'datamodel', 'entity'). */
   rootKey: string;
   /** The property name to update. */
   property: string;
   /** The new value. */
   value: any;
   /** Whether to convert empty string to undefined. */
   undefinedIfEmpty?: boolean;
}

export interface DynamicSetIdAction extends ModelAction {
   type: 'dynamic:set-id';
   /** The root key on CrossModelRoot (e.g., 'datamodel', 'entity'). */
   rootKey: string;
   /** The new id value. */
   id: string;
}

export interface DynamicCollectionAddAction extends ModelAction {
   type: 'dynamic:collection:add';
   rootKey: string;
   /** The collection property name (e.g., 'dependencies', 'attributes'). */
   collectionProperty: string;
   /** The new item to add. */
   item: Record<string, any>;
}

export interface DynamicCollectionUpdateAction extends ModelAction {
   type: 'dynamic:collection:update';
   rootKey: string;
   collectionProperty: string;
   /** Index of the item to update. */
   itemIdx: number;
   /** The updated item. */
   item: Record<string, any>;
}

export interface DynamicCollectionDeleteAction extends ModelAction {
   type: 'dynamic:collection:delete';
   rootKey: string;
   collectionProperty: string;
   /** Index of the item to delete. */
   itemIdx: number;
}

export interface DynamicCollectionReorderAction extends ModelAction {
   type: 'dynamic:collection:reorder';
   rootKey: string;
   collectionProperty: string;
   /** The reordered array. */
   items: Record<string, any>[];
}

export type DynamicFormDispatchAction =
   | DynamicSetPropertyAction
   | DynamicSetIdAction
   | DynamicCollectionAddAction
   | DynamicCollectionUpdateAction
   | DynamicCollectionDeleteAction
   | DynamicCollectionReorderAction;

export function isDynamicFormDispatchAction(action: DispatchAction): action is DynamicFormDispatchAction {
   return action.type.startsWith('dynamic:');
}

export function DynamicFormReducer(state: ModelState, action: DynamicFormDispatchAction): ModelState {
   const rootObj = (state.model as any)[action.rootKey];
   if (!rootObj) {
      throw Error(`Model error: Dynamic action applied on undefined ${action.rootKey}`);
   }

   state.reason = action.type;

   switch (action.type) {
      case 'dynamic:set-property': {
         const value = action.undefinedIfEmpty && !action.value ? undefined : action.value;
         rootObj[action.property] = value;
         break;
      }
      case 'dynamic:set-id': {
         rootObj.id = action.id;
         break;
      }
      case 'dynamic:collection:add': {
         if (!rootObj[action.collectionProperty]) {
            rootObj[action.collectionProperty] = [];
         }
         rootObj[action.collectionProperty].push(action.item);
         break;
      }
      case 'dynamic:collection:update': {
         if (!rootObj[action.collectionProperty]) {
            rootObj[action.collectionProperty] = [];
         }
         rootObj[action.collectionProperty][action.itemIdx] = action.item;
         break;
      }
      case 'dynamic:collection:delete': {
         if (rootObj[action.collectionProperty]) {
            rootObj[action.collectionProperty].splice(action.itemIdx, 1);
         }
         break;
      }
      case 'dynamic:collection:reorder': {
         rootObj[action.collectionProperty] = action.items;
         break;
      }
   }
   return state;
}
