/********************************************************************************
 * Copyright (c) 2025 CrossBreeze.
 ********************************************************************************/

/**
 * Built-in ObjectDefinition documents that are globally available to all workspaces.
 * These serve as the root anchors for the definition hierarchy.
 */

export interface BuiltinDefinition {
   /** The ID used in references (e.g., 'Entity', 'LogicalDataModel'). */
   id: string;
   /** The YAML content of the .definition.cm file. */
   content: string;
}

/** URI scheme for built-in definition documents. */
export const BUILTIN_SCHEME = 'builtin';

/** All built-in ObjectDefinition documents. */
export const BUILTIN_DEFINITIONS: readonly BuiltinDefinition[] = [
   // Domain root definitions (abstract, no extends)
   {
      id: 'Entity',
      content: `objectDefinition:
    id: Entity
    name: "Entity"
    description: "Root definition for all entity types"
    abstract: TRUE
`
   },
   {
      id: 'Attribute',
      content: `objectDefinition:
    id: Attribute
    name: "Attribute"
    description: "Root definition for all attribute types"
    abstract: TRUE
`
   },
   {
      id: 'Identifier',
      content: `objectDefinition:
    id: Identifier
    name: "Identifier"
    description: "Root definition for all identifier types"
    abstract: TRUE
`
   },
   {
      id: 'Relationship',
      content: `objectDefinition:
    id: Relationship
    name: "Relationship"
    description: "Root definition for all relationship types"
    abstract: TRUE
`
   },
   {
      id: 'CustomProperty',
      content: `objectDefinition:
    id: CustomProperty
    name: "Custom Property"
    description: "Root definition for custom property types"
    abstract: TRUE
`
   },

   // DataModel hierarchy
   {
      id: 'DataModel',
      content: `objectDefinition:
    id: DataModel
    name: "Data Model"
    description: "Root definition for all data model types"
    abstract: TRUE
`
   },
   {
      id: 'ConceptualDataModel',
      content: `objectDefinition:
    id: ConceptualDataModel
    name: "Conceptual Data Model"
    description: "A conceptual data model"
    extends: DataModel
`
   },
   {
      id: 'LogicalDataModel',
      content: `objectDefinition:
    id: LogicalDataModel
    name: "Logical Data Model"
    description: "A logical data model"
    extends: DataModel
`
   },
   {
      id: 'PhysicalDataModel',
      content: `objectDefinition:
    id: PhysicalDataModel
    name: "Physical Data Model"
    description: "A physical data model"
    abstract: TRUE
    extends: DataModel
`
   },
   {
      id: 'RelationalDataModel',
      content: `objectDefinition:
    id: RelationalDataModel
    name: "Relational Data Model"
    description: "A relational data model"
    extends: PhysicalDataModel
`
   }
];
