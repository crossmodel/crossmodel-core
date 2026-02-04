# Schema Registry & Form Schemas

## Overview

The schema registry is the central mechanism that maps model types to their form layout. It is a `Map<string, DynamicFormSchema>` that holds schemas for both root-level forms (Entity, DataModel, etc.) and item-level forms (LogicalAttribute, CustomProperty, etc.).

## Files

- `packages/react-model-ui/src/dynamic/schema.ts` — TypeScript interfaces
- `packages/react-model-ui/src/dynamic/schema-registry.ts` — Concrete schema definitions and registry

## Schema Interfaces

### DynamicFormSchema

The top-level schema for rendering a complete form:

```typescript
interface DynamicFormSchema {
    rootKey: string;           // key on CrossModelRoot (e.g., 'entity', 'datamodel', 'objectDefinition')
    rootType: string;          // $type value (e.g., 'LogicalEntity', 'AttributeDefinition')
    displayName: string;       // form header (e.g., 'Entity', 'Attribute Definition')
    iconClass: string;         // codicon class for form header
    diagnosticPath: string;    // path prefix for diagnostic lookup
    typeProperty?: string;     // property that holds the type reference for inheritance
    sections: FormSectionDescriptor[];
    collections: CollectionDescriptor[];
}
```

**typeProperty** is the critical link to the type system:
- For instance forms (Entity, DataModel, Relationship): `typeProperty: 'type'` — the `type` field references an ObjectDefinition
- For definition forms (AttributeDefinition, EntityDefinition, etc.): `typeProperty: 'extends'` — the `extends` field references a parent definition
- The server resolves the referenced definition and embeds the result as `$resolvedType` on the model object. Components read inherited values and property definitions directly from this enriched data — no async resolution needed on the client

### FieldDescriptor

Describes a single scalar field in a form section:

```typescript
interface FieldDescriptor {
    property: string;          // model property name
    label: string;             // display label
    fieldType: FieldType;      // 'text' | 'textarea' | 'number' | 'boolean' | 'reference' | 'dropdown' | 'readonly'
    required?: boolean;
    dropdownOptions?: { label: string; value: string }[];
    referenceProperty?: string;  // for reference fields: property name for CrossReferenceContext
    undefinedIfEmpty?: boolean;   // convert '' to undefined on dispatch
    disabled?: boolean;          // always disabled (e.g., ID field)
    dependency?: FieldDependency;
}
```

### FieldDependency

Controls conditional applicability of a field based on another field's value:

```typescript
interface FieldDependency {
    sourceProperty: string;                      // e.g., 'datatype'
    isApplicable: (sourceValue: any) => boolean;  // e.g., (v) => v === 'Text'
    disabledTooltip?: string;
}
```

### GridColumnDescriptor

Describes a column in a DynamicDataGrid:

```typescript
interface GridColumnDescriptor {
    property: string;
    header: string;
    columnType: GridColumnType;   // 'text' | 'number' | 'boolean' | 'dropdown' | 'reference' | 'multiselect'
    width?: string;
    style?: React.CSSProperties;
    headerStyle?: React.CSSProperties;
    headerTooltip?: string;
    dropdownOptions?: { label: string; value: string }[];
    referenceConfig?: ReferenceConfig;
    multiSelectConfig?: MultiSelectConfig;
    filterType?: 'text' | 'multiselect' | 'dropdown' | 'boolean';
    filterOptions?: { label: string; value: string }[];
    showFilterMatchModes?: boolean;
    dataType?: string;            // PrimeReact dataType ('numeric', 'boolean')
    required?: boolean;
    dependency?: ColumnDependency;
    readonlyForTypeProperty?: boolean;  // read-only for definition rows
    deserialize?: (modelValue: any, item: any) => any;
    serialize?: (rowValue: any, row: Record<string, any>) => any;
}
```

