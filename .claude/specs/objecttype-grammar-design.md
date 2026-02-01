# ObjectDefinition Grammar Design

## Overview

This design introduces a **generic `ObjectDefinition`** as a new root-level element that serves as a type definition for any typed object in the system. ObjectDefinitions define **custom property definitions** (with datatypes, allowed values, defaults, and mandatory flags) and support **definition-to-definition inheritance** through an `extends` property.

A clear separation is made between **object definitions** and **object instances**:

- **ObjectDefinition** (the definition hierarchy): Uses `extends` to reference a parent ObjectDefinition. This is the mechanism for building the type tree (e.g., `DataVaultHub extends DataVaultEntity extends Entity`).
- **TypedObject** (instances): Uses `type` to reference an ObjectDefinition. This is how domain objects declare which type they are (e.g., `CustomerHub` has `type: DataVaultHub`).

### Type Hierarchy

```text
IdentifiedObject            { id }
    └── NamedObject          { name, description }
            ├── TypedObject  { type: @ObjectDefinition }     ← for instances
            │       ├── DataElementContainer
            │       │       └── LogicalEntity
            │       ├── DataElement
            │       │       └── LogicalAttribute
            │       ├── DataElementContainerLink
            │       │       └── Relationship
            │       ├── LogicalIdentifier
            │       ├── DataModel
            │       └── CustomProperty
            │
            └── ObjectDefinition  { extends: @ObjectDefinition, propertyDefinitions }   ← for definitions
```

Objects that remain at `IdentifiedObject` level (no `type` property):
- `SystemDiagram`, `Mapping`, `SourceObject`, `LogicalEntityNode`, `SystemDiagramEdge`, `RelationshipEdge`, `InheritanceEdge`

These are structural/diagram objects rather than domain instances, so they don't participate in the type system. They could be promoted to TypedObject in the future if needed.

### Design Decisions

The following decisions were made during the design process:

- **ObjectDefinition is a root-level element** stored in its own file (like entity, relationship, mapping).
- **Clear separation of definitions vs instances**: ObjectDefinition uses `extends` for inheritance; TypedObject uses `type` for instance typing.
- **`extends` is ONLY on ObjectDefinition**. It references a parent ObjectDefinition, forming the definition hierarchy.
- **`type` is ONLY on TypedObject**. It references an ObjectDefinition, declaring the instance's type.
- **TypedObject sits between NamedObject and domain objects** in the interface hierarchy.
- **ObjectDefinition extends NamedObject** (not TypedObject) — definitions are not instances and don't have a `type` property.
- **Default values use a separate `defaultValue` property** rather than marking a value in the values list.
- **Single generic `ObjectDefinition` in grammar**. Polymorphic resolution (is this an Entity definition?) happens in TypeScript by walking the `extends` chain to a built-in root.
- **All ObjectDefinition rules live in a single new `objectdefinition.langium` file.**
- **CustomPropertyDefinition `datatype`** uses the same free-form STRING as LogicalAttribute.
- **Mandatory custom property enforcement** is handled by validation rules, not the grammar.
- **Custom property `values` list entries match the datatype** (STRING, NUMBER, or BOOLEAN).
- **Built-in root ObjectDefinitions** are shipped with the system and anchor the definition hierarchy.
- **`type` on TypedObject is a reference** (`@ObjectDefinition`), not a string.
- **`extends` on ObjectDefinition is a reference** (`@ObjectDefinition`), not a string.
- **DataModel has no special `modelType` field**. The old `type: conceptual | logical | relational` enum is replaced by the ObjectDefinition hierarchy (`DataModel` → `ConceptualDataModel`, `LogicalDataModel`, `PhysicalDataModel` → `RelationalDataModel`). DataModel is a regular TypedObject with `type: LogicalDataModel`.
- **Three-way naming convention for built-in definitions**: Each built-in root definition has three distinct representations: (1) **AST class** — the TypeScript/Langium interface name, suffixed with "Definition" (e.g., `ObjectDefinition`); (2) **Filename** — the `.definition.cm` file name (e.g., `Entity.definition.cm`); (3) **ID** — the short identifier used in `extends:` and `type:` references, matching the filename stem (e.g., `Entity`). The ID does NOT include "Definition" — it serves as a concise, readable identifier for the concept.

---

## 1. Changes to `common.langium` — TypedObject and interface hierarchy

### IdentifiedObject (unchanged from baseline)

`IdentifiedObject` has no `type` property. It only provides `id`.

```langium
interface IdentifiedObject {
    id?: string;
}

fragment IdentifiedObjectFragment:
    'id' ':' (id=ID)?;
```

