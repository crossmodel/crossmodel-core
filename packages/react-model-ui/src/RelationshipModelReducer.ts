/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { Cardinality, CustomProperty, RelationshipAttribute, unreachable } from '@crossmodel/protocol';
import { DispatchAction, ModelAction, ModelState, undefinedIfEmpty } from './ModelReducer';

export interface RelationshipChangeNameAction extends ModelAction {
   type: 'relationship:change-name';
   name: string;
}

export interface RelationshipChangeIdAction extends ModelAction {
   type: 'relationship:change-id';
   id: string;
}

export interface RelationshipChangeDescriptionAction extends ModelAction {
   type: 'relationship:change-description';
   description: string;
}

export interface RelationshipChangeParentAction extends ModelAction {
   type: 'relationship:change-parent';
   parent?: string;
}

export interface RelationshipChangeParentCardinalityAction extends ModelAction {
   type: 'relationship:change-parent-cardinality';
   parentCardinality: Cardinality;
}

export interface RelationshipChangeParentRoleAction extends ModelAction {
   type: 'relationship:change-parent-role';
   parentRole: string;
}

export interface RelationshipChangeChildAction extends ModelAction {
   type: 'relationship:change-child';
   child?: string;
}

export interface RelationshipChangeChildCardinalityAction extends ModelAction {
   type: 'relationship:change-child-cardinality';
   childCardinality: Cardinality;
}

export interface RelationshipChangeChildRoleAction extends ModelAction {
   type: 'relationship:change-child-role';
   childRole: string;
}

export interface RelationshipAttributeUpdateAction extends ModelAction {
   type: 'relationship:attribute:update';
   attributeIdx: number;
   attribute: RelationshipAttribute;
}

export interface RelationshipAttributeAddEmptyAction extends ModelAction {
   type: 'relationship:attribute:add';
   attribute: RelationshipAttribute;
}

export interface RelationshipAttributeDeleteAction extends ModelAction {
   type: 'relationship:attribute:delete-attribute';
   attributeIdx: number;
}

export interface RelationshipAttributeReorderAction extends ModelAction {
   type: 'relationship:attribute:reorder-attributes';
   attributes: RelationshipAttribute[];
}

export interface CustomPropertyUpdateAction extends ModelAction {
   type: 'relationship:customProperty:update';
   customPropertyIdx: number;
   customProperty: CustomProperty;
}

export interface CustomPropertyAddEmptyAction extends ModelAction {
   type: 'relationship:customProperty:add-customProperty';
   customProperty: CustomProperty;
}

export interface CustomPropertyDeleteAction extends ModelAction {
   type: 'relationship:customProperty:delete-customProperty';
   customPropertyIdx: number;
}

export interface CustomPropertyReorderAction extends ModelAction {
   type: 'relationship:customProperty:reorder-customProperties';
   customProperties: CustomProperty[];
}

export type RelationshipDispatchAction =
   | RelationshipChangeNameAction
   | RelationshipChangeIdAction
   | RelationshipChangeDescriptionAction
   | RelationshipChangeParentAction
   | RelationshipChangeParentCardinalityAction
   | RelationshipChangeParentRoleAction
   | RelationshipChangeChildAction
   | RelationshipChangeChildCardinalityAction
   | RelationshipChangeChildRoleAction
   | RelationshipAttributeUpdateAction
   | RelationshipAttributeAddEmptyAction
   | RelationshipAttributeDeleteAction
   | RelationshipAttributeReorderAction
   | CustomPropertyUpdateAction
   | CustomPropertyAddEmptyAction
   | CustomPropertyDeleteAction
   | CustomPropertyReorderAction;

export function isRelationshipDispatchAction(action: DispatchAction): action is RelationshipDispatchAction {
   return action.type.startsWith('relationship:');
}

export function RelationshipModelReducer(state: ModelState, action: RelationshipDispatchAction): ModelState {
   const relationship = state.model.relationship;
   if (relationship === undefined) {
      throw Error('Model error: Relationship action applied on undefined relationship');
   }

   switch (action.type) {
      case 'relationship:change-name':
         relationship.name = undefinedIfEmpty(action.name);
         break;

      case 'relationship:change-id':
         relationship.id = action.id;
         break;

      case 'relationship:change-description':
         relationship.description = undefinedIfEmpty(action.description);
         break;

      case 'relationship:change-parent':
         relationship.parent = action.parent;
         break;

      case 'relationship:change-parent-cardinality':
         relationship.parentCardinality = undefinedIfEmpty(action.parentCardinality);
         break;

      case 'relationship:change-parent-role':
         relationship.parentRole = undefinedIfEmpty(action.parentRole);
         break;

      case 'relationship:change-child':
         relationship.child = action.child;
         break;

      case 'relationship:change-child-cardinality':
         relationship.childCardinality = undefinedIfEmpty(action.childCardinality);
         break;

      case 'relationship:change-child-role':
         relationship.childRole = undefinedIfEmpty(action.childRole);
         break;

      case 'relationship:attribute:update':
         relationship.attributes[action.attributeIdx] = action.attribute;
         break;

      case 'relationship:attribute:add':
         relationship.attributes.push(action.attribute);
         break;

      case 'relationship:attribute:delete-attribute':
         relationship.attributes.splice(action.attributeIdx, 1);
         break;

      case 'relationship:attribute:reorder-attributes':
         relationship.attributes = action.attributes;
         break;

      case 'relationship:customProperty:update':
         relationship.customProperties![action.customPropertyIdx] = {
            ...action.customProperty,
            name: undefinedIfEmpty(action.customProperty.name),
            description: undefinedIfEmpty(action.customProperty.description)
         };
         break;

      case 'relationship:customProperty:add-customProperty':
         relationship.customProperties!.push(action.customProperty);
         break;

      case 'relationship:customProperty:delete-customProperty':
         relationship.customProperties!.splice(action.customPropertyIdx, 1);
         break;

      case 'relationship:customProperty:reorder-customProperties':
         relationship.customProperties = action.customProperties;
         break;

      default:
         return unreachable(action);
   }
   return state;
}
