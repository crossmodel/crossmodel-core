# Dynamic Form Rendering System Design

## Overview

This design introduces a **metadata-driven dynamic form rendering system** that can automatically render the correct form for any opened `*.cm` file based on the shape of the `CrossModelRoot` content. It operates alongside existing hand-coded forms without modifying them.

The system uses a **schema registry** that maps each root object type (DataModel, LogicalEntity, Relationship, ObjectDefinition) to a declarative schema describing its fields, sections, and collections. A set of generic React components consume these schemas to render forms dynamically.

### Goals

- **Dynamic rendering**: Render the correct form for any `*.cm` file based on object metadata
- **Schema-driven**: Declarative field/section/collection definitions per root type
- **Reuse existing components**: PrimeDataGrid for collections, FormSection for grouping, DiagnosticManager for validation
- **Non-destructive**: Leave existing DataModelForm, EntityForm, RelationshipForm intact
- **Extensible**: Adding a new root type only requires adding a schema entry

### Access Model

The dynamic form editor is registered as a separate Theia editor with lower priority than the CompositeEditor. Users access it via **"Open With > Dynamic Form Editor"** from the context menu. The existing form editors remain the default.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Theia Integration Layer                                │
│  ┌───────────────────────┐  ┌────────────────────────┐  │
│  │ DynamicFormEditor      │  │ DynamicFormEditor      │  │
│  │ OpenHandler (pri: 500) │  │ Widget                 │  │
│  └───────────────────────┘  └────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  Dynamic Rendering Layer                                │
│  ┌────────────┐ ┌──────────────┐ ┌───────────────────┐  │
│  │ DynamicForm │ │ DynamicField  │ │ DynamicCollection │  │
│  │ (top-level) │ │ (per-field)   │ │ (per-array)       │  │
│  └────────────┘ └──────────────┘ └───────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  Schema Layer                                           │
│  ┌──────────────────────┐  ┌──────────────────────────┐ │
│  │ DynamicFormSchema     │  │ SchemaRegistry           │ │
│  │ (type definitions)    │  │ (DataModel, Entity, ...) │ │
│  └──────────────────────┘  └──────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│  Generic Reducer Layer                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │ DynamicFormReducer (dynamic:set-property, etc.)  │   │
│  │ Integrated into existing ModelReducer chain       │   │
│  └──────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  Existing Infrastructure (unchanged)                    │
│  ModelProvider, ModelContext, DiagnosticManager,         │
│  PrimeDataGrid, FormSection, AsyncAutoComplete, etc.    │
└─────────────────────────────────────────────────────────┘
```

## Schema System

### Core Types

```typescript
type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'reference' | 'dropdown' | 'readonly';

interface FieldDescriptor {
  property: string;          // Property name on the model object
  label: string;             // Human-readable label
  fieldType: FieldType;      // Widget type to render
  required?: boolean;
  dropdownOptions?: Array<{ label: string; value: string }>;
  referenceProperty?: string; // For CrossReferenceContext
  undefinedIfEmpty?: boolean; // Convert '' to undefined
}

interface CollectionDescriptor {
  property: string;           // Array property name
  label: string;              // Section label
  renderMode: 'existing' | 'custom-properties';
  existingComponent?: React.ComponentType<any>; // For 'existing' mode
  defaultCollapsed?: boolean;
}

interface FormSectionDescriptor {
  label: string;
  fields: FieldDescriptor[];
  defaultCollapsed?: boolean;
}

