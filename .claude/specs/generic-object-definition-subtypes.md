# Refactor: Generic ObjectDefinition Subtypes, Inherited Properties & Unified Custom Properties Grid

## Goal

1. **Generic definition subtypes**: Add `EntityDefinition`, `RelationshipDefinition`, `IdentifierDefinition`, `DataModelDefinition` grammar types
2. **Generic inherited properties**: Replace hardcoded `resolveAttributeProperties`/`ResolvedAttributeProperties` with generic `resolveInheritedProperties`/`ResolvedInheritedProperties`
3. **Unified custom properties grid**: Replace the hand-coded `CustomPropertiesDataGrid` (780 lines) with the generic `DynamicDataGrid` + declarative column schema, by adding "definition rows" support to `DynamicDataGrid`

## Architecture

```
ObjectDefinition (base: id, name, description, abstract, extends, customProperties)
  ├── AttributeDefinition      (+ datatype, length, precision, scale, mandatory)
  ├── RelationshipDefinition   (+ parentCardinality, childCardinality)
  ├── IdentifierDefinition     (+ primary)
  ├── EntityDefinition         (customProperties only — placeholder)
  └── DataModelDefinition      (customProperties only — placeholder)

DynamicDataGrid (unified grid component)
  ├── Standard rows (from model array)
  ├── Per-row type inheritance (inherited values from definition chain)
  └── Definition rows (virtual rows from propertyDefinitions, value-only editing)  ← NEW
```

---

## Step 1: Grammar — Add new definition subtypes with type-scoped extends

### `packages/server/src/language-server/grammar/common.langium`

Add interface declarations (after `AttributeDefinition`). Each subtype **overrides** `extends` to reference its own type, ensuring type-safe inheritance chains:

```langium
interface EntityDefinition extends ObjectDefinition {
    extends?: @EntityDefinition;
}
interface RelationshipDefinition extends ObjectDefinition {
    extends?: @RelationshipDefinition;
    parentCardinality?: string;
    childCardinality?: string;
}
interface IdentifierDefinition extends ObjectDefinition {
    extends?: @IdentifierDefinition;
    primary?: boolean;
}
interface DataModelDefinition extends ObjectDefinition {
    extends?: @DataModelDefinition;
}
```

Also update **existing** `AttributeDefinition` to scope its extends:
```langium
interface AttributeDefinition extends ObjectDefinition, WithDataType {
    extends?: @AttributeDefinition;
}
```

### `packages/server/src/language-server/grammar/objectdefinition.langium`

Add parser rules with type-scoped `extends` references. Note: move `Cardinality` rule to `common.langium` or import `relationship.langium`.

```langium
EntityDefinition returns EntityDefinition:
    'entityDefinition' ':' INDENT NamedObjectFragment
        (abstract?='abstract' ':' ('TRUE' | 'true'))?
        ('extends' ':' extends=[EntityDefinition:IDReference])?
        CustomPropertiesFragment? DEDENT;

RelationshipDefinition returns RelationshipDefinition:
    'relationshipDefinition' ':' INDENT NamedObjectFragment
        (abstract?='abstract' ':' ('TRUE' | 'true'))?
        ('extends' ':' extends=[RelationshipDefinition:IDReference])?
        ('parentCardinality' ':' parentCardinality=Cardinality)?
        ('childCardinality' ':' childCardinality=Cardinality)?
        CustomPropertiesFragment? DEDENT;

IdentifierDefinition returns IdentifierDefinition:
    'identifierDefinition' ':' INDENT NamedObjectFragment
        (abstract?='abstract' ':' ('TRUE' | 'true'))?
        ('extends' ':' extends=[IdentifierDefinition:IDReference])?
        (primary?='primary' ':' ('TRUE' | 'true'))?
        CustomPropertiesFragment? DEDENT;

DataModelDefinition returns DataModelDefinition:
    'datamodelDefinition' ':' INDENT NamedObjectFragment
        (abstract?='abstract' ':' ('TRUE' | 'true'))?
        ('extends' ':' extends=[DataModelDefinition:IDReference])?
        CustomPropertiesFragment? DEDENT;
```

Also update **existing** `AttributeDefinition` parser rule:
```langium
AttributeDefinition returns AttributeDefinition:
    'attributeDefinition' ':' INDENT NamedObjectFragment
        (abstract?='abstract' ':' ('TRUE' | 'true'))?
        ('extends' ':' extends=[AttributeDefinition:IDReference])?
        DataTypePropertiesFragment
        CustomPropertiesFragment? DEDENT;
```

