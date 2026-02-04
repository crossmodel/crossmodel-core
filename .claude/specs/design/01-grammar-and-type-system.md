# Grammar & ObjectDefinition Type System

## Overview

CrossModel uses [Langium](https://langium.org/) as its language server framework. The grammar defines a YAML-like DSL parsed into a typed AST. This document covers the grammar structure, the ObjectDefinition type hierarchy, and the built-in definitions.

## Grammar File Structure

All grammar files live in `packages/server/src/language-server/grammar/`:

| File | Purpose |
|------|---------|
| `terminals.langium` | Lexical tokens: STRING, ID, IDReference, NUMBER, VERSION, INDENT/DEDENT, LIST_ITEM, comments |
| `common.langium` | Shared interfaces (IdentifiedObject, NamedObject, TypedObject, etc.), fragments, ObjectDefinition (interface + parser rule), abstract definition subtypes for common types, CustomProperty, WithDataType, Cardinality |
| `cross-model.langium` | Entry rule `CrossModelRoot` — imports all sub-grammars |
| `entity.langium` | LogicalEntity, LogicalAttribute, LogicalIdentifier, EntityDefinition, AttributeDefinition, IdentifierDefinition |
| `relationship.langium` | Relationship, RelationshipAttribute, RelationshipDefinition |
| `datamodel.langium` | DataModel, DataModelDependency, DataModelDefinition |
| `mapping.langium` | Mapping, SourceObject, TargetObject, AttributeMapping, JoinCondition |
| `system-diagram.langium` | SystemDiagram, LogicalEntityNode, RelationshipEdge, InheritanceEdge |

## Interface Hierarchy

### Instance Type Hierarchy

The core interface hierarchy defines what properties each instance type has:

```text
IdentifiedObject { id }
  └── NamedObject { name, description }
       ├── TypedObject { type → ObjectDefinition }
       ├── DataElementContainer { type → ObjectDefinition }
       │    └── LogicalEntity (entity.langium)
       ├── DataElementContainerLink { type → ObjectDefinition }
       │    └── Relationship (relationship.langium)
       ├── DataElement { type → ObjectDefinition, datatype }
       │    └── LogicalAttribute (entity.langium)
       └── DataModel { type → ObjectDefinition, version, dependencies[] }
            (datamodel.langium)
```

### Definition Type Hierarchy (Parallel to Instance Types)

The ObjectDefinition subtype hierarchy **mirrors** the instance type hierarchy. Each common abstract interface has a corresponding abstract definition type:

```text
ObjectDefinition { abstract, extends → ObjectDefinition, customProperties[] }
  ├── DataElementDefinition { extends → DataElementDefinition }
  │    └── AttributeDefinition { extends → AttributeDefinition, datatype, length, precision, scale, mandatory }
  ├── DataElementContainerDefinition { extends → DataElementContainerDefinition }
  │    └── EntityDefinition { extends → EntityDefinition }
  ├── DataElementContainerLinkDefinition { extends → DataElementContainerLinkDefinition }
  │    └── RelationshipDefinition { extends → RelationshipDefinition, parentCardinality, childCardinality }
  ├── IdentifierDefinition { extends → IdentifierDefinition, primary }
  └── DataModelDefinition { extends → DataModelDefinition }
```

The abstract intermediate types (`DataElementDefinition`, `DataElementContainerDefinition`, `DataElementContainerLinkDefinition`) exist in `common.langium` alongside their instance counterparts. They have no extra properties of their own — they serve as structural grouping points so that the definition hierarchy is parallel to the instance hierarchy.

### Where Things Live

- The **interfaces and parser rule for ObjectDefinition** (the base) live in `common.langium`, alongside all common instance interfaces, fragments, and the abstract intermediate definition types.
- Each **concrete definition subtype** (e.g., `EntityDefinition`, `AttributeDefinition`) lives in the same grammar file as the instance type it describes (e.g., `entity.langium`).

### Key Interfaces

**TypedObject** — Base for instance types that have a type reference:

```langium
interface TypedObject extends NamedObject {
    type?: @ObjectDefinition;
}
```

The `type` property is a cross-reference to an ObjectDefinition, establishing the type→instance relationship.

**ObjectDefinition** — Base for all type definitions (interface + parser rule both in `common.langium`):

```langium
interface ObjectDefinition extends NamedObject, WithCustomProperties {
    abstract?: boolean;
    extends?: @ObjectDefinition;
}
```

- `abstract`: When true, the definition cannot be directly used as a type; it serves as a base for inheritance.
- `extends`: Cross-reference to a parent ObjectDefinition, forming an inheritance chain.
- `customProperties`: Array of CustomProperty items that serve as "property definitions" for instances.

**Abstract intermediate definition types** (all in `common.langium`):

```langium
interface DataElementDefinition extends ObjectDefinition {
    extends?: @DataElementDefinition;
}
interface DataElementContainerDefinition extends ObjectDefinition {
    extends?: @DataElementContainerDefinition;
}
interface DataElementContainerLinkDefinition extends ObjectDefinition {
    extends?: @DataElementContainerLinkDefinition;
}
```

These have no parser rules of their own — they are interface-only declarations. They exist solely so that `AttributeDefinition extends DataElementDefinition`, `EntityDefinition extends DataElementContainerDefinition`, etc., creating a type-safe parallel hierarchy.

**WithDataType** — Mixin for properties with data type metadata:

```langium
interface WithDataType {
    datatype?: string;
    length?: number;
    precision?: number;
    scale?: number;
    mandatory?: boolean;
}
```

**CustomProperty** — Property definitions within an ObjectDefinition:

```langium
interface CustomProperty extends NamedObject, WithDataType {
    type?: @ObjectDefinition;
    defaultValue?: CustomPropertyValue;
    values: CustomPropertyValue[];
    value?: string;
}
```

A CustomProperty itself can have a type reference (for nested type hierarchies) and can define allowed values, default values, and a current value.

## ObjectDefinition Subtypes

Each domain concept has its own definition subtype. The critical design choice is **type-scoped extends**: each subtype's `extends` property only accepts references to its own type, not just any ObjectDefinition.

### Why Type-Scoped Extends?

Without scoping, an EntityDefinition could mistakenly extend an AttributeDefinition, creating an invalid inheritance chain. The grammar enforces this at the parser level:

```langium
interface EntityDefinition extends ObjectDefinition {
    extends?: @EntityDefinition;  // NOT @ObjectDefinition
}
```

This means the autocompletion and validation automatically restrict the `extends` dropdown to show only EntityDefinition nodes when editing an EntityDefinition.

### Definition Subtypes and Their Properties

| Subtype | Extends | Grammar Keyword | Extra Properties | Domain |
|---------|---------|-----------------|------------------|--------|
| `ObjectDefinition` | *(base)* | `objectDefinition:` | (base only) | Generic / CustomProperty types |
| `DataElementDefinition` | `ObjectDefinition` | *(abstract, no keyword)* | (none) | Abstract parent for attribute defs |
| `AttributeDefinition` | `DataElementDefinition` | `attributeDefinition:` | datatype, length, precision, scale, mandatory | Attribute types |
| `DataElementContainerDefinition` | `ObjectDefinition` | *(abstract, no keyword)* | (none) | Abstract parent for entity defs |
| `EntityDefinition` | `DataElementContainerDefinition` | `entityDefinition:` | (none beyond base) | Entity types |
| `DataElementContainerLinkDefinition` | `ObjectDefinition` | *(abstract, no keyword)* | (none) | Abstract parent for relationship defs |
| `RelationshipDefinition` | `DataElementContainerLinkDefinition` | `relationshipDefinition:` | parentCardinality, childCardinality | Relationship types |
| `IdentifierDefinition` | `ObjectDefinition` | `identifierDefinition:` | primary | Identifier types |
| `DataModelDefinition` | `ObjectDefinition` | `datamodelDefinition:` | (none beyond base) | DataModel types |

### Parser Rules

The base `ObjectDefinition` parser rule lives in `common.langium`. Each concrete subtype has a parser rule in its respective grammar file. The abstract intermediate types (`DataElementDefinition`, etc.) have no parser rules — they are interface-only.

Example for AttributeDefinition (`entity.langium`):

```langium
AttributeDefinition returns AttributeDefinition:
    'attributeDefinition' ':' INDENT NamedObjectFragment
        (abstract?='abstract' ':' ('TRUE' | 'true'))?
        ('extends' ':' extends=[AttributeDefinition:IDReference])?
        DataTypePropertiesFragment
        CustomPropertiesFragment? DEDENT;
```

Key observations:

- The keyword (e.g., `attributeDefinition:`) determines the subtype at parse time.
- Fragments (`NamedObjectFragment`, `DataTypePropertiesFragment`, `CustomPropertiesFragment`) are reused across types.
- The `extends` reference is typed to `[AttributeDefinition:IDReference]`, not `[ObjectDefinition:IDReference]`.

### Entry Rule

The `CrossModelRoot` entry rule in `cross-model.langium` accepts all ObjectDefinition subtypes that have parser rules:

```langium
entry CrossModelRoot:
    objectDefinition=ObjectDefinition |
    objectDefinition=AttributeDefinition |
    objectDefinition=EntityDefinition |
    objectDefinition=RelationshipDefinition |
    objectDefinition=IdentifierDefinition |
    objectDefinition=DataModelDefinition |
    // ... other types (entity, relationship, mapping, etc.)
```

All definition subtypes are stored in the same `objectDefinition` property on `CrossModelRoot`. The abstract intermediate types (`DataElementDefinition`, etc.) do not appear here since they have no parser rules and cannot be instantiated directly from YAML files.

## Built-in Definitions

Built-in definitions are `.definition.cm` files shipped in `packages/server/src/language-server/builtin/`. They form the root of each type hierarchy and are always available in the workspace scope.

### Abstract Roots

These are abstract definitions that serve as the inheritance root for each domain:

```yaml
# Entity.definition.cm
entityDefinition:
    id: Entity
    name: "Entity"
    description: "Root definition for all entity types"
    abstract: TRUE

# Attribute.definition.cm
attributeDefinition:
    id: Attribute
    name: "Attribute"
    description: "Root definition for all attribute types"
    abstract: TRUE

# Relationship.definition.cm
relationshipDefinition:
    id: Relationship
    name: "Relationship"
    description: "Root definition for all relationship types"
    abstract: TRUE

# Identifier.definition.cm
identifierDefinition:
    id: Identifier
    name: "Identifier"
    description: "Root definition for all identifier types"
    abstract: TRUE

# DataModel.definition.cm
datamodelDefinition:
    id: DataModel
    name: "Data Model"
    description: "Root definition for all data model types"
    abstract: TRUE

# CustomProperty.definition.cm (uses generic objectDefinition)
objectDefinition:
    id: CustomProperty
    name: "Custom Property"
    description: "Root definition for custom property types"
    abstract: TRUE
```

### DataModel Type Hierarchy

Built-in DataModel subtypes form a concrete inheritance chain:

```
DataModel (abstract)
  ├── ConceptualDataModel
  ├── LogicalDataModel
  └── PhysicalDataModel (abstract)
       └── RelationalDataModel
```

Each is a `datamodelDefinition:` file with an `extends` reference to its parent.

## File Type Detection

The file `packages/protocol/src/model.ts` handles mapping content keywords to file types:

```typescript
detectFileType(content: string): ModelFileType | undefined {
    if (content.startsWith('objectDefinition') ||
        content.startsWith('attributeDefinition') ||
        content.startsWith('entityDefinition') ||
        content.startsWith('relationshipDefinition') ||
        content.startsWith('identifierDefinition') ||
        content.startsWith('datamodelDefinition')) {
        return 'ObjectDefinition';
    }
    // ... other types
}
```

All definition subtypes map to the single `ObjectDefinition` file type, sharing the `.definition.cm` file extension and the `definitions/` folder.

## Code Generation

After modifying any `.langium` file, run:

```bash
yarn langium:generate
```

This regenerates `packages/server/src/language-server/generated/ast.ts` (TypeScript interfaces, type guards like `isAttributeDefinition()`, and type metadata) and `generated/grammar.ts` (serialized grammar for the parser).

## Scope Provider: Domain-Aware Filtering

The scope provider (`cross-model-scope-provider.ts`) uses a `TYPE_DOMAIN_MAP` to restrict which ObjectDefinition subtypes appear in reference completion for each instance type:

```typescript
const TYPE_DOMAIN_MAP: Record<string, string> = {
    'LogicalEntity': 'Entity',
    'LogicalAttribute': 'Attribute',
    'Relationship': 'Relationship',
    'LogicalIdentifier': 'Identifier',
    'DataModel': 'DataModel',
    // Definition subtypes map to their domain root
    'EntityDefinition': 'Entity',
    'AttributeDefinition': 'Attribute',
    'RelationshipDefinition': 'Relationship',
    'IdentifierDefinition': 'Identifier',
    'DataModelDefinition': 'DataModel',
};
```

When completing the `type` field of a LogicalEntity, only definitions that are subtypes of `Entity` (i.e., EntityDefinition nodes whose root ancestor is the built-in `Entity` definition) are shown. Abstract definitions are also filtered out from instance type selection.

The scope provider uses `reflection.isSubtype(description.type, 'ObjectDefinition')` to match all definition subtypes (including the abstract intermediate types) rather than checking for `ObjectDefinition` exactly.
