# Type-Aware Forms Design

## Goal

When an instance (DataModel, Entity, Relationship, etc.) has its `type` field set to an ObjectDefinition, the form should dynamically show custom properties defined by that ObjectDefinition and its full inheritance chain (`extends`). Properties inherited from the type definition should have their `id` and `name` locked (read-only), while `value` remains editable by the user.

Long-term direction: forms should be rendered dynamically based on the properties present in the current object, reducing the need for hard-coded per-type forms.

---

## Current State

### What exists
- Forms are hard-coded per type: `DataModelForm`, `EntityForm`, `RelationshipForm`, etc.
- Each form uses specific context hooks (`useDataModel()`, `useEntity()`, etc.)
- `CustomPropertiesDataGrid` shows user-added custom properties with name/value/description columns
- `type` field on forms uses `AsyncAutoComplete` to pick an ObjectDefinition reference
- The client receives `type` as a string reference (e.g., `"LogicalDataModel"`)
- `resolveReference(CrossReference)` can resolve a reference to its full document root

### What's missing
- No server API to resolve an ObjectDefinition by type reference and return its full property definitions (including inherited ones)
- No logic to walk the `extends` chain and collect all `CustomPropertyDefinition`s
- Forms don't react to `type` changes to show type-derived properties
- No distinction between "type-defined" vs "user-added" custom properties in the UI

---

## Design

### Phase 1: Server-side API

#### 1a. Extends chain resolver utility

**File:** `packages/server/src/language-server/util/ast-util.ts`

Add a utility function to walk the `extends` chain of an ObjectDefinition and collect all property definitions:

```typescript
/**
 * Collects all CustomPropertyDefinitions from an ObjectDefinition and its
 * extends chain, from root ancestor down to the given definition.
 * Each entry is tagged with the source definition ID.
 */
interface ResolvedPropertyDefinition {
   definition: CustomPropertyDefinition;
   sourceDefinitionId: string;
   inherited: boolean; // true if from a parent, false if from the definition itself
}

function resolveAllPropertyDefinitions(
   objectDef: ObjectDefinition,
   visited?: Set<string>
): ResolvedPropertyDefinition[];
```

This walks `objectDef.extends?.ref` recursively, collecting parent definitions first (so parent properties appear before child properties). Uses a `visited` set to prevent infinite loops from circular extends.

#### 1b. New RPC endpoint: `ResolveObjectDefinition`

**Protocol types** in `packages/protocol/src/model-service/protocol.ts`:

```typescript
export interface ResolvedPropertyDefinition {
   definition: CustomPropertyDefinition;
   sourceDefinitionId: string;
   inherited: boolean;
}

export interface ResolvedObjectDefinition {
   id: string;
   name?: string;
   abstract?: boolean;
   extends?: string;
   propertyDefinitions: ResolvedPropertyDefinition[];
}

export interface ResolveObjectDefinitionArgs {
   type: string;           // The type reference string (e.g., "EnsembleDataModel")
   contextUri: string;     // URI of the document requesting resolution (for scope)
}

export const ResolveObjectDefinition = new rpc.RequestType1<
   ResolveObjectDefinitionArgs,
   ResolvedObjectDefinition | undefined,
   void
>('server/resolveObjectDefinition');
```

**Server implementation** in `packages/server/src/model-server/model-service.ts`:

Add `resolveObjectDefinition(args)` that:
1. Uses the scope provider to resolve the type reference string within the context of the given document URI
2. Gets the ObjectDefinition AST node
3. Calls `resolveAllPropertyDefinitions()` to get the full property chain
4. Serializes and returns the result

**Wire up** through:
- `packages/server/src/model-server/model-server.ts` — register request handler
- `packages/model-service/src/common/model-service-rpc.ts` — add to `ModelServiceServer` interface
- `packages/model-service/src/node/model-service-server.ts` — forward to language server
- `packages/model-service/src/browser/model-service.ts` — expose to browser

#### 1c. Extend ModelQueryApi

**File:** `packages/react-model-ui/src/ModelContext.tsx`

Add to `ModelQueryApi`:
```typescript
resolveObjectDefinition(args: ResolveObjectDefinitionArgs): Promise<ResolvedObjectDefinition | undefined>;
```

---

### Phase 2: React hook for type-derived properties

**New file:** `packages/react-model-ui/src/hooks/useTypeProperties.ts`

Create a React hook that:
1. Takes the current `type` reference string and the document URI
2. Calls `api.resolveObjectDefinition()` when `type` changes
3. Returns the resolved property definitions (or empty if no type)
4. Handles loading state and caching

```typescript
interface UseTypePropertiesResult {
   propertyDefinitions: ResolvedPropertyDefinition[];
   loading: boolean;
   definitionName?: string;
}

function useTypeProperties(type: string | undefined, uri: string): UseTypePropertiesResult;
```

This hook debounces/deduplicates API calls (only fetches when `type` actually changes) and returns the resolved definitions for the current type.

---

### Phase 3: Type-derived properties section in forms

#### 3a. New component: `TypePropertiesSection`

**New file:** `packages/react-model-ui/src/views/common/TypePropertiesDataGrid.tsx`

A new component that renders type-derived custom properties. For each `ResolvedPropertyDefinition`:
- Shows `name` (read-only, from definition)
- Shows `description` (read-only, from definition)
- Shows `value` field (editable by user)
- Shows `datatype` as a hint/label
- Indicates which parent definition the property comes from (e.g., a subtle badge or grouping header)
- Shows `mandatory` indicator if applicable

