# Architecture Overview: Dynamic Form System

## Purpose

CrossModel uses a **schema-driven dynamic form system** that generates UI forms automatically from declarative schema definitions. Instead of hand-coding a React form for every model type (Entity, Relationship, DataModel, etc.), a single generic form engine renders the correct fields, sections, and data grids based on a `DynamicFormSchema` object registered for each type.

This approach also supports the **ObjectDefinition type system**: a hierarchy of type definitions that provide inherited properties, custom property schemas, and type-safe extends chains for domain-specific subtypes (Entity definitions, Attribute definitions, etc.).

## System Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│  Theia IDE Shell                                                    │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  DynamicFormEditorWidget  (packages/form-client)              │  │
│  │  - Theia widget wrapper (priority 3000 for .cm files)        │  │
│  │  - Handles open/save lifecycle via CrossModelWidget base      │  │
│  │  - Passes model + callbacks to React component                │  │
│  └────────────────────┬──────────────────────────────────────────┘  │
│                       │ renders                                     │
│  ┌────────────────────▼──────────────────────────────────────────┐  │
│  │  DynamicFormComponent  (packages/react-model-ui)              │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │  ModelProvider  (context + undo/redo + dispatch)         │  │  │
│  │  │  ┌──────────────────────────────────────────────────┐   │  │  │
│  │  │  │  DynamicForm                                     │   │  │  │
│  │  │  │  ├── DynamicSection  (scalar fields)             │   │  │  │
│  │  │  │  │   └── DynamicField  (text/number/ref/etc.)    │   │  │  │
│  │  │  │  └── DynamicCollection  (array properties)       │   │  │  │
│  │  │  │      └── DynamicDataGrid  (PrimeReact DataTable) │   │  │  │
│  │  │  │          └── RowDetailDialog  (item-level form)  │   │  │  │
│  │  │  └──────────────────────────────────────────────────┘   │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                       │ RPC                                         │
│  ┌────────────────────▼──────────────────────────────────────────┐  │
│  │  Model Server  (packages/server)                              │  │
│  │  ├── ModelService  (open/update/save/resolve lifecycle)       │  │
│  │  ├── CrossModelSerializer  (AST → YAML text)                 │  │
│  │  ├── Langium Language Server  (parsing, validation, scoping)  │  │
│  │  │   ├── Grammar  (.langium files)                            │  │
│  │  │   ├── ScopeProvider  (cross-reference resolution)          │  │
│  │  │   └── Built-in definitions  (.definition.cm files)         │  │
│  │  └── resolveObjectDefinition  (type inheritance resolution)   │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Package Responsibilities

### `packages/server` — Language Server & Model Server

- **Grammar** (`.langium` files): Defines the YAML-like DSL syntax for entities, relationships, data models, mappings, diagrams, and object definitions.
- **Generated AST** (`generated/ast.ts`): TypeScript interfaces and type guards auto-generated from the grammar by `yarn langium:generate`.
- **Serializer** (`cross-model-serializer.ts`): Converts the Langium AST back to YAML text. Handles property ordering, indentation, reference formatting, and default-value skipping.
- **Serialization utilities** (`util/serialization-util.ts`): Metadata tables for property keywords, type-specific keywords, property ordering, unquoted/inline types, and default values.
- **AST utilities** (`util/ast-util.ts`): Functions for creating AST nodes, resolving property definitions through inheritance chains, and managing implicit properties.
- **Scope provider** (`cross-model-scope-provider.ts`): Controls what references appear in autocompletion. Handles domain-scoped filtering (e.g., Entity types only see EntityDefinition options).
- **Model service** (`model-server/model-service.ts`): The RPC facade. Handles open/close/update/save lifecycle, cross-reference resolution, ID generation, and `resolveObjectDefinition` for type inheritance queries.
- **Built-in definitions** (`builtin/*.definition.cm`): Abstract root type definitions shipped with the application (Entity, Attribute, Relationship, Identifier, DataModel, CustomProperty, and standard DataModel subtypes).

### `packages/protocol` — Shared Types

- **Protocol types** (`model-service/protocol.ts`): TypeScript interfaces for all model objects (CrossModelRoot, LogicalEntity, ObjectDefinition subtypes, etc.), RPC message types, and the `ResolveObjectDefinition` API contract.
- **Model structure** (`model.ts`): File type detection, file extensions, folder structure, icon classes, and `detectFileType()` for content-based type detection.

### `packages/react-model-ui` — Dynamic Form UI

- **Schema types** (`dynamic/schema.ts`): TypeScript interfaces for `DynamicFormSchema`, `FieldDescriptor`, `GridColumnDescriptor`, `CollectionDescriptor`, and related configuration types.
- **Schema registry** (`dynamic/schema-registry.ts`): Concrete schema definitions for each model type, registered in a `Map<string, DynamicFormSchema>`. Lookup functions: `getSchemaForRoot()` (by CrossModelRoot content) and `getSchemaForType()` (by $type string for item dialogs).
- **Dynamic components** (`dynamic/*.tsx`): `DynamicForm`, `DynamicSection`, `DynamicField`, `DynamicCollection`, `DynamicDataGrid`, `RowDetailDialog`.
- **Reducer** (`DynamicFormReducer.ts`): Generic reducer handling `dynamic:set-property`, `dynamic:set-id`, and `dynamic:collection:add/update/delete/reorder` actions.
- **Model context** (`ModelContext.tsx`, `ModelProvider.tsx`): React context providing model state, dispatch, undo/redo, diagnostics, and query API to all form components.
- **Generic editors** (`views/common/GenericEditors.tsx`): Reusable PrimeReact-based editor components for grid cells (text, number, dropdown, checkbox, autocomplete).

