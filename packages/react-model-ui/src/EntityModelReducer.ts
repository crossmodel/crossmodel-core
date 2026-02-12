/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { CustomProperty, LogicalEntityAttribute, LogicalIdentifier as ProtocolLogicalIdentifier, unreachable } from '@crossmodel/protocol';
import { DispatchAction, ModelAction, ModelState, moveDown, moveUp } from './ModelReducer';

export type LogicalIdentifier = ProtocolLogicalIdentifier;

export interface EntityChangeNameAction extends ModelAction {
   type: 'entity:change-name';
   name: string;
}

export interface EntityChangeIdAction extends ModelAction {
   type: 'entity:change-id';
   id: string;
}

export interface EntityChangeDescriptionAction extends ModelAction {
   type: 'entity:change-description';
   description: string;
}

export interface LogicalAttributeUpdateAction extends ModelAction {
   type: 'entity:attribute:update';
   attributeIdx: number;
   attribute: LogicalEntityAttribute;
}

export interface LogicalAttributeAddEmptyAction extends ModelAction {
   type: 'entity:attribute:add-attribute';
   attribute: LogicalEntityAttribute;
}

export interface LogicalAttributeDeleteAction extends ModelAction {
   type: 'entity:attribute:delete-attribute';
   attributeIdx: number;
}

export interface LogicalAttributeReorderAction extends ModelAction {
   type: 'entity:attribute:reorder-attributes';
   attributes: LogicalEntityAttribute[];
}

export interface CustomPropertyUpdateAction extends ModelAction {
   type: 'entity:customProperty:update';
   customPropertyIdx: number;
   customProperty: CustomProperty;
}

export interface CustomPropertyAddEmptyAction extends ModelAction {
   type: 'entity:customProperty:add-customProperty';
   customProperty: CustomProperty;
}

export interface CustomPropertyDeleteAction extends ModelAction {
   type: 'entity:customProperty:delete-customProperty';
   customPropertyIdx: number;
}

export interface CustomPropertyReorderAction extends ModelAction {
   type: 'entity:customProperty:reorder-customProperties';
   customProperties: CustomProperty[];
}

export interface EntityIdentifierUpdateAction extends ModelAction {
   type: 'entity:identifier:update';
   identifierIdx: number;
   identifier: LogicalIdentifier;
}

export interface EntityIdentifierAddAction extends ModelAction {
   type: 'entity:identifier:add-identifier';
   identifier: LogicalIdentifier;
}

export interface EntityIdentifierDeleteAction extends ModelAction {
   type: 'entity:identifier:delete-identifier';
   identifierIdx: number;
}

export interface EntityInheritAddAction extends ModelAction {
   type: 'entity:inherit:add';
   inherit: any;
}

export interface EntityInheritUpdateAction extends ModelAction {
   type: 'entity:inherit:update';
   inheritIdx: number;
   inherit: any;
}

export interface EntityInheritDeleteAction extends ModelAction {
   type: 'entity:inherit:delete';
   inheritIdx: number;
}

export interface EntityInheritMoveUpAction extends ModelAction {
   type: 'entity:inherit:move-up';
   inheritIdx: number;
}

export interface EntityInheritMoveDownAction extends ModelAction {
   type: 'entity:inherit:move-down';
   inheritIdx: number;
}

export interface EntityIdentifierReorderAction extends ModelAction {
   type: 'entity:identifier:reorder-identifiers';
   identifiers: LogicalIdentifier[];
}

export type EntityDispatchAction =
   | EntityChangeNameAction
   | EntityChangeIdAction
   | EntityChangeDescriptionAction
   | LogicalAttributeUpdateAction
   | LogicalAttributeAddEmptyAction
   | LogicalAttributeDeleteAction
   | LogicalAttributeReorderAction
   | EntityIdentifierUpdateAction
   | EntityIdentifierAddAction
   | EntityIdentifierDeleteAction
   | EntityIdentifierReorderAction
   | CustomPropertyUpdateAction
   | CustomPropertyAddEmptyAction
   | CustomPropertyDeleteAction
   | EntityInheritAddAction
   | EntityInheritUpdateAction
   | EntityInheritDeleteAction
   | EntityInheritMoveUpAction
   | EntityInheritMoveDownAction
   | CustomPropertyReorderAction;

export function isEntityDispatchAction(action: DispatchAction): action is EntityDispatchAction {
   return action.type.startsWith('entity:');
}

export function EntityModelReducer(state: ModelState, action: EntityDispatchAction): ModelState {
   const entity = state.model.entity;
   if (entity === undefined) {
      throw Error('Model error: Entity action applied on undefined entity');
   }

   state.reason = action.type;

   switch (action.type) {
      case 'entity:change-name':
         entity.name = action.name;
         break;
      case 'entity:change-id':
         entity.id = action.id;
         break;
      case 'entity:change-description':
         entity.description = action.description;
         break;
      case 'entity:attribute:update': {
         entity.attributes[action.attributeIdx] = action.attribute;
         break;
      }
      case 'entity:attribute:add-attribute':
         entity.attributes.push(action.attribute);
         break;

      case 'entity:attribute:delete-attribute':
         entity.attributes.splice(action.attributeIdx, 1);
         break;

      case 'entity:attribute:reorder-attributes':
         entity.attributes = action.attributes;
         break;

      case 'entity:customProperty:update':
         entity.customProperties![action.customPropertyIdx] = action.customProperty;
         break;

      case 'entity:customProperty:add-customProperty':
         entity.customProperties!.push(action.customProperty);
         break;

      case 'entity:customProperty:delete-customProperty':
         entity.customProperties!.splice(action.customPropertyIdx, 1);
         break;

      case 'entity:customProperty:reorder-customProperties':
         entity.customProperties = action.customProperties;
         break;

      case 'entity:identifier:update':
         entity.identifiers = entity.identifiers || [];
         entity.identifiers[action.identifierIdx] = action.identifier;
         break;

      case 'entity:identifier:add-identifier':
         entity.identifiers = entity.identifiers || [];
         entity.identifiers.push(action.identifier);
         break;

      case 'entity:identifier:delete-identifier':
         entity.identifiers = entity.identifiers || [];
         entity.identifiers.splice(action.identifierIdx, 1);
         break;

      case 'entity:inherit:add':
         entity.inherits = entity.inherits || [];
         entity.inherits.push(action.inherit);
         break;

      case 'entity:inherit:update':
         entity.inherits = entity.inherits || [];
         entity.inherits[action.inheritIdx] = action.inherit;
         break;

      case 'entity:inherit:delete':
         entity.inherits = entity.inherits || [];
         entity.inherits.splice(action.inheritIdx, 1);
         break;

      case 'entity:inherit:move-up':
         entity.inherits = entity.inherits || [];
         moveUp(entity.inherits, action.inheritIdx);
         break;

      case 'entity:inherit:move-down':
         entity.inherits = entity.inherits || [];
         moveDown(entity.inherits, action.inheritIdx);
         break;

      case 'entity:identifier:reorder-identifiers':
         entity.identifiers = action.identifiers;
         break;

      default:
         unreachable(action);
   }
   return state;
}