interface DynamicFormSchema {
  rootKey: keyof CrossModelRoot;   // e.g., 'datamodel', 'entity'
  rootType: string;                // e.g., 'DataModel', 'LogicalEntity'
  displayName: string;
  iconClass: string;
  diagnosticPath: string;          // e.g., 'datamodel', 'entity'
  hasTypeProperty: boolean;        // Whether to show type reference + resolve type properties
  sections: FormSectionDescriptor[];
  collections: CollectionDescriptor[];
}
```

### Schema Definitions

#### DataModel
```typescript
{
  rootKey: 'datamodel',
  rootType: 'DataModel',
  displayName: 'Data Model',
  iconClass: ModelStructure.DataModel.ICON_CLASS,
  diagnosticPath: 'datamodel',
  hasTypeProperty: true,
  sections: [{
    label: 'General',
    fields: [
      { property: 'name', label: 'Name', fieldType: 'text', required: true, undefinedIfEmpty: true },
      { property: 'description', label: 'Description', fieldType: 'textarea', undefinedIfEmpty: true },
      { property: 'type', label: 'Type', fieldType: 'reference', referenceProperty: 'type' },
      { property: 'version', label: 'Version', fieldType: 'text', undefinedIfEmpty: true }
    ]
  }],
  collections: [
    { property: 'dependencies', label: 'Dependencies', renderMode: 'existing',
      existingComponent: DataModelDependenciesDataGrid },
    { property: 'customProperties', label: 'Custom properties', renderMode: 'custom-properties' }
  ]
}
```

#### LogicalEntity
```typescript
{
  rootKey: 'entity',
  rootType: 'LogicalEntity',
  displayName: 'Entity',
  iconClass: ModelStructure.LogicalEntity.ICON_CLASS,
  diagnosticPath: 'entity',
  hasTypeProperty: true,
  sections: [{
    label: 'General',
    fields: [
      { property: 'name', label: 'Name', fieldType: 'text', required: true, undefinedIfEmpty: true },
      { property: 'description', label: 'Description', fieldType: 'textarea', undefinedIfEmpty: true }
    ]
  }],
  collections: [
    { property: 'superEntities', label: 'Inheritance', renderMode: 'existing',
      existingComponent: EntityInheritsDataGrid, defaultCollapsed: true },
    { property: 'attributes', label: 'Attributes', renderMode: 'existing',
      existingComponent: EntityAttributesDataGrid },
    { property: 'identifiers', label: 'Identifiers', renderMode: 'existing',
      existingComponent: EntityIdentifiersDataGrid },
    { property: 'customProperties', label: 'Custom properties', renderMode: 'custom-properties' }
  ]
}
```

#### Relationship
```typescript
{
  rootKey: 'relationship',
  rootType: 'Relationship',
  displayName: 'Relationship',
  iconClass: ModelStructure.Relationship.ICON_CLASS,
  diagnosticPath: 'relationship',
  hasTypeProperty: true,
  sections: [{
    label: 'General',
    fields: [
      { property: 'name', label: 'Name', fieldType: 'text', required: true, undefinedIfEmpty: true },
      { property: 'description', label: 'Description', fieldType: 'textarea', undefinedIfEmpty: true },
      { property: 'parent', label: 'Parent', fieldType: 'reference', referenceProperty: 'parent' },
      { property: 'child', label: 'Child', fieldType: 'reference', referenceProperty: 'child' },
      { property: 'parentRole', label: 'Parent Role', fieldType: 'text', undefinedIfEmpty: true },
      { property: 'childRole', label: 'Child Role', fieldType: 'text', undefinedIfEmpty: true },
      { property: 'parentCardinality', label: 'Parent Cardinality', fieldType: 'dropdown',
        dropdownOptions: [
          { label: '0..1', value: '0..1' }, { label: '1..1', value: '1..1' },
          { label: '0..N', value: '0..N' }, { label: '1..N', value: '1..N' }
        ]},
      { property: 'childCardinality', label: 'Child Cardinality', fieldType: 'dropdown',
        dropdownOptions: [
          { label: '0..1', value: '0..1' }, { label: '1..1', value: '1..1' },
          { label: '0..N', value: '0..N' }, { label: '1..N', value: '1..N' }
        ]}
    ]
  }],
  collections: [
    { property: 'attributes', label: 'Attributes', renderMode: 'existing',
      existingComponent: RelationshipAttributesDataGrid },
    { property: 'customProperties', label: 'Custom properties', renderMode: 'custom-properties' }
  ]
}
```

#### ObjectDefinition (NEW — no existing form)
```typescript
{
  rootKey: 'objectDefinition',
  rootType: 'ObjectDefinition',
  displayName: 'Object Definition',
  iconClass: ModelStructure.ObjectDefinition.ICON_CLASS,
  diagnosticPath: 'objectDefinition',
  hasTypeProperty: false,
  sections: [{
    label: 'General',
    fields: [
      { property: 'name', label: 'Name', fieldType: 'text', required: true, undefinedIfEmpty: true },
      { property: 'description', label: 'Description', fieldType: 'textarea', undefinedIfEmpty: true },
      { property: 'abstract', label: 'Abstract', fieldType: 'boolean' },
      { property: 'extends', label: 'Extends', fieldType: 'reference', referenceProperty: 'extends' }
    ]
  }],
  collections: [
    { property: 'customProperties', label: 'Property Definitions', renderMode: 'custom-properties' }
  ]
}
```

## Generic Reducer

Instead of type-specific action interfaces, a single generic action handles all scalar property changes:

```typescript
// New actions
interface DynamicSetPropertyAction {
  type: 'dynamic:set-property';
  rootKey: string;     // e.g., 'datamodel', 'entity'
  property: string;    // e.g., 'name', 'description'
  value: any;
  undefinedIfEmpty?: boolean;
}

