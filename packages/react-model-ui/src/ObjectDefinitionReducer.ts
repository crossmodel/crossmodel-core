/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { CustomProperty, unreachable } from '@crossmodel/protocol';
import { DispatchAction, ModelAction, ModelState, undefinedIfEmpty } from './ModelReducer';

export interface ObjectDefinitionCustomPropertyUpdateAction extends ModelAction {
   type: 'objectDefinition:customProperty:update';
   customPropertyIdx: number;
   customProperty: CustomProperty;
}

export interface ObjectDefinitionCustomPropertyAddAction extends ModelAction {
   type: 'objectDefinition:customProperty:add-customProperty';
   customProperty: CustomProperty;
}

export interface ObjectDefinitionCustomPropertyDeleteAction extends ModelAction {
   type: 'objectDefinition:customProperty:delete-customProperty';
   customPropertyIdx: number;
}

export interface ObjectDefinitionCustomPropertyReorderAction extends ModelAction {
   type: 'objectDefinition:customProperty:reorder-customProperties';
   customProperties: CustomProperty[];
}

export type ObjectDefinitionDispatchAction =
   | ObjectDefinitionCustomPropertyUpdateAction
   | ObjectDefinitionCustomPropertyAddAction
   | ObjectDefinitionCustomPropertyDeleteAction
   | ObjectDefinitionCustomPropertyReorderAction;

export function isObjectDefinitionDispatchAction(action: DispatchAction): action is ObjectDefinitionDispatchAction {
   return action.type.startsWith('objectDefinition:');
}

export function ObjectDefinitionReducer(state: ModelState, action: ObjectDefinitionDispatchAction): ModelState {
   const objectDefinition = (state.model as any).objectDefinition;
   if (objectDefinition === undefined) {
      throw Error('Model error: ObjectDefinition action applied on undefined objectDefinition');
   }

   state.reason = action.type;

   switch (action.type) {
      case 'objectDefinition:customProperty:update':
         objectDefinition.customProperties![action.customPropertyIdx] = {
            ...action.customProperty,
            name: undefinedIfEmpty(action.customProperty.name),
            description: undefinedIfEmpty(action.customProperty.description)
         };
         break;

      case 'objectDefinition:customProperty:add-customProperty':
         objectDefinition.customProperties!.push(action.customProperty);
         break;

      case 'objectDefinition:customProperty:delete-customProperty':
         objectDefinition.customProperties!.splice(action.customPropertyIdx, 1);
         break;

      case 'objectDefinition:customProperty:reorder-customProperties':
         objectDefinition.customProperties = action.customProperties;
         break;

      default:
         unreachable(action);
   }
   return state;
}
