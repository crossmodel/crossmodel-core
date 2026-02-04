# Dynamic Form UI System

## Overview

The dynamic form UI is a React component tree that renders forms entirely from declarative schema objects (`DynamicFormSchema`). No form component contains type-specific layout code — all layout decisions come from the schema.

## Component Tree

```
DynamicFormComponent  (themed + model-wrapped export)
  └── ModelProvider  (context: model state, dispatch, undo/redo, diagnostics, query API)
       └── DynamicForm  (looks up schema, renders root layout)
            ├── DynamicSection × N  (accordion section with scalar fields)
            │   └── DynamicField × N  (individual field widget)
            └── DynamicCollection × N  (array property section)
                └── DynamicDataGrid  (PrimeReact DataTable)
                    └── RowDetailDialog  (modal item-level form)
```

## Entry Point: DynamicForm

**File:** `packages/react-model-ui/src/dynamic/DynamicForm.tsx`

```typescript
function DynamicForm(): React.ReactElement {
    const model = useModel();
    const schema = React.useMemo(() => getSchemaForRoot(model), [model]);
    // ... renders sections + collections from schema
}
```

1. Gets the current model from React context
2. Looks up the schema via `getSchemaForRoot(model)` — this inspects `model.$type` via `getSemanticRoot()` and finds the matching schema in the registry
3. Extracts the root object: `model[schema.rootKey]` (e.g., `model.entity`, `model.datamodel`, `model.objectDefinition`)
4. Renders each `schema.sections` as a `<DynamicSection>` and each `schema.collections` as a `<DynamicCollection>`

## Sections and Fields

### DynamicSection

**File:** `packages/react-model-ui/src/dynamic/DynamicSection.tsx`

Renders an accordion section containing scalar form fields. Integrates with the type system to show inherited values:

1. Reads `rootObj.$resolvedType?.inheritedProperties?.properties` directly from the enriched model (no async call)
2. Passes the inherited properties as `typeDefaults` to each `DynamicField` so fields can show inherited placeholders

The resolved type data is computed entirely on the server and embedded in the model via the `$resolvedType` property (see [02-server-resolution-and-serialization.md](02-server-resolution-and-serialization.md)).

### DynamicField

**File:** `packages/react-model-ui/src/dynamic/DynamicField.tsx`

Renders a single form field. Supports 7 field types:

| Type | Widget | Description |
|------|--------|-------------|
| `text` | InputText | Single-line text input |
| `textarea` | InputTextarea | Multi-line text input |
| `number` | InputNumber | Numeric input with PrimeReact InputNumber |
| `boolean` | Checkbox | Toggle checkbox |
| `reference` | AsyncAutoComplete | Autocomplete with server-side reference resolution |
| `dropdown` | AutoComplete | Autocomplete with static options |
| `readonly` | `<span>` | Non-editable text display |

#### Field Features

**Dependency system:** A field can depend on another field's value to control its applicability:
```typescript
{
    property: 'length',
    fieldType: 'number',
    dependency: {
        sourceProperty: 'datatype',
        isApplicable: (datatype) => datatype === 'Text' || datatype === 'Binary',
        disabledTooltip: 'Length is applicable only for Text and Binary datatypes'
    }
}
```
When the source field's value makes `isApplicable` return false, the dependent field is disabled, dimmed, and shows the tooltip. If the dependent field had a value, it is cleared (cascading clear).

**Type inheritance placeholders:** When `typeDefaults` provides a value for the field's property, the field shows the inherited value as a placeholder/enforced value. For dropdown fields, the inherited value is shown as the selected option.

**Auto-ID generation:** When the `name` field changes on an untitled file, the `id` field is automatically updated to a sanitized version of the name (via `toId()`).

**undefinedIfEmpty:** When true, empty string values are converted to `undefined` before dispatch, which prevents serializing empty properties.

#### Dispatch

All fields dispatch through the generic `DynamicFormReducer`:

```typescript
dispatch({
    type: 'dynamic:set-property',
    rootKey: schema.rootKey,      // e.g., 'entity'
    property: field.property,     // e.g., 'name'
    value: newValue,
    undefinedIfEmpty: field.undefinedIfEmpty
});
```

## State Management

### ModelProvider

**File:** `packages/react-model-ui/src/ModelProvider.tsx`

Wraps the model in an Immer-based state with undo/redo history:

1. Receives the model from the Theia widget as a prop
2. Uses `useImmerReducer` with `ModelReducer` (which routes to `DynamicFormReducer` for `dynamic:*` actions)
3. Maintains a `ModelHistory` for undo/redo
4. When internal edits occur (reason not `model:initial` or `model:update`), fires `onModelUpdate` callback
5. The callback is debounced (200ms) to batch rapid changes
6. External model updates (from server or other clients) reset the state without adding to history

### DynamicFormReducer

**File:** `packages/react-model-ui/src/DynamicFormReducer.ts`

Generic reducer handling all dynamic form actions:

| Action | Effect |
|--------|--------|
| `dynamic:set-property` | Sets `rootObj[property] = value` |
| `dynamic:set-id` | Sets `rootObj.id = id` |
| `dynamic:collection:add` | Pushes item to `rootObj[collectionProperty]` |
| `dynamic:collection:update` | Replaces item at index in `rootObj[collectionProperty]` |
| `dynamic:collection:delete` | Splices item from `rootObj[collectionProperty]` |
| `dynamic:collection:reorder` | Replaces entire array in `rootObj[collectionProperty]` |