### `packages/form-client` — Theia Widget Integration

- **DynamicFormEditorWidget**: Extends `FormEditorWidget` → `CrossModelWidget` → Theia `ReactWidget`. Simply renders `<DynamicFormComponent>`.
- **DynamicFormEditorOpenHandler**: Registers with priority 3000 for `.cm` files, making it the default form editor.
- **FormEditorWidget**: Base class providing undo/redo callback management, save integration, selection service, and `NavigatableWidget` support.

### `packages/core` — Base Infrastructure

- **CrossModelWidget** (`model-widget.tsx`): Base Theia widget that handles model document lifecycle (open, update, close, save), dirty state detection (via `fast-deep-equal`), theme integration, and diagnostic forwarding.
- **NewElementContribution** (`new-element-contribution.ts`): Commands and menus for creating new files, including definition subtype creation with proper subfolder routing.

## Data Flow

### Opening a File

```
User double-clicks .entity.cm file
  → DynamicFormEditorOpenHandler.canHandle() returns 3000
  → Theia creates DynamicFormEditorWidget
  → CrossModelWidget.init() opens document via ModelService
  → ModelService parses YAML → Langium AST
  → Server enriches AST: resolves type inheritance, computes inherited properties
    and property definitions, embeds them into the serializable model
  → toSerializable() → enriched CrossModelRoot
  → Widget receives CrossModelDocument { uri, root, diagnostics }
  → Widget renders <DynamicFormComponent model={root} ...>
  → ModelProvider wraps model in Immer state with undo/redo history
  → DynamicForm calls getSchemaForRoot(root) → logicalEntitySchema
  → Renders sections (General) + collections (Inheritance, Attributes, Identifiers, Custom Properties)
  → Components read inherited properties and property definitions directly from the model
```

### Editing a Value

```
User types in Name field
  → DynamicField dispatches { type: 'dynamic:set-property', rootKey: 'entity', property: 'name', value: '...' }
  → ModelReducer → DynamicFormReducer updates Immer draft
  → ModelProvider pushes to history, fires onModelUpdate callback
  → CrossModelWidget.sendUpdate() compares with deepEqual
  → If changed: sends UpdateModel RPC to server
  → Server serializes model → compares with document text
  → If text differs: marks document dirty, validates, sends back diagnostics
  → Server re-enriches the model with fresh type resolution data
  → Widget receives ModelUpdatedEvent with enriched model, updates UI
```

### Type Inheritance Resolution (Server-Side)

```
Entity file with type="Hub" is opened or type field changes
  → Server resolves "Hub" → walks EntityDefinition extends chain
  → Collects:
    a. customProperties from each definition in the chain → propertyDefinitions
    b. type-specific inherited properties (from definition subtypes)
  → Embeds resolved data directly onto the model objects:
    - entity.$resolvedType.propertyDefinitions → virtual custom property rows
    - entity.$resolvedType.inheritedProperties → placeholder values for form fields
    - Per-attribute: attribute.$resolvedType.inheritedProperties → inherited datatype, etc.
  → Client receives the enriched model and renders it directly
  → No async type resolution hooks in the front-end
```

**Design principle:** The front-end is a pure rendering layer. It receives all the data it needs from the server — including resolved type information — and renders it. The front-end contains no logic for walking inheritance chains or combining instance-level data with type-level data.

## Key Design Decisions

1. **Declarative schemas over coded forms**: All form layout is defined in `schema-registry.ts` as data, not as JSX. This makes it trivial to add forms for new types.

2. **Single generic reducer**: The `DynamicFormReducer` handles all model mutations generically (set-property, collection CRUD). No type-specific reducer code needed.

3. **Grammar-driven type system**: The ObjectDefinition hierarchy is defined in Langium grammar and enforced at the parser level. Each definition subtype (EntityDefinition, AttributeDefinition, etc.) has its own grammar rule with type-scoped `extends`.

4. **Server-side type resolution with enriched model**: All type inheritance resolution happens on the server. The model sent to the client is *enriched* with resolved type data (inherited properties, property definitions). The front-end never walks inheritance chains or makes async resolution calls — it reads the resolved data directly from the model objects.

5. **Definition rows as virtual grid rows**: Type-defined custom properties appear as read-only rows in the grid. Users can set values without duplicating the full property definition locally.

6. **Parallel definition type hierarchy**: The ObjectDefinition subtype hierarchy mirrors the instance type hierarchy. Common abstract interfaces (`DataElement`, `DataElementContainer`, etc.) each have a corresponding abstract definition type (`DataElementDefinition`, `DataElementContainerDefinition`, etc.), ensuring that definition type chains are structurally parallel to the instance types they describe.

7. **PrimeReact component library**: All UI widgets (DataTable, InputText, Dropdown, etc.) use PrimeReact, themed to match Theia's VS Code-like appearance.