Key additions over FieldDescriptor:
- **`readonlyForTypeProperty`**: When true, this column is read-only for rows coming from type definitions (virtual definition rows)
- **`serialize/deserialize`**: Custom transformations between model data and grid row data
- **`referenceConfig`**: Configuration for building CrossReferenceContext for reference columns
- **`multiSelectConfig`**: Provider for multiselect options and display formatting

### CollectionDescriptor

Describes an array property rendered as a grid:

```typescript
interface CollectionDescriptor {
    property: string;              // array property name on model (e.g., 'attributes')
    label: string;
    renderMode: 'existing' | 'dynamic';
    existingComponent?: React.ComponentType;
    defaultCollapsed?: boolean;
    columns?: GridColumnDescriptor[];
    itemType?: string;             // $type for new items (e.g., 'LogicalAttribute')
    addButtonLabel?: string;
    noDataMessage?: string;
    idGenerator?: (row: Record<string, any>, rootObj: any) => string;
    itemBuilder?: (rowData: Record<string, any>, rootObj: any) => Record<string, any>;
    resizableColumns?: boolean;
    columnResizeMode?: 'fit' | 'expand';
    typeProperty?: string;         // per-row type property for inherited values
    supportsDefinitionRows?: boolean;  // enable virtual definition rows
}
```

## Registry Structure

```typescript
const SCHEMA_REGISTRY = new Map<string, DynamicFormSchema>();

// Root-level schemas (for DynamicForm)
SCHEMA_REGISTRY.set('DataModel', dataModelSchema);
SCHEMA_REGISTRY.set('LogicalEntity', logicalEntitySchema);
SCHEMA_REGISTRY.set('Relationship', relationshipSchema);
SCHEMA_REGISTRY.set('ObjectDefinition', objectDefinitionSchema);
SCHEMA_REGISTRY.set('AttributeDefinition', attributeDefinitionSchema);
SCHEMA_REGISTRY.set('EntityDefinition', entityDefinitionSchema);
SCHEMA_REGISTRY.set('RelationshipDefinition', relationshipDefinitionSchema);
SCHEMA_REGISTRY.set('IdentifierDefinition', identifierDefinitionSchema);
SCHEMA_REGISTRY.set('DataModelDefinition', dataModelDefinitionSchema);

// Item-level schemas (for RowDetailDialog)
SCHEMA_REGISTRY.set('LogicalAttribute', logicalAttributeItemSchema);
SCHEMA_REGISTRY.set('LogicalIdentifier', logicalIdentifierItemSchema);
SCHEMA_REGISTRY.set('CustomProperty', customPropertyItemSchema);
```

### Lookup Functions

```typescript
// Used by DynamicForm: find schema for a CrossModelRoot
function getSchemaForRoot(root: CrossModelRoot): DynamicFormSchema | undefined {
    const semanticRoot = getSemanticRoot(root);
    return SCHEMA_REGISTRY.get(semanticRoot.$type);
}

// Used by RowDetailDialog: find schema for a collection item by $type
function getSchemaForType(type: string): DynamicFormSchema | undefined {
    return SCHEMA_REGISTRY.get(type);
}
```

## Concrete Schemas

### Instance Forms

#### DataModel Schema

```
rootKey: 'datamodel' / rootType: 'DataModel'
typeProperty: 'type'

Sections:
  General: id, name, description, type (reference), version

Collections:
  Dependencies (dynamic grid):
    Columns: datamodel (reference), version (text)
  Custom Properties (dynamic grid with definition rows)
```

#### LogicalEntity Schema

```
rootKey: 'entity' / rootType: 'LogicalEntity'
typeProperty: 'type'

Sections:
  General: id, name, description, type (reference)

Collections:
  Inheritance (dynamic grid):
    Columns: parentId (reference with serialize/deserialize)
    itemBuilder: wraps as { $refText: toIdReference(parentId) }
  Attributes (dynamic grid with per-row type resolution):
    typeProperty: 'type'  ← per-row type for inherited attribute properties
    Columns: name, type (reference), datatype (dropdown), length, precision, scale, mandatory, description
    idGenerator: derives ID from name
    itemBuilder: adds $globalId
  Identifiers (dynamic grid):
    Columns: name, primary (boolean), attributeIds (multiselect), description
    idGenerator: uses 'Primary Identifier' as name when primary=true and no name
    itemBuilder: maps attributeIds → attributes array
  Custom Properties (dynamic grid with definition rows)
```