All mutations happen on Immer draft objects, so immutability is handled automatically.

### ModelContext

**File:** `packages/react-model-ui/src/ModelContext.tsx`

Provides React context hooks used throughout the form:

| Hook | Purpose |
|------|---------|
| `useModel()` | Current CrossModelRoot state |
| `useModelDispatch()` | Dispatch function for actions |
| `useModelQueryApi()` | Cross-reference resolution API (async) |
| `useDiagnosticsManager()` | Validation error lookup by path |
| `useUri()` | Document URI |
| `useReadonly()` | Whether the form is in readonly mode |
| `useUntitled()` | Whether the document is a new untitled file |
| `useUndo()` / `useRedo()` | Undo/redo callbacks |
| `useCanUndo()` / `useCanRedo()` | Whether undo/redo are available |

### DiagnosticManager

Indexes server diagnostics by element path for efficient lookup. Supports multiple path formats as fallback:
- Direct path: `/entity^attributes@0^datatype`
- Collection element path: `/entity^attributes@0`
- Root-relative path: `/entity^datatype`

Provides `info()` method returning `{ empty, text(), className }` for form field decoration.

## Collections

### DynamicCollection

**File:** `packages/react-model-ui/src/dynamic/DynamicCollection.tsx`

Wraps array properties in a collapsible `FormSection`. Supports two render modes:

1. **`existing`**: Delegates to a hand-coded React component (used for legacy grids that haven't been migrated yet)
2. **`dynamic`**: Renders a `DynamicDataGrid` with column descriptors from the schema

When `supportsDefinitionRows` is true on the collection descriptor, the collection reads `rootObj.$resolvedType?.propertyDefinitions` from the enriched model and passes them to the grid for virtual row rendering. No async type resolution is needed — the data is already present in the model.

### DynamicDataGrid

See [04-data-grid-and-definition-rows.md](04-data-grid-and-definition-rows.md) for the detailed data grid specification.

### RowDetailDialog

**File:** `packages/react-model-ui/src/dynamic/RowDetailDialog.tsx`

A modal dialog that renders a full form for a single collection item. Used when clicking the detail button on a grid row.

1. Looks up the item's schema by `$type` via `getSchemaForType(item.$type)`
2. Creates a synthetic model wrapper: `{ item: { ...itemData } }`
3. Renders `DynamicSection` and `DynamicCollection` components for the item schema
4. Uses a local dispatch interceptor to capture changes on the local copy
5. On Save: merges the local changes back into the real model via `dynamic:collection:update`
6. On Cancel: discards local changes

## Theia Integration

### Widget Hierarchy

```
ReactWidget (Theia base)
  └── CrossModelWidget (packages/core/src/browser/model-widget.tsx)
       ├── Manages document lifecycle (open/update/save/close)
       ├── Handles dirty state detection via fast-deep-equal
       ├── Integrates with Theia's Saveable interface
       ├── Theme change handling
       └── FormEditorWidget (packages/form-client)
            ├── NavigatableWidget + StatefulWidget
            ├── Undo/redo callback management
            ├── Selection service integration
            └── DynamicFormEditorWidget
                 └── render() → <DynamicFormComponent {...props} />
```

### Open Handler Registration

`DynamicFormEditorOpenHandler` registers with priority **3000** for `.cm` files, making it the default editor. The legacy `FormEditorOpenHandler` (priority 1) serves as a fallback.

Both are registered in `packages/form-client/src/browser/form-client-frontend-module.ts` with Inversify container module bindings.

### Dirty State Detection

When the model changes:

1. `ModelProvider` fires `onModelUpdate` callback
2. `CrossModelWidget.sendUpdate()` strips enrichment data (`$resolvedType`) and runs `deepEqual(this.document.root, model)`
3. If different, sends `UpdateModel` RPC to server (without enrichment data)
4. Server compares serialized text with document text
5. If text differs, document becomes dirty and validation runs
6. Server re-enriches the model with fresh type resolution data
7. Server sends back `ModelUpdatedEvent` with enriched model and fresh diagnostics
8. Widget updates dirty flag, triggers Theia save indicator

Note: The `deepEqual` comparison must ignore `$resolvedType` properties since they are server-computed and not part of the user's editable data.

## Important Gotchas

### PrimeReact InputNumber and null vs undefined

PrimeReact's `InputNumber` fires `onValueChange` on mount when `value={undefined}`. Its internal `useMountEffect` converts `undefined` to `null` via `validateValue()`, and since `undefined !== null`, it triggers a spurious dispatch. All number fields must pass `null` (not `undefined`) for empty values.

### Immer and Same-Value Writes

Immer's `produce` detects same-value writes and avoids creating new state objects. This is important because the model update callback checks if the state object reference changed before forwarding to the server.

### Model Update Reason Filtering

`ModelProvider` checks `appState.reason` to distinguish internal edits from external updates. It only forwards to `onModelUpdate` when the reason is not `model:initial` or `model:update`, preventing infinite update loops between the form and the server.