interface DynamicSetIdAction {
  type: 'dynamic:set-id';
  rootKey: string;
  id: string;
}
```

The `DynamicFormReducer` is integrated into the existing `ModelReducer` dispatch chain:

```typescript
// In ModelReducer.tsx — add to DispatchAction union and dispatch chain:
if (isDynamicFormDispatchAction(action)) {
  return DynamicFormReducer(state, action);
}
```

This works with undo/redo because `ModelHistory` tracks model states by deep-cloning `CrossModelRoot`. The generic actions produce the same Immer-based mutations as existing typed actions.

### Collection Operations

For collections, the dynamic form **delegates to existing components**:
- DataGrid components (EntityAttributesDataGrid, etc.) use their own typed dispatch actions internally
- CustomPropertiesDataGrid uses `${contextType}:customProperty:*` actions

This means no new collection actions are needed for the initial implementation.

### CustomPropertiesDataGrid Context Type

The existing `CustomPropertiesDataGrid` accepts `contextType: 'entity' | 'relationship' | 'datamodel'` which is used to construct dispatch action prefixes like `${contextType}:customProperty:update`. For ObjectDefinition, we need to:

1. Add `'objectDefinition'` to the `contextType` union in `CustomPropertiesDataGrid`
2. Add `ObjectDefinitionCustomPropertyUpdateAction` etc. to a new `ObjectDefinitionReducer`
3. Or, extend the dynamic reducer to handle `dynamic:customProperty:*` actions generically

The simplest approach: add `'objectDefinition'` to contextType and create matching reducer actions in a new `ObjectDefinitionReducer.ts` following the same pattern as `DataModelReducer.ts`.

## React Components

### DynamicForm (top-level)

```
DynamicForm
├── Form (header with id, name, icon)
├── DynamicSection × N (each wraps FormSection/Accordion)
│   └── DynamicField × N (polymorphic field renderer)
└── DynamicCollection × N (delegates to existing grids)
```

**DynamicForm** reads the model via `useModel()`, finds the schema via `getSchemaForRoot()`, and renders sections and collections.

### DynamicField (polymorphic field renderer)

Based on `FieldDescriptor.fieldType`, renders:

| fieldType   | Component              | Notes                                    |
|-------------|------------------------|------------------------------------------|
| `text`      | `<InputText>`          | Standard text input                      |
| `textarea`  | `<InputTextarea>`      | Multi-line, autoResize, rows=3           |
| `number`    | `<InputNumber>`        | PrimeReact InputNumber                   |
| `boolean`   | `<Checkbox>`           | PrimeReact Checkbox                      |
| `reference` | `<AsyncAutoComplete>`  | Loads options via findReferenceableElements |
| `dropdown`  | `<AutoComplete>`       | Static options from schema               |
| `readonly`  | `<span>`               | Plain text display                       |

Each field:
1. Gets diagnostics via `useDiagnosticsManager().info(schema.diagnosticPath, field.property)`
2. Applies `inputClasses()` CSS class for validation styling
3. Renders `<ErrorInfo>` below the field
4. Auto-generates ID when `name` changes on untitled files

### DynamicCollection (collection delegator)

Two modes:
- **`existing`**: Renders the referenced React component directly (e.g., `EntityAttributesDataGrid`)
- **`custom-properties`**: Renders `CustomPropertiesDataGrid` with the appropriate `contextType` and `propertyDefinitions` from `useTypeProperties()`

## Theia Integration

### DynamicFormEditorOpenHandler

- Priority: **500** (below CompositeEditor's 2000, above FormEditor's 1)
- Handles `.cm` files except `.diagram.cm` and `.mapping.cm`
- Available via "Open With > Dynamic Form Editor"
- ID: `'dynamic-form-editor-opener'`

### DynamicFormEditorWidget

- Extends `FormEditorWidget` (which extends `CrossModelWidget`)
- Overrides `render()` to use a single `DynamicFormComponent` instead of the type-dispatched logic
- Inherits all model lifecycle: open/close/update/save/dirty/undo/redo
- Uses same `ModelProvider` infrastructure

### Frontend Module Registration

Add bindings to `form-client-frontend-module.ts` alongside existing ones:

```typescript
bind(DynamicFormEditorOpenHandler).toSelf().inSingletonScope();
bind(OpenHandler).toService(DynamicFormEditorOpenHandler);
bind(FrontendApplicationContribution).toService(DynamicFormEditorOpenHandler);
bind<WidgetFactory>(WidgetFactory).toDynamicValue(context => ({
  id: DynamicFormEditorOpenHandler.ID,
  createWidget: (navigatableOptions: NavigatableWidgetOptions) => {
    const container = context.container.createChild();
    // ... bind options and create DynamicFormEditorWidget
  }
}));
```

## File Structure

### New Files

```
packages/react-model-ui/src/
  dynamic/
    index.ts                          — barrel exports
    schema.ts                         — FieldDescriptor, CollectionDescriptor, DynamicFormSchema types
    schema-registry.ts                — Schema definitions per root type + getSchemaForRoot()
    DynamicForm.tsx                   — Top-level dynamic form component
    DynamicSection.tsx                — Section renderer (wraps FormSection)
    DynamicField.tsx                  — Polymorphic field renderer
    DynamicCollection.tsx             — Collection delegator
  DynamicFormReducer.ts              — Generic property-set reducer
  ObjectDefinitionReducer.ts         — ObjectDefinition-specific reducer (for custom properties)