### `packages/server/src/language-server/grammar/cross-model.langium`

Add all to entry rule under `objectDefinition=` property.

### Convert built-in root definitions

Since each subtype's `extends` now only accepts its own type, the built-in abstract roots must be converted from `objectDefinition:` to their specialized keyword:

| File | Old keyword | New keyword |
|------|------------|-------------|
| `packages/server/src/language-server/builtin/Entity.definition.cm` | `objectDefinition:` | `entityDefinition:` |
| `packages/server/src/language-server/builtin/Attribute.definition.cm` | `objectDefinition:` | `attributeDefinition:` |
| `packages/server/src/language-server/builtin/Relationship.definition.cm` | `objectDefinition:` | `relationshipDefinition:` |
| `packages/server/src/language-server/builtin/Identifier.definition.cm` | `objectDefinition:` | `identifierDefinition:` |
| `packages/server/src/language-server/builtin/DataModel.definition.cm` | `objectDefinition:` | `datamodelDefinition:` |

Note: `CustomProperty.definition.cm` stays as `objectDefinition:` since there's no `CustomPropertyDefinition` subtype.

The example `ExampleLogicalDataModel.definition.cm` (extends `LogicalDataModel`) also needs to be converted to `datamodelDefinition:`, and any other DataModel definitions (`LogicalDataModel.definition.cm`, `ConceptualDataModel.definition.cm`, `PhysicalDataModel.definition.cm`, `RelationalDataModel.definition.cm`) must also be converted.

### Run `yarn langium:generate`

---

## Step 2: Protocol — Generic inherited properties

### `packages/protocol/src/model-service/protocol.ts`

**Remove** `ResolvedAttributeProperties`. **Add**:

```typescript
export interface ResolvedInheritedProperties {
   properties: Record<string, any>;
   propertySources: Record<string, string>;
}
```

**Update** `ResolvedObjectDefinition`:
```typescript
export interface ResolvedObjectDefinition {
   id: string;
   name?: string;
   abstract?: boolean;
   extends?: string;
   definitionType: string;  // NEW
   propertyDefinitions: ResolvedPropertyDefinition[];
   inheritedProperties?: ResolvedInheritedProperties;  // REPLACES attributeProperties
}
```

**Add** type constants: `EntityDefinitionType`, `RelationshipDefinitionType`, `IdentifierDefinitionType`, `DataModelDefinitionType` with interfaces.

**Update** `CrossModelRoot.objectDefinition` type union.

---

## Step 3: File Detection

### `packages/protocol/src/model.ts`

Add `detectFileType` cases for `entityDefinition`, `relationshipDefinition`, `identifierDefinition`, `datamodelDefinition` → `'ObjectDefinition'`.

---

## Step 4: Serialization

### `packages/server/src/language-server/util/serialization-util.ts`

Add `TYPE_SPECIFIC_KEYWORDS` and `PROPERTY_ORDER` entries for each new definition type.

---

## Step 5: Server — Generic `resolveInheritedProperties`

### `packages/server/src/language-server/util/ast-util.ts`

**Remove** `resolveAttributeProperties`. **Add** `resolveInheritedProperties` using Langium's `reflection.getTypeMetaData()` to dynamically discover inheritable properties (properties on the definition type that go beyond base `ObjectDefinition`). Walk extends chain leaf→root, first-set wins.

### `packages/server/src/model-server/model-service.ts`

- Generic `getElementById` lookup across all ObjectDefinition subtypes
- Return `definitionType: node.$type` and `inheritedProperties`

---

## Step 6: Scope Provider

### `packages/server/src/language-server/cross-model-scope-provider.ts`

- Add `EntityDefinition: 'Entity'`, `RelationshipDefinition: 'Relationship'`, `IdentifierDefinition: 'Identifier'`, `DataModelDefinition: 'DataModel'` to `TYPE_DOMAIN_MAP`
- Change `description.type === 'ObjectDefinition'` to `reflection.isSubtype(description.type, 'ObjectDefinition')` to match all definition subtypes
- For `extends` references on definition subtypes: the Langium-generated scope already constrains by reference type (e.g., `AttributeDefinition.extends` typed as `@AttributeDefinition` will only show `AttributeDefinition` nodes). The `filterCompletion` method still needs to hide `abstract` definitions and can optionally validate domain roots for `type` references on instance types

---

## Step 7: UI — Generic inherited properties in hooks/components