### NamedObject (unchanged from baseline)

```langium
interface NamedObject extends IdentifiedObject {
    name?: string;
    description?: string;
}

fragment NamedObjectFragment:
    IdentifiedObjectFragment
    ('name' ':' name=STRING)?
    ('description' ':' description=STRING)?
;
```

### TypedObject (NEW)

A new interface between `NamedObject` and domain instance objects. Adds the `type` property that references an ObjectDefinition.

```langium
interface TypedObject extends NamedObject {
    type?: @ObjectDefinition;
}

fragment TypedObjectFragment:
    NamedObjectFragment
    ('type' ':' type=[ObjectDefinition:IDReference])?
;
```

All domain instance objects that should be typed will use `TypedObjectFragment` instead of `NamedObjectFragment`, and their interfaces will extend `TypedObject` (directly or through intermediate interfaces that are changed to extend `TypedObject`).

### ObjectDefinition (forward declaration)

ObjectDefinition extends `NamedObject` (NOT `TypedObject`) — it has no `type` property. Instead, it uses `extends` for definition-to-definition inheritance.

```langium
// Forward declaration of ObjectDefinition (parser rule in objectdefinition.langium)
interface ObjectDefinition extends NamedObject, WithCustomProperties {
    extends?: @ObjectDefinition;
    propertyDefinitions: CustomPropertyDefinition[];
}
```

### Updated intermediate interfaces

The following intermediate interfaces in `common.langium` need to be changed to extend `TypedObject` instead of `NamedObject`:

```langium
interface DataElementContainer extends TypedObject {
}

interface DataElementContainerLink extends TypedObject {
}

interface DataElement extends TypedObject {
    datatype?: string;
}
```