packages/form-client/src/browser/
  dynamic-form-editor-open-handler.ts — Theia open handler
  dynamic-form-editor-widget.tsx      — Theia widget
```

### Modified Files

```
packages/react-model-ui/src/ModelReducer.tsx
  — Add DynamicFormDispatchAction + ObjectDefinitionDispatchAction to DispatchAction union
  — Add dispatch routing for both

packages/react-model-ui/src/index.ts
  — Add exports for dynamic module

packages/react-model-ui/src/views/common/CustomPropertiesDataGrid.tsx
  — Add 'objectDefinition' to contextType union

packages/form-client/src/browser/form-client-frontend-module.ts
  — Add DynamicFormEditorOpenHandler + widget factory bindings

packages/form-client/src/browser/index.ts
  — Add exports for new classes
```

## Implementation Phases

### Phase 1: Schema & Reducer Foundation
1. Create `dynamic/schema.ts` with type definitions
2. Create `DynamicFormReducer.ts` with generic set-property actions
3. Create `ObjectDefinitionReducer.ts` for ObjectDefinition custom property actions
4. Modify `ModelReducer.tsx` to integrate both new reducers
5. Create `dynamic/schema-registry.ts` with schemas for DataModel, LogicalEntity, Relationship, ObjectDefinition

### Phase 2: React Components
6. Create `DynamicField.tsx` — polymorphic field renderer
7. Create `DynamicSection.tsx` — section wrapper
8. Create `DynamicCollection.tsx` — collection delegator
9. Create `DynamicForm.tsx` — top-level form
10. Create `dynamic/index.ts` barrel export
11. Update `CustomPropertiesDataGrid.tsx` contextType union
12. Update `packages/react-model-ui/src/index.ts` exports

### Phase 3: Theia Integration
13. Create `dynamic-form-editor-open-handler.ts`
14. Create `dynamic-form-editor-widget.tsx`
15. Update `form-client-frontend-module.ts` with bindings
16. Update `form-client/src/browser/index.ts` with exports

### Phase 4: Verification
17. Build: `yarn build` from workspace root
18. Test with DataModel file (simplest schema)
19. Test with Entity file (complex collections)
20. Test with Relationship file (reference fields + dropdowns)
21. Test with ObjectDefinition file (boolean + extends reference — new form!)
22. Verify diagnostics display, undo/redo, save, dirty state