### `packages/react-model-ui/src/hooks/useTypeProperties.ts`

Replace `attributeProperties` with `inheritedProperties?: Record<string, any>` in result interface.

### `packages/react-model-ui/src/dynamic/DynamicSection.tsx`

Use `inheritedProperties` instead of `attributeProperties` for `typeDefaults`.

### `packages/react-model-ui/src/dynamic/DynamicDataGrid.tsx`

- Change `TypePropertiesMap` to `Map<string, Record<string, any>>`
- Update `useRowTypeProperties` to use `inheritedProperties?.properties`

---

## Step 8: Unify CustomPropertiesDataGrid into DynamicDataGrid

This is the major UI refactoring. The goal is to **eliminate the `CustomPropertiesDataGrid` component** and the `'custom-properties'` renderMode entirely, replacing it with the generic `DynamicDataGrid` using declarative column schemas.

### 8a: Add "definition rows" support to `DynamicDataGrid`

**New `CollectionDescriptor` field:**
```typescript
/**
 * When true, the grid supports "definition rows" — virtual rows from the type's
 * propertyDefinitions that don't yet have a local entry. These rows allow value-only
 * editing and are enriched with metadata from the definition.
 */
supportsDefinitionRows?: boolean;
```

**New `DynamicRow` fields:**
```typescript
interface DynamicRow extends Record<string, any> {
   idx: number;
   id: string;
   _uncommitted?: boolean;
   _typeProperty?: boolean;   // NEW: row comes from type's propertyDefinitions
   _inherited?: boolean;      // NEW: property is from a parent definition
   _source?: string;          // NEW: source definition ID
}
```

**Definition rows logic in DynamicDataGrid:**

In the `sync model → gridData` effect, when `collection.supportsDefinitionRows` is true:

1. Get `propertyDefinitions` from `useTypeProperties(schema.typeProperty ? rootObj[schema.typeProperty] : undefined)`
2. Build local rows from `rootObj[collection.property]`, enriching with definition metadata where IDs match
3. For definition properties without local entries, create virtual rows with `_typeProperty: true`, `idx: -1`
4. Virtual rows are prepended to the grid data (before local rows)

**Definition row editing behavior:**
- Non-value columns (name, description, datatype, etc.) are read-only for `_typeProperty` rows
- The `value` column is editable
- When a value is set: dispatch an `add` action to create a local custom property with just `id` and `value`
- When a value is cleared: dispatch a `delete` action to remove the local custom property

This logic is currently in `CustomPropertiesDataGrid.onRowUpdate` and can be generalized into `DynamicDataGrid.handleRowUpdate` with a check for `_typeProperty`.

### 8b: Add column-level `readonlyForTypeProperty` flag

Some columns should be read-only when the row is a type-defined property (name, description, datatype, length, precision, scale, mandatory). Others should be editable (value). Add:

```typescript
interface GridColumnDescriptor {
   // ...existing fields...
   /** If true, this column is read-only for type-property rows (_typeProperty). */
   readonlyForTypeProperty?: boolean;
}
```

In `createColumnEditor`, when `options.rowData._typeProperty && descriptor.readonlyForTypeProperty`, return a read-only span instead of the editor.

In `createColumnBody`, when `rowData._typeProperty && descriptor.readonlyForTypeProperty`, display the value directly without EditorProperty wrapper.

### 8c: Convert custom properties schema to use `dynamic` renderMode

In `schema-registry.ts`, replace all `renderMode: 'custom-properties'` collections with:

```typescript
{
   property: 'customProperties',
   label: 'Custom properties',
   renderMode: 'dynamic',
   itemType: CustomPropertyType,
   supportsDefinitionRows: true,
   addButtonLabel: 'Add Property',
   noDataMessage: 'No custom properties',
   columns: [
      { property: 'name', header: 'Name', columnType: 'text', width: '15%', filterType: 'text', readonlyForTypeProperty: true },
      { property: 'description', header: 'Description', columnType: 'text', width: '15%', filterType: 'text', readonlyForTypeProperty: true },
      { property: 'datatype', header: 'Datatype', columnType: 'dropdown', width: '10%', filterType: 'text',
        dropdownOptions: dataTypeOptions, readonlyForTypeProperty: true },
      { property: 'length', header: 'Length', columnType: 'number', width: '70px', readonlyForTypeProperty: true,
        dependency: { sourceProperty: 'datatype', isApplicable: isLengthApplicable, ... } },
      { property: 'precision', header: 'Precision', columnType: 'number', width: '70px', readonlyForTypeProperty: true,
        dependency: { sourceProperty: 'datatype', isApplicable: isPrecisionApplicable, ... } },
      { property: 'scale', header: 'Scale', columnType: 'number', width: '70px', readonlyForTypeProperty: true,
        dependency: { sourceProperty: 'datatype', isApplicable: isScaleApplicable, ... } },
      { property: 'mandatory', header: 'Mandatory', columnType: 'boolean', width: '50px', readonlyForTypeProperty: true },
      { property: 'value', header: 'Value', columnType: 'text', width: '15%', filterType: 'text' }
   ]
}
```