These remain unchanged (they don't use the type system):
```langium
interface DataElementContainerMapping extends IdentifiedObject {
}

interface SourceDataElementContainer extends IdentifiedObject {
}

interface DataElementMapping extends IdentifiedObject {
}
```

### CustomProperty (updated to extend TypedObject)

CustomProperty becomes a TypedObject so instances can declare their type:

```langium
interface CustomProperty extends TypedObject {
    value?: string;
}

CustomProperty returns CustomProperty:
    TypedObjectFragment
    ('value' ':' value=STRING)?;
```

---

## 2. Changes to `common.langium` — CustomPropertyDefinition

The existing `CustomProperty` remains for **instance-level** custom properties (values set on actual objects). `CustomPropertyDefinition` is for **type-level** property definitions on ObjectDefinition.

### CustomPropertyDefinition

`CustomPropertyDefinition` extends `NamedObject` (not TypedObject). Property definitions describe the schema and are part of the definition world, not the instance world.

```langium
interface CustomPropertyDefinition extends NamedObject {
    datatype?: string;
    length?: number;
    precision?: number;
    scale?: number;
    mandatory?: boolean;
    defaultValue?: CustomPropertyValue;
    values: CustomPropertyValue[];
}

CustomPropertyDefinition returns CustomPropertyDefinition:
    NamedObjectFragment
    ('datatype' ':' datatype=STRING)?
    ('length' ':' length=NUMBER)?
    ('precision' ':' precision=NUMBER)?
    ('scale' ':' scale=NUMBER)?
    (mandatory?='mandatory' ':' ('TRUE' | 'true'))?
    ('defaultValue' ':' defaultValue=CustomPropertyValue)?
    ('values' ':'
        INDENT
            (LIST_ITEM values+=CustomPropertyValue)+
        DEDENT
    )?
;

CustomPropertyValue:
    {infer StringValue} value=STRING |
    {infer NumberValue} value=NUMBER |
    {infer BooleanValue} value=BOOLEAN_VALUE;

BOOLEAN_VALUE returns string: 'TRUE' | 'true' | 'FALSE' | 'false';
```

### Property descriptions

| Property | Type | Description |
|---|---|---|
| `datatype` | `STRING` | Free-form datatype string (same as LogicalAttribute), e.g. `"Text"`, `"Integer"`, `"DateTime"` |
| `length` | `NUMBER` | Constrains string/text length |
| `precision` | `NUMBER` | Numeric precision |
| `scale` | `NUMBER` | Numeric scale |
| `mandatory` | `boolean` | When true, instances of this ObjectDefinition must provide a value for this property |
| `defaultValue` | `CustomPropertyValue` | A single default value |
| `values` | `CustomPropertyValue[]` | Allowed values list, restricts input to these options |

---

## 3. New file: `objectdefinition.langium`

```langium
import 'terminals'
import 'common'

// ObjectDefinition parser rule — interface is declared in common.langium to avoid circular imports.
// ObjectDefinition is a type definition for any TypedObject subtype.
// The `extends` field references a parent ObjectDefinition, forming the definition
// inheritance chain. Walking the `extends` chain up to a built-in root determines
// what domain concept this ObjectDefinition applies to.
ObjectDefinition returns ObjectDefinition:
    'objectDefinition' ':'
        INDENT
            NamedObjectFragment
            ('extends' ':' extends=[ObjectDefinition:IDReference])?
            ('properties' ':'
                INDENT
                    (LIST_ITEM propertyDefinitions+=CustomPropertyDefinition)+
                DEDENT
            )?
            CustomPropertiesFragment?
        DEDENT
;
```

### Key points

- `ObjectDefinition` extends `NamedObject` — it has `id`, `name`, `description` but **no `type`** property.
- The `extends` field references a parent ObjectDefinition. Setting `extends: DataVaultEntity` on `DataVaultHub` means "DataVaultHub is a subtype of DataVaultEntity".
- Domain classification is determined by walking the `extends` chain to a built-in root type (e.g. `Entity`, `Relationship`).
- `propertyDefinitions` contains `CustomPropertyDefinition[]` — the custom properties this type introduces.
- `customProperties` (from `WithCustomProperties`) allows ad-hoc metadata on the type definition itself.

---

## 4. Changes to `cross-model.langium`

```langium
grammar CrossModel

import 'datamodel'
import 'entity'
import 'relationship'
import 'system-diagram'
import 'mapping'
import 'objectdefinition'

entry CrossModelRoot:
    (datamodel=DataModel |
    entity=LogicalEntity |
    relationship=Relationship |
    systemDiagram=SystemDiagram |
    mapping=Mapping |
    objectDefinition=ObjectDefinition)?;
```

---

## 5. Changes to domain grammar files

### `entity.langium`

`LogicalEntity` extends `DataElementContainer` which now extends `TypedObject`. Its parser rule changes from `NamedObjectFragment` to `TypedObjectFragment`:

```langium
LogicalEntity returns LogicalEntity:
    'entity' ':'
        INDENT
            TypedObjectFragment       // was: NamedObjectFragment
            ...
```

`LogicalAttribute` extends `DataElement` which now extends `TypedObject`. Its parser rule changes:

```langium
LogicalAttribute returns LogicalAttribute:
    TypedObjectFragment               // was: NamedObjectFragment
    ...
```

`LogicalIdentifier` changes to extend `TypedObject` instead of `NamedObject`:

```langium
interface LogicalIdentifier extends TypedObject, WithCustomProperties {
    ...
}

LogicalIdentifier returns LogicalIdentifier:
    TypedObjectFragment               // was: NamedObjectFragment
    ...
```

### `relationship.langium`

`Relationship` extends `DataElementContainerLink` which now extends `TypedObject`. Its parser rule changes:

```langium
Relationship returns Relationship:
    'relationship' ':'
        INDENT
            TypedObjectFragment       // was: NamedObjectFragment
            ...
```

`RelationshipAttribute` does NOT extend IdentifiedObject/NamedObject, so it is not affected.

### `datamodel.langium`

`DataModel` extends `TypedObject, WithCustomProperties`. The old `modelType` field and `DataModelType` enum are **removed entirely**. DataModel becomes a regular TypedObject that uses `type` to reference its ObjectDefinition (e.g., `type: LogicalDataModel`).

```langium
interface DataModel extends TypedObject, WithCustomProperties {
    version?: string;
    dependencies: DataModelDependency[];
}

DataModel returns DataModel:
    'datamodel' ':'
        INDENT
            TypedObjectFragment
            ('version' ':' version=VERSION)?
            ('dependencies' ':'
                INDENT
                    (LIST_ITEM dependencies+=DataModelDependency)+
                DEDENT
            )?
            CustomPropertiesFragment?
        DEDENT
;
```

The `DataModelType` rule (`'conceptual' | 'logical' | 'relational'`) is removed. The `type` keyword is now used exclusively for the ObjectDefinition reference (from `TypedObjectFragment`).

**Note on DataModel interface inheritance**: `DataModel` previously extended `NamedObject` (via the intermediate interface chain). Since `DataElementContainerMapping` (which DataModel extends via its other interfaces) extends `IdentifiedObject`, and DataModel also needs the typed behavior, we change it to:

```langium
interface DataModel extends TypedObject, WithCustomProperties {
    version?: string;
    dependencies: DataModelDependency[];
}
```

This gives DataModel: `id`, `name`, `description` (from NamedObject via TypedObject), `type` (from TypedObject), `version`, `dependencies`, and `customProperties` (from WithCustomProperties).

### `mapping.langium`

No changes — `Mapping` extends `DataElementContainerMapping → IdentifiedObject` and uses `IdentifiedObjectFragment`. Same for `SourceObject`.

### `system-diagram.langium`

No changes — `SystemDiagram` extends `IdentifiedObject` and uses `IdentifiedObjectFragment`.

---

## 6. Built-in Root ObjectDefinitions

The system ships with predefined root ObjectDefinitions that users cannot modify. These serve as the anchors for the definition hierarchy. These root types **are** the domain classifiers — an ObjectDefinition is an "entity definition" if its `extends` chain leads to the built-in `Entity` root.

### Naming convention

Each built-in definition has three distinct representations:

| Aspect | Convention | Example |
|---|---|---|
| **AST class** | The Langium/TypeScript interface (shared: `ObjectDefinition`) | `ObjectDefinition` |
| **Filename** | `{Id}.definition.cm` | `Entity.definition.cm` |
| **ID** | Short, readable identifier — no "Definition" suffix | `Entity` |

The ID is what appears in `extends:` and `type:` references in `.cm` files (e.g., `extends: Entity`, `type: DataVaultHub`).

### Domain root definitions

| Built-in ID | Filename | Domain | Description |
|---|---|---|---|
| `Entity` | `Entity.definition.cm` | entity | Root definition for all entity types |
| `Attribute` | `Attribute.definition.cm` | attribute | Root definition for all attribute types |
| `Identifier` | `Identifier.definition.cm` | identifier | Root definition for all identifier types |
| `Relationship` | `Relationship.definition.cm` | relationship | Root definition for all relationship types |
| `CustomProperty` | `CustomProperty.definition.cm` | customProperty | Root definition for custom property types |

### DataModel definition hierarchy

The old `DataModelType` enum (`conceptual | logical | relational`) is replaced by a built-in ObjectDefinition hierarchy:

```text
DataModel                            (root for all data model types)
    ├── ConceptualDataModel          (conceptual data models)
    ├── LogicalDataModel             (logical data models)
    └── PhysicalDataModel            (physical data models)
            └── RelationalDataModel  (relational data models)
```

These are shipped as built-in `.definition.cm` files:

```yaml
# DataModel.definition.cm
objectDefinition:
    id: DataModel
    name: "Data Model"
    description: "Root definition for all data model types"
```

```yaml
# ConceptualDataModel.definition.cm
objectDefinition:
    id: ConceptualDataModel
    name: "Conceptual Data Model"
    description: "A conceptual data model"
    extends: DataModel
```

```yaml
# LogicalDataModel.definition.cm
objectDefinition:
    id: LogicalDataModel
    name: "Logical Data Model"
    description: "A logical data model"
    extends: DataModel
```

```yaml
# PhysicalDataModel.definition.cm
objectDefinition:
    id: PhysicalDataModel
    name: "Physical Data Model"
    description: "A physical data model"
    extends: DataModel
```

```yaml
# RelationalDataModel.definition.cm
objectDefinition:
    id: RelationalDataModel
    name: "Relational Data Model"
    description: "A relational data model"
    extends: PhysicalDataModel
```

A DataModel instance then uses `type` like any other TypedObject:

```yaml
datamodel:
    id: MyLogicalModel
    name: "My Logical Model"
    type: LogicalDataModel
    version: "1.0"
```

This replaces the old `type: logical` syntax with the more flexible and extensible ObjectDefinition approach. Users can create custom DataModel subtypes (e.g., `DataVaultLogicalModel extends LogicalDataModel`) with their own property definitions.

### Summary of all built-in definitions

| Built-in ID | Filename | Extends | Description |
|---|---|---|---|
| `Entity` | `Entity.definition.cm` | *(root)* | Root for all entity types |
| `Attribute` | `Attribute.definition.cm` | *(root)* | Root for all attribute types |
| `Identifier` | `Identifier.definition.cm` | *(root)* | Root for all identifier types |
| `Relationship` | `Relationship.definition.cm` | *(root)* | Root for all relationship types |
| `CustomProperty` | `CustomProperty.definition.cm` | *(root)* | Root for custom property types |
| `DataModel` | `DataModel.definition.cm` | *(root)* | Root for all data model types |
| `ConceptualDataModel` | `ConceptualDataModel.definition.cm` | `DataModel` | Conceptual data models |
| `LogicalDataModel` | `LogicalDataModel.definition.cm` | `DataModel` | Logical data models |
| `PhysicalDataModel` | `PhysicalDataModel.definition.cm` | `DataModel` | Physical data models |
| `RelationalDataModel` | `RelationalDataModel.definition.cm` | `PhysicalDataModel` | Relational data models |

These would be loaded as built-in library documents by the scope provider, similar to how standard libraries work in other Langium languages.

The domain root definitions have no `extends` reference — they are the top of their respective hierarchies. The DataModel subtypes form a deeper built-in hierarchy.

---

## 7. Definition Chain Examples

The `extends` field creates the definition hierarchy, and the `type` field connects instances to definitions:

```text
Built-in roots (no extends):
    Entity
    Relationship
    Attribute
    Identifier
    DataModel
    CustomProperty

Built-in DataModel subtypes:
    ConceptualDataModel    → extends: DataModel
    LogicalDataModel       → extends: DataModel
    PhysicalDataModel      → extends: DataModel
    RelationalDataModel    → extends: PhysicalDataModel

User-defined ObjectDefinitions (extends → parent ObjectDefinition):
    DataVaultEntity      → extends: Entity
    DataVaultHub         → extends: DataVaultEntity
    DataVaultSat         → extends: DataVaultEntity
    DataVaultLink        → extends: Relationship
    DataAttribute        → extends: Attribute

Instances (type → ObjectDefinition):
    CustomerHub (entity)       → type: DataVaultHub
    OrderLink (relationship)   → type: DataVaultLink
    CustId (attribute)         → type: DataAttribute
    MyModel (datamodel)        → type: LogicalDataModel
```

To determine that `CustomerHub` is an entity type, we walk the definition chain:
`CustomerHub.type` → `DataVaultHub.extends` → `DataVaultEntity.extends` → `Entity` (built-in root for entities).

To determine that `MyModel` is a logical data model:
`MyModel.type` → `LogicalDataModel.extends` → `DataModel` (built-in root for data models).

---

## 8. Example Files

### ObjectDefinition: DataVaultEntity (extends Entity)

Defines metadata properties that steer code generation for all Data Vault entities: the loading strategy and rate-of-change tracking.

```yaml
objectDefinition:
    id: DataVaultEntity
    name: "Data Vault Entity"
    description: "Base type for all Data Vault entities"
    extends: Entity
    properties:
        - id: LoadStrategy
          name: "Load Strategy"
          description: "Code generation strategy for loading data into this entity"
          datatype: "Text"
          mandatory: true
          defaultValue: "full"
          values:
              - "full"
              - "incremental"
              - "delta"
        - id: RateOfChange
          name: "Rate of Change"
          description: "Expected rate of change, used to optimize generated ETL pipelines"
          datatype: "Text"
          defaultValue: "low"
          values:
              - "low"
              - "medium"
              - "high"
```

### ObjectDefinition: DataVaultHub (extends DataVaultEntity)

Inherits `LoadStrategy` and `RateOfChange` from DataVaultEntity. Adds Hub-specific metadata for code generation: hash algorithm selection.

```yaml
objectDefinition:
    id: DataVaultHub
    name: "Data Vault Hub"
    description: "Hub entity in a Data Vault model"
    extends: DataVaultEntity
    properties:
        - id: HashAlgorithm
          name: "Hash Algorithm"
          description: "Algorithm used to generate hash keys in code generation"
          datatype: "Text"
          mandatory: true
          defaultValue: "SHA-256"
          values:
              - "MD5"
              - "SHA-1"
              - "SHA-256"
```

### ObjectDefinition: DataVaultSat (extends DataVaultEntity)

Inherits `LoadStrategy` and `RateOfChange` from DataVaultEntity. Overrides the default for `LoadStrategy` to `"delta"` since satellites typically use delta loading. Adds satellite-specific metadata.

```yaml
objectDefinition:
    id: DataVaultSat
    name: "Data Vault Satellite"
    description: "Satellite entity in a Data Vault model"
    extends: DataVaultEntity
    properties:
        - id: LoadStrategy
          defaultValue: "delta"
        - id: EnableEndDating
          name: "Enable End-Dating"
          description: "Whether code generation should produce end-dating logic for this satellite"
          datatype: "Boolean"
          defaultValue: true
    customProperties:
        - id: GeneratorTemplate
          value: "sat_default_v2"
```

### ObjectDefinition: DataVaultLink (extends Relationship)

```yaml
objectDefinition:
    id: DataVaultLink
    name: "Data Vault Link"
    description: "Link in a Data Vault model"
    extends: Relationship
    properties:
        - id: HashAlgorithm
          name: "Hash Algorithm"
          description: "Algorithm used to generate link hash keys"
          datatype: "Text"
          mandatory: true
          defaultValue: "SHA-256"
          values:
              - "MD5"
              - "SHA-1"
              - "SHA-256"
        - id: DrivingKeyEnabled
          name: "Driving Key Enabled"
          description: "Whether this link uses a driving key pattern in code generation"
          datatype: "Boolean"
          defaultValue: false
```

### ObjectDefinition: DataAttribute (extends Attribute)

Defines metadata for data governance and code generation at the attribute level.

```yaml
objectDefinition:
    id: DataAttribute
    name: "Data Attribute"
    description: "Standard data attribute type with governance metadata"
    extends: Attribute
    properties:
        - id: GDPRClassification
          name: "GDPR Classification"
          description: "Data governance classification, determines masking/encryption in generated code"
          datatype: "Text"
          mandatory: true
          defaultValue: "Non-Sensitive"
          values:
              - "Sensitive"
              - "Non-Sensitive"
              - "Personal"
        - id: NullHandling
          name: "Null Handling"
          description: "How null values should be handled in generated transformation code"
          datatype: "Text"
          defaultValue: "keep"
          values:
              - "keep"
              - "default"
              - "reject"
```

### DataModel instance using types

```yaml
datamodel:
    id: MyDataVaultModel
    name: "My Data Vault Model"
    type: LogicalDataModel
    version: "1.0"
    dependencies:
        - datamodel: ~SharedTypes
          version: "2.0"
```

### Entity instance using types

```yaml
entity:
    id: CustomerHub
    name: "Customer Hub"
    type: DataVaultHub
    customProperties:
        - id: RateOfChange
          value: "high"
    attributes:
        - id: CustomerBK
          name: "Customer Business Key"
          datatype: "Text"
          type: DataAttribute
          customProperties:
              - id: GDPRClassification
                value: "Personal"
        - id: CustomerEmail
          name: "Customer Email"
          datatype: "Text"
          type: DataAttribute
          customProperties:
              - id: GDPRClassification
                value: "Sensitive"
              - id: NullHandling
                value: "reject"
```

In this example:

- `CustomerHub` has `type: DataVaultHub`. Walking the definition chain: `DataVaultHub.extends` → `DataVaultEntity.extends` → `Entity`. This confirms it's a valid entity type.
- `CustomerHub` inherits property definitions from all levels: `HashAlgorithm` from DataVaultHub, `LoadStrategy` and `RateOfChange` from DataVaultEntity.
- `CustomerHub` overrides `RateOfChange` to `"high"` (default from DataVaultEntity was `"low"`). `LoadStrategy` and `HashAlgorithm` use their defaults (`"full"` and `"SHA-256"`).
- Each attribute has `type: DataAttribute`, which defines mandatory `GDPRClassification` and optional `NullHandling`.
- `CustomerEmail` overrides `NullHandling` to `"reject"` (default was `"keep"`).

### Custom property value override chain

This example demonstrates how a custom property value can be set at any level in the definition chain and overridden at lower levels. The **lowest level always wins**.

```text
Definition chain for a satellite attribute:

  DataVaultEntity           defines LoadStrategy    defaultValue: "full"
       ↓ (extends)
  DataVaultSat              redefines LoadStrategy  defaultValue: "delta"   (overrides parent)
       ↓ (type)
  OrderDetailsSat (entity)  sets LoadStrategy       value: "incremental"    (overrides type default)
```

```yaml
# Level 1 — Root definition defines the property with default "full"
objectDefinition:
    id: DataVaultEntity
    name: "Data Vault Entity"
    extends: Entity
    properties:
        - id: LoadStrategy
          name: "Load Strategy"
          datatype: "Text"
          mandatory: true
          defaultValue: "full"
          values:
              - "full"
              - "incremental"
              - "delta"
```

```yaml
# Level 2 — Sub-definition overrides only the default value to "delta"
objectDefinition:
    id: DataVaultSat
    name: "Data Vault Satellite"
    extends: DataVaultEntity
    properties:
        - id: LoadStrategy
          defaultValue: "delta"
```

```yaml
# Level 3 — Instance overrides the value to "incremental"
entity:
    id: OrderDetailsSat
    name: "Order Details Satellite"
    type: DataVaultSat
    customProperties:
        - id: LoadStrategy
          value: "incremental"
```

**Resolution order** (lowest level wins):

| Level | Source | LoadStrategy value |
| --- | --- | --- |
| 1 | `DataVaultEntity` definition | `"full"` (default) |
| 2 | `DataVaultSat` definition (overrides parent) | `"delta"` (default) |
| 3 | `OrderDetailsSat` instance (overrides definition default) | **`"incremental"`** |

The effective value for `OrderDetailsSat.LoadStrategy` is **`"incremental"`** because the instance-level value takes precedence.

If `OrderDetailsSat` did not set `LoadStrategy`, the effective value would be `"delta"` (from the DataVaultSat definition default). If DataVaultSat also did not override it, the value would fall back to `"full"` (from DataVaultEntity).

---

## 9. Validation Rules

These are validation rules to implement in TypeScript (Langium validator), not enforced at the grammar level:

### 9.1 Definition chain consistency

An ObjectDefinition's `extends` must reference another ObjectDefinition (or be a built-in root with no `extends`). The chain must eventually reach a built-in root type.

```
ERROR if objectDefinition.extends resolves to something that is not an ObjectDefinition
ERROR if the extends chain does not terminate at a built-in root
```

### 9.2 Type compatibility on instances

When a domain object sets its `type`, the referenced ObjectDefinition's `extends` chain must lead to the correct built-in root for that domain.

| Object type | Required root in extends chain |
|---|---|
| `LogicalEntity` | `Entity` |
| `LogicalAttribute` | `Attribute` |
| `LogicalIdentifier` | `Identifier` |
| `Relationship` | `Relationship` |
| `DataModel` | `DataModel` |
| `CustomProperty` | `CustomProperty` |

Note: Objects that remain at `IdentifiedObject` level (Mapping, SourceObject, SystemDiagram, etc.) do not have a `type` property and are not validated for type compatibility.

### 9.3 Mandatory custom properties

When an object references a type, all `mandatory` custom property definitions from the type and its entire ancestor chain must have a corresponding `CustomProperty` entry on the instance.

```
For each mandatory CustomPropertyDefinition in getAllPropertyDefinitions(type):
    ERROR if instance.customProperties does not contain a CustomProperty
          with matching id/name and a non-empty value
```

### 9.4 Custom property value validation

When a `CustomProperty` on an instance matches a `CustomPropertyDefinition` from the type:

- The value must match the definition's `datatype`
- If `values` are defined on the definition, the value must be one of the allowed values
- `length`, `precision`, and `scale` constraints must be respected

### 9.5 No circular definition chains

Validate that following the `extends` chain does not lead to a cycle.

### 9.6 Built-in root types are immutable

User-defined ObjectDefinitions must not use reserved built-in IDs (`Entity`, `Attribute`, `Identifier`, `Relationship`, `CustomProperty`, `DataModel`, `ConceptualDataModel`, `LogicalDataModel`, `PhysicalDataModel`, `RelationalDataModel`).

---

## 10. Polymorphic Type Resolution (TypeScript)

To determine the domain classification of an ObjectDefinition, walk the `extends` chain to the root:

```typescript
/** Get the built-in root ObjectDefinition at the top of the extends chain. */
function getRootDefinition(definition: ObjectDefinition): ObjectDefinition | undefined {
    let current: ObjectDefinition | undefined = definition;
    while (current?.extends?.ref) {
        current = current.extends.ref;
    }
    return current;
}

/** Check if an ObjectDefinition is (or descends from) a specific built-in root. */
function isDescendantOf(definition: ObjectDefinition, rootId: string): boolean {
    let current: ObjectDefinition | undefined = definition;
    while (current) {
        if (current.id === rootId) return true;
        current = current.extends?.ref;
    }
    return false;
}

function isEntityDefinition(definition: ObjectDefinition): boolean {
    return isDescendantOf(definition, 'Entity');
}

function isAttributeDefinition(definition: ObjectDefinition): boolean {
    return isDescendantOf(definition, 'Attribute');
}

function isIdentifierDefinition(definition: ObjectDefinition): boolean {
    return isDescendantOf(definition, 'Identifier');
}

function isRelationshipDefinition(definition: ObjectDefinition): boolean {
    return isDescendantOf(definition, 'Relationship');
}

function isDataModelDefinition(definition: ObjectDefinition): boolean {
    return isDescendantOf(definition, 'DataModel');
}

function isCustomPropertyDefinition(definition: ObjectDefinition): boolean {
    return isDescendantOf(definition, 'CustomProperty');
}

// ... etc. for each built-in root
```

To collect all custom property definitions including inherited ones:

```typescript
function getAllPropertyDefinitions(definition: ObjectDefinition): CustomPropertyDefinition[] {
    const definitions: CustomPropertyDefinition[] = [...definition.propertyDefinitions];
    let current = definition.extends?.ref;
    while (current) {
        definitions.push(...current.propertyDefinitions);
        current = current.extends?.ref;
    }
    return definitions;
}
```

---

## 11. Summary of Grammar File Changes

| File | Change |
|---|---|
| `common.langium` | Add `TypedObject` interface and `TypedObjectFragment`. Add ObjectDefinition interface (forward declaration) with `extends` field. Update `DataElementContainer`, `DataElementContainerLink`, `DataElement` to extend `TypedObject`. Update `CustomProperty` to extend `TypedObject` and use `TypedObjectFragment`. Add `CustomPropertyDefinition`, `CustomPropertyValue`, `BOOLEAN_VALUE`. |
| `objectdefinition.langium` | ObjectDefinition parser rule with `extends` parsing. Uses `NamedObjectFragment` (not TypedObjectFragment). |
| `cross-model.langium` | `objectDefinition=ObjectDefinition` in `CrossModelRoot`. Add `import 'objectdefinition'`. |
| `entity.langium` | Change `LogicalEntity` and `LogicalAttribute` parser rules to use `TypedObjectFragment`. Change `LogicalIdentifier` interface to extend `TypedObject` and parser rule to use `TypedObjectFragment`. |
| `relationship.langium` | Change `Relationship` parser rule to use `TypedObjectFragment`. |
| `datamodel.langium` | Change `DataModel` interface to extend `TypedObject`. Remove `modelType` field and `DataModelType` rule. Use `TypedObjectFragment` in parser rule. |
| `mapping.langium` | No changes needed. |
| `system-diagram.langium` | No changes needed. |
| `terminals.langium` | No changes needed. |

---

## 12. Resolved Decisions

1. **File extension**: ObjectDefinition files use the `.definition.cm` extension. The crossmodel-lang extension already handles all `*.cm` files via the language server, so `.definition.cm` files are automatically recognized.

2. **Built-in root type loading**: The built-in root ObjectDefinitions (`Entity`, `Attribute`, `Identifier`, `Relationship`, `CustomProperty`, `DataModel`, etc.) and the DataModel subtypes are `.definition.cm` files bundled **inside the language-server package** — not in the user's workspace. They are loaded at startup via `CrossModelWorkspaceManager.loadAdditionalDocuments()`, which already has an unused `_collector` callback designed for injecting additional documents into the scope. The built-in type files are read from the package resources and passed to this collector, making them globally available to all workspaces without the user needing to manage them.

3. **YAML keyword and property naming**: The YAML keyword is `objectDefinition:`, matching the AST type name. The `CrossModelRoot` property is also `objectDefinition`. This keeps grammar, AST, and file syntax fully aligned.

4. **DataModel type classification**: The old `type: conceptual | logical | relational` enum is fully replaced by the ObjectDefinition hierarchy. DataModel uses `type: LogicalDataModel` (or `ConceptualDataModel`, `RelationalDataModel`, etc.) just like any other TypedObject. The subtype IDs follow the convention `{id}.definition.cm` where the ID matches the filename (e.g., `LogicalDataModel.definition.cm` has `id: LogicalDataModel`). This is more flexible and extensible — users can create custom DataModel subtypes (e.g., `DataVaultLogicalModel extends LogicalDataModel`) with their own property definitions.

---

## 13. Open Questions / Future Considerations

1. **Scoping**: The scope provider needs updating so that `type` references on different domain objects are filtered to only show ObjectDefinitions whose `extends` chain leads to the correct built-in root. For example, a `LogicalEntity`'s `type` field should only offer ObjectDefinitions in the `Entity` hierarchy, and a `DataModel`'s `type` field should only offer definitions in the `DataModel` hierarchy.

2. **Extends field on built-in roots**: Built-in root ObjectDefinitions (`Entity`, `Attribute`, etc.) have no `extends` set. This is the termination condition for extends chain walking. Validation should allow this for built-in roots only.

3. **Promoting structural objects**: Objects like `SystemDiagram`, `Mapping`, `SourceObject`, `LogicalEntityNode`, and diagram edges currently remain at `IdentifiedObject` level. They could be promoted to `TypedObject` in the future if the type system should cover them.

4. **Migration from old DataModel format**: Existing `.cm` files using `type: logical` (or `conceptual`/`relational`) will need migration to the new `type: LogicalDataModel` format. A migration script or compatibility layer may be needed.
