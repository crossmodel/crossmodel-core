/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import { Dimension, Point } from '@eclipse-glsp/server';
import { Reference } from 'langium';
import {
   CrossModelRoot,
   LogicalAttribute,
   LogicalEntity,
   LogicalEntityAttribute,
   LogicalEntityNode,
   Relationship,
   RelationshipEdge,
   SystemDiagram
} from '../../../src/language-server/ast';

export function createLogicalEntity(
   container: CrossModelRoot,
   id: string,
   name: string,
   opts?: Partial<Omit<LogicalEntity, '$container' | '$type' | 'id' | 'name'>>
): LogicalEntity {
   return {
      $container: container,
      $type: LogicalEntity.$type,
      id,
      name,
      attributes: [],
      identifiers: [],
      customProperties: [],
      inherits: [],
      ...opts
   };
}

export function createLogicalAttribute(
   container: LogicalEntity,
   id: string,
   name: string,
   opts?: Partial<Omit<LogicalAttribute, '$container' | '$type' | 'id' | 'name'>>
): LogicalEntityAttribute {
   return {
      $container: container,
      $type: LogicalEntityAttribute.$type,
      _primary: false,
      id,
      name,
      customProperties: [],
      mandatory: false,
      ...opts
   };
}

export function createRelationship(
   container: CrossModelRoot,
   id: string,
   name: string,
   parent: Reference<LogicalEntity>,
   child: Reference<LogicalEntity>,
   opts?: Partial<Omit<Relationship, '$container' | '$type' | 'id' | 'name' | 'parent' | 'child'>>
): Relationship {
   return {
      $container: container,
      $type: Relationship.$type,
      id,
      name,
      parent,
      child,
      attributes: [],
      customProperties: [],
      ...opts
   };
}

export function createSystemDiagram(
   container: CrossModelRoot,
   id: string,
   opts?: Partial<Omit<SystemDiagram, '$container' | '$type' | 'id'>>
): SystemDiagram {
   return {
      $container: container,
      $type: SystemDiagram.$type,
      id,
      nodes: [],
      edges: [],
      ...opts
   };
}

export function createEntityNode(
   container: SystemDiagram,
   id: string,
   entity: Reference<LogicalEntity>,
   position: Point,
   dimension: Dimension,
   opts?: Partial<Omit<LogicalEntityNode, '$container' | '$type' | 'id' | 'entity'>>
): LogicalEntityNode {
   return {
      $container: container,
      $type: LogicalEntityNode.$type,
      _attributes: [],
      id,
      entity,
      ...position,
      ...dimension,
      ...opts
   };
}

export function createRelationshipEdge(
   container: SystemDiagram,
   id: string,
   relationship: Reference<Relationship>,
   sourceNode: Reference<LogicalEntityNode>,
   targetNode: Reference<LogicalEntityNode>,
   opts?: Partial<Omit<RelationshipEdge, '$container' | '$type' | 'id' | 'relationship' | 'sourceNode' | 'targetNode'>>
): RelationshipEdge {
   return {
      $container: container,
      $type: RelationshipEdge.$type,
      id,
      relationship,
      sourceNode,
      targetNode,
      ...opts
   };
}