The `_source` column is conditionally added when `supportsDefinitionRows` is true (can be done in `DynamicDataGrid` automatically or via an optional extra column in the schema).

### 8d: Remove `CustomPropertiesDataGrid` and `'custom-properties'` renderMode

- **Delete** `packages/react-model-ui/src/views/common/CustomPropertiesDataGrid.tsx`
- **Remove** `'custom-properties'` from `CollectionDescriptor.renderMode` type
- **Remove** the `custom-properties` branch from `DynamicCollection.tsx`
- **Update** `DynamicCollection.tsx` to pass `propertyDefinitions` to `DynamicDataGrid` when `supportsDefinitionRows` is true

### 8e: Update `DynamicCollection` to pass property definitions

```typescript
export function DynamicCollection({ collection, schema, rootObj }: DynamicCollectionProps): React.ReactElement {
   const { propertyDefinitions } = useTypeProperties(
      schema.typeProperty ? rootObj[schema.typeProperty] : undefined
   );

   return (
      <FormSection label={collection.label} defaultCollapsed={collection.defaultCollapsed}>
         {collection.renderMode === 'existing' && collection.existingComponent && (
            <collection.existingComponent />
         )}
         {collection.renderMode === 'dynamic' && collection.columns && (
            <DynamicDataGrid
               collection={collection}
               schema={schema}
               rootObj={rootObj}
               propertyDefinitions={collection.supportsDefinitionRows ? propertyDefinitions : undefined}
            />
         )}
      </FormSection>
   );
}
```

### 8f: Update `ObjectDefinitionReducer`

The `ObjectDefinitionReducer` currently handles `objectDefinition:customProperty:*` actions. These need to become generic `dynamic:collection:*` actions with `collectionProperty: 'customProperties'`, or the existing `ObjectDefinitionReducer` can be kept as-is and the `DynamicDataGrid` dispatches through it.

**Preferred approach:** Since `DynamicFormReducer` already handles `dynamic:collection:add/update/delete/reorder` generically, the `DynamicDataGrid` already dispatches those. The `ObjectDefinitionReducer` actions (`objectDefinition:customProperty:*`) can be removed once all custom property management goes through `DynamicDataGrid`.

However, for definition-row value-only editing, we need special dispatch logic:
- When a `_typeProperty` row's value is set → dispatch `dynamic:collection:add` with just `{ $type, id, value }`
- When a `_typeProperty` row's value is cleared and it has a local entry → dispatch `dynamic:collection:delete`
- When a `_typeProperty` row with an existing local entry is updated → dispatch `dynamic:collection:update` with just `{ $type, $globalId, id, value }`

This can be handled in `DynamicDataGrid.handleRowUpdate` by checking `row._typeProperty`.

---

## Step 9: UI — Register schemas for new definition types

### `packages/react-model-ui/src/dynamic/schema-registry.ts`

Register form schemas for `EntityDefinition`, `RelationshipDefinition`, `IdentifierDefinition`, `DataModelDefinition`:

- Each has a General section with common fields (id, name, description, abstract, extends)
- RelationshipDefinition adds parentCardinality, childCardinality fields
- IdentifierDefinition adds primary field
- All have a customProperties collection using `dynamic` renderMode with `supportsDefinitionRows: true`

---

## Step 10: Tests

- Update existing `cross-model-lang-attribute-definition.test.ts` to use `resolveInheritedProperties`
- Add parse/serialize tests for `entityDefinition`, `relationshipDefinition`, `identifierDefinition`, `datamodelDefinition`
- Add generic resolution tests for `resolveInheritedProperties` across all definition types
- Add inheritance chain override tests

---

## Files to Modify

