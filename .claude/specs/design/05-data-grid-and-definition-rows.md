# Data Grid & Definition Rows

## Overview

`DynamicDataGrid` is the most complex UI component in the system (~1300 lines). It renders array properties as editable data tables using PrimeReact's `DataTable`, with support for per-row type inheritance, virtual definition rows, filtering, column dependencies, and multiple editor types.

## File

`packages/react-model-ui/src/dynamic/DynamicDataGrid.tsx`

## Row Types

The grid manages three categories of rows:

### 1. Committed Rows (from model data)

Standard rows backed by actual items in the model's array property (e.g., `entity.attributes[0]`). They have:
- `idx`: Index in the model array (0-based)
- `id`: The item's ID
- All property values from the model item

### 2. Uncommitted Rows (being created)

Temporary rows created when the user clicks "Add". They have:
- `idx`: -1 (not yet in the model)
- `_uncommitted: true`
- Default values from column descriptors

When the user fills in required fields and the row is committed, it dispatches `dynamic:collection:add` and becomes a committed row.

### 3. Virtual Definition Rows (from type definitions)

When `collection.supportsDefinitionRows` is true, the grid creates virtual rows for each property defined by the type's `propertyDefinitions` that doesn't already have a local entry. These rows have:
- `idx`: -1 (not in the model array)
- `_typeProperty: true` — marks the row as coming from a type definition
- `_inherited: boolean` — whether the property was inherited from a parent definition
- `_source: string` — the definition ID that defined this property
- All metadata from the definition (name, description, datatype, etc.)
- The `value` column is editable; all other columns are read-only

## DynamicRow Interface

```typescript
interface DynamicRow extends Record<string, any> {
    idx: number;           // model array index, or -1 for virtual/uncommitted
    id: string;            // item ID
    _uncommitted?: boolean;  // true for newly added rows
    _typeProperty?: boolean; // true for definition rows
    _inherited?: boolean;    // true if from parent definition
    _definedIn?: string;     // definition ID where this property was first introduced (highest level)
    _valueSetIn?: string;    // definition ID where the current value was specified (most specific level)
}
```

## Data Sync: Model → Grid

The grid maintains local `gridData` state (array of `DynamicRow`) that is synced from the model in a `useEffect`:

```
Model array changes → useEffect runs → builds DynamicRow[] → setGridData()
```

The sync process:

1. Maps each model item to a `DynamicRow`, applying `deserialize()` for columns that have custom deserialization
2. For items with `$resolvedType`, extracts inherited property values for per-row type display
3. Preserves uncommitted rows that haven't been committed yet
4. When `supportsDefinitionRows` is true:
   a. Gets `propertyDefinitions` from `rootObj.$resolvedType.propertyDefinitions` (server-enriched)
   b. For each definition property, checks if a local item with matching ID exists
   c. If local item exists: enriches it with definition metadata (`_definedIn`, `_valueSetIn`)
   d. If no local item: creates a virtual row with `_typeProperty: true`, `_definedIn`, and `_valueSetIn`

## Per-Row Type Resolution

When `collection.typeProperty` is set (e.g., `'type'` for entity attributes), each row can have its own type reference. The server enriches each collection item individually with a `$resolvedType` property containing the resolved inherited properties for that item's type.

The grid reads this directly from the enriched model data — no async resolution calls are made from the front-end. During model→grid sync, the grid extracts `item.$resolvedType?.inheritedProperties` and uses it as the type defaults for that row.

**Example:** An entity attribute with `type: "HubKey"` where `HubKey` is an `AttributeDefinition` with `datatype: "Integer"` and `mandatory: true`. The server embeds `$resolvedType: { inheritedProperties: { properties: { datatype: "Integer", mandatory: true }, definedIn: { ... }, valueSetIn: { ... } } }` on the attribute. The grid shows "Integer" dimmed in the datatype column and a dimmed checkmark in the mandatory column, even if the attribute itself doesn't set those values.

When the model is re-enriched by the server (e.g., after a type field changes or a definition file is modified), the grid automatically picks up the new resolved data via the standard model→grid sync cycle.

## Column Rendering

### Editor Creation

For each column, the grid creates an editor component based on `columnType`:

| columnType | Editor Component | Description |
|-----------|-----------------|-------------|
| `text` | `GenericTextEditor` | InputText with validation |
| `number` | `GenericNumberEditor` | InputNumber with dependency support |
| `boolean` | `GenericCheckboxEditor` | Checkbox with validation |
| `dropdown` | `GenericAutoCompleteEditor` | AutoComplete with static options |
| `reference` | `DynamicReferenceEditor` | Async AutoComplete with server reference resolution |
| `multiselect` | `DynamicMultiSelectEditor` | PrimeReact MultiSelect |

### Body (Display) Rendering