#### Relationship Schema

```
rootKey: 'relationship' / rootType: 'Relationship'
typeProperty: 'type'

Sections:
  General: id, name, description, type (reference), parent (reference), child (reference),
           parentRole, childRole, parentCardinality (dropdown), childCardinality (dropdown)

Collections:
  Attributes (dynamic grid):
    Columns: parent (reference), child (reference)
  Custom Properties (dynamic grid with definition rows)
```

### Definition Forms

All definition forms use `rootKey: 'objectDefinition'` and `typeProperty: 'extends'`.

#### ObjectDefinition Schema (generic)
```
Fields: id, name, description, abstract, extends (reference)
Collections: Property Definitions (custom properties grid)
```

#### AttributeDefinition Schema
```
Fields: id, name, description, abstract, extends (reference),
        datatype (dropdown), length, precision, scale, mandatory
        (length/precision/scale have dependency on datatype)
Collections: Property Definitions (custom properties grid)
```

#### EntityDefinition Schema
```
Fields: id, name, description, abstract, extends (reference)
Collections: Property Definitions (custom properties grid)
```

#### RelationshipDefinition Schema
```
Fields: id, name, description, abstract, extends (reference),
        parentCardinality (dropdown), childCardinality (dropdown)
Collections: Property Definitions (custom properties grid)
```

#### IdentifierDefinition Schema
```
Fields: id, name, description, abstract, extends (reference), primary (boolean)
Collections: Property Definitions (custom properties grid)
```

#### DataModelDefinition Schema
```
Fields: id, name, description, abstract, extends (reference)
Collections: Property Definitions (custom properties grid)
```

### Item-Level Schemas

Used by `RowDetailDialog` when clicking the detail button on a grid row.

#### LogicalAttribute Item
```
rootKey: 'item' / rootType: 'LogicalAttribute'
typeProperty: 'type'
Fields: id, name, description, type (reference), datatype (dropdown),
        length, precision, scale, mandatory
Collections: Custom Properties
```

#### LogicalIdentifier Item
```
rootKey: 'item' / rootType: 'LogicalIdentifier'
typeProperty: 'type'
Fields: id, name, description, type (reference), primary (boolean)
Collections: Custom Properties
```

#### CustomProperty Item
```
rootKey: 'item' / rootType: 'CustomProperty'
typeProperty: 'type'
Fields: id, name, description, type (reference), datatype (dropdown),
        length, precision, scale, mandatory, value (text)
Collections: (none)
```

## Custom Properties Collection Factory

The `createCustomPropertiesCollection()` factory function generates a standardized custom properties grid descriptor, used across all forms that support custom properties:

```typescript
function createCustomPropertiesCollection(opts?: {
    label?: string;
    supportsDefinitionRows?: boolean;
}): CollectionDescriptor
```

Default configuration:
- `supportsDefinitionRows: true` — enables virtual rows from type definitions
- Columns: name, description, datatype (dropdown), length, precision, scale, mandatory, value
- `readonlyForTypeProperty: true` on all columns except `value`
- Dependency conditions on length/precision/scale based on datatype

## Adding a New Form

To add a form for a new model type:

1. Define the schema object following `DynamicFormSchema` interface
2. Register it: `SCHEMA_REGISTRY.set('MyNewType', mySchema)`
3. Ensure the protocol types in `packages/protocol/src/model-service/protocol.ts` include the type
4. Ensure `getSemanticRoot()` can extract the root object from `CrossModelRoot`

No new React components are needed — the generic form engine handles rendering.
