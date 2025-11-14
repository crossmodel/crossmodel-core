/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

import { CustomProperty, LogicalAttribute, LogicalIdentifier as ProtocolLogicalIdentifier, unreachable } from '@crossmodel/protocol';
import { DispatchAction, ModelAction, ModelState, moveDown, moveUp, undefinedIfEmpty } from './ModelReducer';

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
   attribute: LogicalAttribute;
}

export interface LogicalAttributeAddEmptyAction extends ModelAction {
   type: 'entity:attribute:add-attribute';
   attribute: LogicalAttribute;
}

export interface LogicalAttributeMoveUpAction extends ModelAction {
   type: 'entity:attribute:move-attribute-up';
   attributeIdx: number;
}

export interface LogicalAttributeMoveDownAction extends ModelAction {
   type: 'entity:attribute:move-attribute-down';
   attributeIdx: number;
}

export interface LogicalAttributeDeleteAction extends ModelAction {
   type: 'entity:attribute:delete-attribute';
   attributeIdx: number;
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

export interface CustomPropertyMoveUpAction extends ModelAction {
   type: 'entity:customProperty:move-customProperty-up';
   customPropertyIdx: number;
}

export interface CustomPropertyMoveDownAction extends ModelAction {
   type: 'entity:customProperty:move-customProperty-down';
   customPropertyIdx: number;
}

export interface CustomPropertyDeleteAction extends ModelAction {
   type: 'entity:customProperty:delete-customProperty';
   customPropertyIdx: number;
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

export type EntityDispatchAction =
   | EntityChangeNameAction
   | EntityChangeIdAction
   | EntityChangeDescriptionAction
   | LogicalAttributeUpdateAction
   | LogicalAttributeAddEmptyAction
   | LogicalAttributeMoveUpAction
   | LogicalAttributeMoveDownAction
   | LogicalAttributeDeleteAction
   | EntityIdentifierUpdateAction
   | EntityIdentifierAddAction
   | EntityIdentifierDeleteAction
   | CustomPropertyUpdateAction
   | CustomPropertyAddEmptyAction
   | CustomPropertyMoveUpAction
   | CustomPropertyMoveDownAction
   | CustomPropertyDeleteAction
   | EntityInheritAddAction
   | EntityInheritUpdateAction
   | EntityInheritDeleteAction
   | EntityInheritMoveUpAction
   | EntityInheritMoveDownAction;

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
         entity.name = undefinedIfEmpty(action.name);
         break;
      case 'entity:change-id':
         entity.id = action.id;
         break;
      case 'entity:change-description':
         entity.description = undefinedIfEmpty(action.description);
         break;

      case 'entity:attribute:update': {
         // Filter out identifier property and update required fields
         const cleanAttribute = { ...action.attribute };
         delete cleanAttribute.identifier;
         entity.attributes[action.attributeIdx] = {
            ...cleanAttribute,
            name: undefinedIfEmpty(cleanAttribute.name),
            description: undefinedIfEmpty(cleanAttribute.description)
         };
         break;
      }

      case 'entity:attribute:add-attribute': {
         // Filter out identifier property when adding new attribute
         const cleanAttribute = { ...action.attribute };
         delete cleanAttribute.identifier;
         entity.attributes.push(cleanAttribute);
         break;
      }

      case 'entity:attribute:delete-attribute':
         entity.attributes.splice(action.attributeIdx, 1);
         break;

      case 'entity:attribute:move-attribute-up':
         moveUp(entity.attributes, action.attributeIdx);
         break;

      case 'entity:attribute:move-attribute-down':
         moveDown(entity.attributes, action.attributeIdx);
         break;

      case 'entity:customProperty:update':
         entity.customProperties![action.customPropertyIdx] = {
            ...action.customProperty,
            name: undefinedIfEmpty(action.customProperty.name),
            description: undefinedIfEmpty(action.customProperty.description)
         };
         break;

      case 'entity:customProperty:add-customProperty':
         entity.customProperties!.push(action.customProperty);
         break;

      case 'entity:customProperty:delete-customProperty':
         entity.customProperties!.splice(action.customPropertyIdx, 1);
         break;

      case 'entity:customProperty:move-customProperty-up':
         moveUp(entity.customProperties!, action.customPropertyIdx);
         break;

      case 'entity:customProperty:move-customProperty-down':
         moveDown(entity.customProperties!, action.customPropertyIdx);
         break;

      case 'entity:identifier:update':
         entity.identifiers = entity.identifiers || [];
         entity.identifiers[action.identifierIdx] = {
            ...action.identifier,
            description: undefinedIfEmpty(action.identifier.description)
         };
         break;

      case 'entity:identifier:add-identifier':
         entity.identifiers = entity.identifiers || [];
         entity.identifiers.push({
            ...action.identifier,
            description: undefinedIfEmpty(action.identifier.description)
         });
         break;

      case 'entity:identifier:delete-identifier':
         entity.identifiers = entity.identifiers || [];
         entity.identifiers.splice(action.identifierIdx, 1);
         break;

      case 'entity:inherit:add':
         (entity as any).superEntities = (entity as any).superEntities || [];
         (entity as any).superEntities.push(typeof action.inherit === 'string' ? action.inherit : action.inherit);
         break;

      case 'entity:inherit:update':
         (entity as any).superEntities = (entity as any).superEntities || [];
         (entity as any).superEntities[action.inheritIdx] = typeof action.inherit === 'string' ? action.inherit : action.inherit;
         break;

      case 'entity:inherit:delete':
         (entity as any).superEntities = (entity as any).superEntities || [];
         (entity as any).superEntities.splice(action.inheritIdx, 1);
         break;

      case 'entity:inherit:move-up':
         (entity as any).superEntities = (entity as any).superEntities || [];
         moveUp((entity as any).superEntities, action.inheritIdx);
         break;

      case 'entity:inherit:move-down':
         (entity as any).superEntities = (entity as any).superEntities || [];
         moveDown((entity as any).superEntities, action.inheritIdx);
         break;

      default:
         unreachable(action);
   }
   return state;
}