| File | Change |
|------|--------|
| `packages/server/src/language-server/grammar/common.langium` | Add 4 new definition interfaces |
| `packages/server/src/language-server/grammar/objectdefinition.langium` | Add 4 new parser rules |
| `packages/server/src/language-server/grammar/cross-model.langium` | Add to entry rule |
| `packages/protocol/src/model-service/protocol.ts` | Replace ResolvedAttributeProperties → ResolvedInheritedProperties, add types |
| `packages/protocol/src/model.ts` | detectFileType for new keywords |
| `packages/server/src/language-server/util/serialization-util.ts` | TYPE_SPECIFIC_KEYWORDS + PROPERTY_ORDER |
| `packages/server/src/language-server/util/ast-util.ts` | Replace resolveAttributeProperties → resolveInheritedProperties |
| `packages/server/src/model-server/model-service.ts` | Generic resolution + type lookup |
| `packages/server/src/language-server/cross-model-scope-provider.ts` | TYPE_DOMAIN_MAP + isSubtype |
| `packages/react-model-ui/src/hooks/useTypeProperties.ts` | inheritedProperties replaces attributeProperties |
| `packages/react-model-ui/src/dynamic/DynamicSection.tsx` | Use inheritedProperties |
| `packages/react-model-ui/src/dynamic/DynamicDataGrid.tsx` | Generic inherited props + definition rows support |
| `packages/react-model-ui/src/dynamic/DynamicCollection.tsx` | Pass propertyDefinitions, remove custom-properties branch |
| `packages/react-model-ui/src/dynamic/schema.ts` | Add supportsDefinitionRows, readonlyForTypeProperty |
| `packages/react-model-ui/src/dynamic/schema-registry.ts` | Convert all custom-properties → dynamic, add 4 new schemas |
| `packages/react-model-ui/src/views/common/CustomPropertiesDataGrid.tsx` | **DELETE** |
| `packages/react-model-ui/src/ObjectDefinitionReducer.ts` | Remove or simplify (actions handled by DynamicFormReducer) |
| `packages/server/src/language-server/builtin/Entity.definition.cm` | Convert `objectDefinition:` → `entityDefinition:` |
| `packages/server/src/language-server/builtin/Attribute.definition.cm` | Convert → `attributeDefinition:` |
| `packages/server/src/language-server/builtin/Relationship.definition.cm` | Convert → `relationshipDefinition:` |
| `packages/server/src/language-server/builtin/Identifier.definition.cm` | Convert → `identifierDefinition:` |
| `packages/server/src/language-server/builtin/DataModel.definition.cm` | Convert → `datamodelDefinition:` |
| `packages/server/src/language-server/builtin/PhysicalDataModel.definition.cm` | Convert → `datamodelDefinition:` |
| `packages/server/src/language-server/builtin/ConceptualDataModel.definition.cm` | Convert → `datamodelDefinition:` |
| `packages/server/src/language-server/builtin/LogicalDataModel.definition.cm` | Convert → `datamodelDefinition:` |
| `packages/server/src/language-server/builtin/RelationalDataModel.definition.cm` | Convert → `datamodelDefinition:` |
| `examples/mapping-example/ExampleDWH/ExampleLogicalDataModel.definition.cm` | Convert → `datamodelDefinition:` |
| `packages/server/test/language-server/cross-model-lang-attribute-definition.test.ts` | Update to generic resolution |

---

## Implementation Order

1. Grammar + `yarn langium:generate` (Step 1)
2. Protocol types (Step 2)
3. File detection (Step 3)
4. Serialization (Step 4)
5. Server resolution (Step 5)
6. Scope provider (Step 6)
7. Build & verify server compiles
8. UI generic inherited properties (Step 7)
9. schema.ts additions (new descriptor fields)
10. DynamicDataGrid definition rows support (Step 8a-8b)
11. Convert custom properties schemas to dynamic (Step 8c)
12. Update DynamicCollection (Step 8e)
13. Delete CustomPropertiesDataGrid (Step 8d)
14. Clean up ObjectDefinitionReducer (Step 8f)
15. Register new definition type schemas (Step 9)
16. Build & verify
17. Tests (Step 10)

---

## Verification

1. `yarn langium:generate` — no errors
2. `yarn build:browser` — no type errors
3. Run existing tests — all pass
4. Test each new definition type can be parsed and serialized
5. Test inherited properties resolution generically
6. Test custom properties grid works with dynamic renderMode (definition rows, value-only editing, enrichment)
7. Test entity attributes grid still shows inherited datatype/length from AttributeDefinition
8. Test relationship form shows inherited cardinality from RelationshipDefinition