**Behavior:**
- The component maps definition properties to actual `CustomProperty` instances on the object
- A property defined by the type but not yet present on the instance gets a placeholder row (greyed out until user provides a value)
- Mandatory properties without values show a validation indicator
- Properties whose `id`/`name` come from the definition are locked (non-editable)
- `value` column is always editable (this is what the user fills in)
- The component dispatches existing `customProperty:add-customProperty` and `customProperty:update` actions

#### 3b. Update DataModelForm (first form)

**File:** `packages/react-model-ui/src/views/form/DataModelForm.tsx`

Add a new `FormSection` labeled "Type Properties" (or integrate into existing "Custom properties"):
- Uses `useTypeProperties(dataModel.type, uri)` hook
- Renders `TypePropertiesDataGrid` with the resolved definitions
- Section is hidden when no type is set or type has no property definitions

The existing "Custom properties" section remains for user-added properties that aren't part of the type definition.

#### 3c. Update EntityForm, RelationshipForm similarly

Same pattern: add `useTypeProperties` hook and `TypePropertiesDataGrid` to each form that has a `type` field.

---

### Phase 4: Custom property merge logic

When the user sets a type and that type defines properties, we need to handle the merge between type-defined and user-added properties:

**Approach:** Type-defined properties and user-added properties are kept separate in the UI but stored in the same `customProperties` array on the model. The distinction is:
- A custom property whose `id` matches a `CustomPropertyDefinition.id` from the resolved type is "type-derived"
- A custom property with no matching definition is "user-added"

The `TypePropertiesDataGrid` component:
1. Gets the full list of `ResolvedPropertyDefinition`s from the hook
2. For each definition, finds the matching `CustomProperty` in `customProperties` by `id`
3. If found: shows the property with its current value (name/id locked)
4. If not found: shows a placeholder row with the definition's name/description but empty value
5. When user edits a placeholder's value: dispatches `customProperty:add-customProperty` with `id`/`name` from the definition and the user's value
6. When user edits an existing property's value: dispatches `customProperty:update`

The regular `CustomPropertiesDataGrid` filters OUT properties whose id matches a type definition, so they aren't shown twice.

---

### Phase 5: Future direction (sketch)

To move toward fully dynamic forms:
- Define a `FormDescriptor` that describes form sections and fields as metadata
- Each ObjectDefinition (or its extends chain) could contribute form sections
- A generic `DynamicForm` component renders from the descriptor
- Standard fields (name, description, type) would be part of a base descriptor
- Type-specific sections (attributes, identifiers, dependencies) would be contributed by domain root definitions (Entity, DataModel, etc.)
- This would allow new ObjectDefinition subtypes to add custom form sections without code changes

This is a significant architecture shift and should be a separate future effort.

---

## Files to Modify/Create

### New files
| File | Purpose |
|------|---------|
| `packages/react-model-ui/src/hooks/useTypeProperties.ts` | React hook for fetching type property definitions |
| `packages/react-model-ui/src/views/common/TypePropertiesDataGrid.tsx` | Grid component for type-derived properties |

### Modified files
| File | Change |
|------|--------|
| `packages/server/src/language-server/util/ast-util.ts` | Add `resolveAllPropertyDefinitions()` utility |
| `packages/server/src/model-server/model-service.ts` | Add `resolveObjectDefinition()` method |
| `packages/server/src/model-server/model-server.ts` | Register `ResolveObjectDefinition` handler |
| `packages/protocol/src/model-service/protocol.ts` | Add `ResolvedPropertyDefinition`, `ResolvedObjectDefinition`, `ResolveObjectDefinitionArgs`, `ResolveObjectDefinition` RPC type |
| `packages/model-service/src/common/model-service-rpc.ts` | Add `resolveObjectDefinition` to `ModelServiceServer` |
| `packages/model-service/src/node/model-service-server.ts` | Forward `resolveObjectDefinition` to language server |
| `packages/model-service/src/browser/model-service.ts` | Expose `resolveObjectDefinition` to browser |
| `packages/react-model-ui/src/ModelContext.tsx` | Add `resolveObjectDefinition` to `ModelQueryApi` |
| `packages/react-model-ui/src/views/form/DataModelForm.tsx` | Add type properties section |
| `packages/react-model-ui/src/views/form/EntityForm.tsx` | Add type properties section |
| `packages/react-model-ui/src/views/form/RelationshipForm.tsx` | Add type properties section |
| `packages/react-model-ui/src/views/common/CustomPropertiesDataGrid.tsx` | Filter out type-derived properties |

---

## Implementation Order

1. **Server utility:** `resolveAllPropertyDefinitions()` in ast-util.ts
2. **Protocol types:** Add interfaces and RPC type in protocol.ts
3. **Server endpoint:** Wire up through model-server → model-service → model-service-server
4. **Client wiring:** model-service-rpc → browser model-service → ModelQueryApi
5. **React hook:** `useTypeProperties`
6. **Grid component:** `TypePropertiesDataGrid`
7. **DataModelForm:** Integrate hook + grid (first form)
8. **Other forms:** EntityForm, RelationshipForm
9. **Filter user properties:** Update CustomPropertiesDataGrid to exclude type-derived

---

## Verification

1. Create a custom ObjectDefinition (e.g., `EnsembleDataModel extends LogicalDataModel`) with custom property definitions
2. Set a DataModel's type to `EnsembleDataModel`
3. Verify the form shows the type-derived properties with locked name/id and editable value
4. Verify inherited properties from `LogicalDataModel` (if any) also appear
5. Verify abstract types still don't appear in the type dropdown
6. Verify user-added custom properties still work independently
7. Verify changing the type updates the displayed properties
8. Full build: `yarn build:browser`
