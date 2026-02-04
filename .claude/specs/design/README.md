# CrossModel Dynamic Form System — Design Documentation

This documentation describes the **schema-driven dynamic form system** implemented in CrossModel. It covers the full stack: from Langium grammar definitions on the server to the React-based form rendering on the client.

## Documents

| # | Document | What It Covers |
|---|----------|---------------|
| 00 | [Architecture Overview](00-architecture-overview.md) | System layers, package responsibilities, data flow, key design decisions |
| 01 | [Grammar & Type System](01-grammar-and-type-system.md) | Langium grammar structure, ObjectDefinition hierarchy, definition subtypes, built-in definitions, scope provider, code generation |
| 02 | [Server Resolution & Serialization](02-server-resolution-and-serialization.md) | YAML serializer, type inheritance resolution, enriched model (server-side `$resolvedType`), model service lifecycle, protocol types |
| 03 | [Dynamic Form UI System](03-dynamic-form-ui-system.md) | Component tree, DynamicForm/Section/Field/Collection, state management (Immer + undo/redo), Theia widget integration, dirty state detection |
| 04 | [Schema Registry & Form Schemas](04-schema-registry-and-form-schemas.md) | Schema interfaces (DynamicFormSchema, FieldDescriptor, GridColumnDescriptor, CollectionDescriptor), concrete schemas for all types, custom properties factory, how to add new forms |
| 05 | [Data Grid & Definition Rows](05-data-grid-and-definition-rows.md) | DynamicDataGrid internals, row types (committed/uncommitted/virtual), per-row type rendering from enriched model, column rendering, definition row editing, serialize/deserialize hooks, filtering |

## Reading Order

For a general understanding, read in order: 00 → 01 → 02 → 03 → 04 → 05.

For specific topics:
- **"How do I add a form for a new type?"** → 04 (Schema Registry), then 01 (Grammar) if a new grammar type is needed
- **"How does type inheritance work?"** → 01 (Grammar hierarchy) → 02 (Server resolution) → 05 (Definition rows in the grid)
- **"How does the form render?"** → 03 (UI system) → 04 (Schema definitions)
- **"How does serialization work?"** → 02 (Serialization section)

## Key File Locations

### Grammar & Server
```
packages/server/src/language-server/
├── grammar/
│   ├── terminals.langium
│   ├── common.langium           ← shared interfaces, ObjectDefinition (interface + rule), abstract definition subtypes, CustomProperty
│   ├── cross-model.langium      ← entry rule
│   ├── entity.langium           ← Entity, Attribute, Identifier + their definitions
│   ├── relationship.langium     ← Relationship + RelationshipDefinition
│   ├── datamodel.langium        ← DataModel + DataModelDefinition
│   ├── mapping.langium
│   └── system-diagram.langium
├── builtin/                     ← built-in abstract root definitions
├── generated/ast.ts             ← auto-generated AST types (yarn langium:generate)
├── cross-model-serializer.ts    ← AST → YAML
├── cross-model-scope-provider.ts ← reference completion and filtering
└── util/
    ├── ast-util.ts              ← resolveAllPropertyDefinitions, resolveInheritedProperties
    └── serialization-util.ts    ← metadata tables for serialization

packages/server/src/model-server/
└── model-service.ts             ← open/update/save, model enrichment with type resolution
```

### Protocol
```
packages/protocol/src/
├── model-service/protocol.ts    ← all type definitions, RPC contracts
└── model.ts                     ← file types, extensions, folders, detectFileType
```

### UI
```
packages/react-model-ui/src/
├── dynamic/
│   ├── schema.ts                ← schema type interfaces
│   ├── schema-registry.ts       ← concrete schemas + registry
│   ├── DynamicForm.tsx          ← entry component
│   ├── DynamicSection.tsx       ← section with scalar fields
│   ├── DynamicField.tsx         ← individual field rendering
│   ├── DynamicCollection.tsx    ← collection wrapper
│   ├── DynamicDataGrid.tsx      ← data grid (biggest component)
│   └── RowDetailDialog.tsx      ← item-level detail form
├── ModelProvider.tsx             ← context provider with Immer + undo/redo
├── ModelContext.tsx              ← context hooks
├── ModelReducer.tsx              ← action routing
├── DynamicFormReducer.ts        ← generic dynamic actions
└── views/common/
    └── GenericEditors.tsx        ← reusable grid cell editors
```

### Theia Integration
```
packages/form-client/src/browser/
├── dynamic-form-editor-widget.tsx      ← DynamicFormComponent wrapper
├── dynamic-form-editor-open-handler.ts ← priority 3000 open handler
├── form-editor-widget.tsx              ← base widget with undo/redo
└── form-client-frontend-module.ts      ← Inversify registration

packages/core/src/browser/
├── model-widget.tsx                    ← base CrossModelWidget
└── new-element-contribution.ts         ← file creation commands
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Language Server | [Langium](https://langium.org/) |
| Server Runtime | Node.js |
| Client-Server Communication | JSON-RPC via `vscode-jsonrpc` |
| UI Framework | React 18 |
| State Management | [Immer](https://immerjs.github.io/immer/) via `use-immer` |
| UI Component Library | [PrimeReact](https://primereact.org/) |
| IDE Framework | [Theia](https://theia-ide.org/) |
| Dependency Injection | [Inversify](https://inversify.io/) |
| Build | TypeScript, Webpack |