Non-editing cells show:
- **Text/dropdown/reference**: Plain text wrapped in `EditorProperty` (with validation styling)
- **Boolean**: Readonly `Checkbox` (checked/unchecked)
- **Number**: Value or empty, with dependency-aware dimming
- **Multiselect**: Formatted display of selected values

### Column Dependencies

Like form fields, grid columns support dependencies:

```typescript
{
    property: 'length',
    columnType: 'number',
    dependency: {
        sourceProperty: 'datatype',
        isApplicable: (datatype) => datatype === 'Text' || datatype === 'Binary'
    }
}
```

When `isApplicable` returns false for a row:
- The editor is disabled with a tooltip
- The body cell is dimmed
- The value is not included in serialization

### readonlyForTypeProperty

When `readonlyForTypeProperty: true` on a column descriptor:
- For definition rows (`_typeProperty: true`): the column renders as read-only text, not an editor
- The `value` column (without this flag) remains editable for definition rows
- This is how the custom properties grid allows value-only editing of type-defined properties

## Definition Row Editing

### Setting a Value

When a user edits the `value` column of a definition row:
1. The row has `_typeProperty: true` and `idx: -1`
2. The grid creates a minimal local item: `{ $type, id, value }`
3. Dispatches `dynamic:collection:add` to create the local entry
4. On next sync, the row becomes a committed row enriched with definition metadata

### Clearing a Value

When a user clears the `value` of a definition-backed committed row:
1. If the row has a local entry and the value becomes empty
2. The grid dispatches `dynamic:collection:delete` to remove the local entry
3. On next sync, the row reverts to a virtual definition row

### Source Column

When `supportsDefinitionRows` is true, the grid automatically adds a source indicator column showing:

- A colored badge showing where the property was **defined** (`_definedIn` — the highest-level definition that introduced this property)
- If the value was set at a different level, a secondary indicator showing where the **value** comes from (`_valueSetIn` — the most specific definition that specified the value)
- "inherited" badge styling for properties from parent definitions
- "success" badge styling for properties from the direct type definition

## Row Operations

### Add

1. User clicks "Add [Label]" button
2. Grid creates an uncommitted row with default values
3. User fills in fields
4. On commit (row edit complete):
   - Builds the item using `itemBuilder` (if provided) or default construction
   - Generates ID using `idGenerator` (if provided) or auto-derives from name/index
   - Dispatches `dynamic:collection:add`

### Update

1. User edits a cell in a committed row
2. On row edit complete:
   - Serializes all column values using `serialize()` hooks
   - Dispatches `dynamic:collection:update` with the item index

### Delete

1. User clicks delete button on a row
2. Row is marked for pending deletion (visual indicator)
3. After a short delay (for undo opportunity):
   - Dispatches `dynamic:collection:delete`

### Reorder

PrimeReact's DataTable supports drag-and-drop row reordering. On reorder:
- Dispatches `dynamic:collection:reorder` with the full reordered array

## Filtering

The grid supports column-level filtering via PrimeReact's built-in filter mechanism:

| filterType | Widget | Description |
|-----------|--------|-------------|
| `text` | InputText | Free-text filter |
| `multiselect` | MultiSelect | Multi-select from available values |
| `dropdown` | Dropdown | Single-select from available values |
| `boolean` | TriStateCheckbox | True/False/Any |

Filter options for multiselect/dropdown are either static (`filterOptions` on the column) or dynamically computed from the current grid data.

## Reference Resolution

Reference columns use async server calls for autocompletion:

```typescript
function DynamicReferenceEditor({ options, collection, column, schema, rootObj }) {
    // Builds CrossReferenceContext from column.referenceConfig
    const context = {
        container: { uri: documentUri },
        syntheticElements: [{
            type: column.referenceConfig.syntheticType,
            property: column.referenceConfig.syntheticProperty || collection.property
        }],
        property: column.referenceConfig.referenceProperty || column.property
    };

    // Calls server to get completions
    const items = await queryApi.findReferenceableElements(context);

    // Shows AutoComplete with server results
}
```

## Serialize/Deserialize Hooks

Columns can define custom transformations between model data and grid data:

**Deserialize** (model → grid): Called when syncing model items to grid rows.
```typescript
// Example: Entity inheritance deserializes reference objects to plain IDs
deserialize: (_modelValue, item) => item?.parentId ?? item?.$refText ?? ''
```

**Serialize** (grid → model): Called when committing row edits back to the model.
```typescript
// Example: pass through for simple values
serialize: (rowValue) => rowValue
```

## Performance Considerations

- **Grid data sync** runs in `useEffect` with dependency on model array and property definitions
- **Type resolution** is synchronous on the client: the server embeds `$resolvedType` on each item, so the grid reads resolved data directly during model→grid sync without async calls
- **Pending deletes** use timeouts to allow undo, cleared on unmount
- **Uncommitted rows** are tracked separately and preserved across model syncs
