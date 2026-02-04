# Server-Side Resolution & Serialization

## Overview

The server layer handles three main responsibilities:
1. **Serialization**: Converting the Langium AST back to YAML text
2. **Type inheritance resolution**: Walking ObjectDefinition extends chains to collect inherited properties
3. **Model lifecycle**: Open/update/save/close documents, cross-reference resolution, ID generation

## Serialization

### Files

- `packages/server/src/language-server/cross-model-serializer.ts` — Main serializer
- `packages/server/src/language-server/util/serialization-util.ts` — Metadata tables and helpers

### How It Works

The `CrossModelSerializer` converts a `CrossModelRoot` AST node back to YAML text. It walks the AST recursively via `toYaml()`, handling each value type differently:

1. **AST nodes** → Serialize each property in grammar-defined order
2. **References** → Convert to `@ref.id.path` format via `toIdReference()`
3. **IDs** → Convert to bare ID format via `toId()`
4. **Arrays** → Serialize as YAML lists with `  - ` prefix
5. **Primitives** → JSON.stringify (strings get quoted, numbers/booleans stay bare)

### Serialization Metadata

The serialization utilities define several metadata tables:

**TYPE_SPECIFIC_KEYWORDS** — Maps AST `$type` to the grammar keyword used in YAML:
```typescript
// Each ObjectDefinition subtype uses a different keyword
'AttributeDefinition' → 'attributeDefinition'
'EntityDefinition' → 'entityDefinition'
'RelationshipDefinition' → 'relationshipDefinition'
'IdentifierDefinition' → 'identifierDefinition'
'DataModelDefinition' → 'datamodelDefinition'
```

When the serializer encounters an ObjectDefinition node, it uses `getPropertyKeyword()` which checks if the node's `$type` has a type-specific keyword override.

**PROPERTY_ORDER** — Defines the property serialization order per type. Important because YAML is order-sensitive for readability:
```typescript
'AttributeDefinition': ['id', 'name', 'description', 'abstract', 'extends', 'datatype', 'length', 'precision', 'scale', 'mandatory', 'customProperties']
```

**UNQUOTED_PROPERTIES** — Properties whose values serialize without JSON quotes:
```typescript
'Cardinality' values, 'abstract' booleans, 'mandatory' booleans, 'primary' booleans, VERSION strings
```

**Default Value Skipping** — `isDefaultValue()` checks if a property value matches the Langium type metadata default. If so, it is omitted from serialization. This prevents serializing `abstract: false` or `mandatory: false` when those are the defaults.

### Serialization Example

Given this AST:
```
AttributeDefinition {
  $type: 'AttributeDefinition',
  id: 'HubKey',
  name: 'Hub Key',
  abstract: false,       // default → skipped
  datatype: 'Integer',
  mandatory: true,
  customProperties: [...]
}
```

Serializes to:
```yaml
attributeDefinition:
    id: HubKey
    name: "Hub Key"
    datatype: "Integer"
    mandatory: true
    customProperties:
      - id: KeyHashAlgorithm
        name: "KeyHashAlgorithm"
        ...
```

## Type Inheritance Resolution

### Files

- `packages/server/src/language-server/util/ast-util.ts` — `resolveAllPropertyDefinitions()`, `resolveInheritedProperties()`
- `packages/server/src/model-server/model-service.ts` — `resolveObjectDefinition()` RPC handler

### resolveAllPropertyDefinitions

Walks the `extends` chain of an ObjectDefinition to collect all `customProperties` from each definition in the hierarchy. Returns a flat list of `ResolvedPropertyDefinition` objects.

**Algorithm:**
1. Start from the given ObjectDefinition
2. Collect its `customProperties` directly
3. Follow `extends` to the parent definition
4. Collect parent's `customProperties`, marking them as `inherited: true`
5. Continue up the chain until reaching a definition with no `extends`
6. For duplicate property IDs: the leaf definition's version wins (first-set priority)
7. Default values are resolved through the chain: leaf's `value` overrides parent's `defaultValue`

**Result shape:**
```typescript
interface ResolvedPropertyDefinition {
    id?: string;
    name?: string;
    description?: string;
    datatype?: string;
    length?: number;
    precision?: number;
    scale?: number;
    mandatory?: boolean;
    defaultValue?: CustomPropertyValue;
    resolvedDefaultValue?: string;  // effective default through hierarchy
    values: CustomPropertyValue[];
    definedIn: string;              // definition ID where this property was first introduced (highest level)
    valueSetIn?: string;            // definition ID where the current value/defaultValue was specified (most specific level)
    inherited: boolean;             // true if from a parent definition (relative to the queried definition)
}
```

**`definedIn` vs `valueSetIn`:** A property may be *defined* (first introduced) at a high level in the hierarchy — e.g., the root `Entity` definition adds a `customProperty` called `"TableName"`. A child definition `Hub` (which extends `Entity`) may then *set a value* on that same property (e.g., `defaultValue: "HUB"`). In this case:
- `definedIn = "Entity"` — the property schema originates from `Entity`
- `valueSetIn = "Hub"` — the effective value was specified in `Hub`

If no definition in the chain sets a value, `valueSetIn` is `undefined`.

### resolveInheritedProperties

Collects type-specific properties (properties beyond the base ObjectDefinition) from the extends chain using Langium's reflection API.

**Algorithm:**
1. Use `reflection.getTypeMetaData(definitionType)` to discover all properties of the definition's AST type
2. Filter to only properties that go beyond the base ObjectDefinition properties
3. Walk the extends chain leaf→root
4. For each definition, check if it has a non-default value for each inheritable property
5. First-set wins: the closest definition in the chain that sets a value provides it

**Result shape:**
```typescript
interface ResolvedInheritedProperties {
    properties: Record<string, any>;         // property name → resolved value
    definedIn: Record<string, string>;       // property name → definition ID where the property was first introduced
    valueSetIn: Record<string, string>;      // property name → definition ID where the value was specified (most specific)
}
```

**`definedIn` vs `valueSetIn` for inherited properties:** For type-specific properties (like `datatype` on `AttributeDefinition`), the property is *defined* by the AST type that declares it — e.g., `datatype` is defined by `AttributeDefinition` itself (the Langium interface). The `definedIn` tracks which definition in the extends chain *first declares a value* for this property, while `valueSetIn` tracks which definition in the chain provides the *effective value* that the instance sees (the most specific / lowest level that set it).

**Example:** Consider an `AttributeDefinition` chain: `TextAttribute` extends `BaseAttribute` extends `Attribute` (root). If `Attribute` defines `datatype: "Text"` and `TextAttribute` overrides with `length: 255` but does not override `datatype`:
```typescript
{
    properties: { datatype: "Text", length: 255 },
    definedIn: { datatype: "Attribute", length: "TextAttribute" },
    valueSetIn: { datatype: "Attribute", length: "TextAttribute" }
}
```

If instead `BaseAttribute` sets `datatype: "Text"` and `TextAttribute` overrides `datatype: "VarChar"`:
```typescript
{
    properties: { datatype: "VarChar", length: 255 },
    definedIn: { datatype: "BaseAttribute", length: "TextAttribute" },
    valueSetIn: { datatype: "TextAttribute", length: "TextAttribute" }
}
```

### Enriched Model: Server-Side Type Resolution

**Design principle:** The front-end is a pure rendering layer. All type inheritance resolution happens on the server before the model reaches the client. The model objects sent to the client are *enriched* with resolved type data so the UI never needs to make async resolution calls or walk inheritance chains.

#### How Enrichment Works

During the `toSerializable()` pipeline (AST → protocol objects), the server detects objects that have a `type` reference (instance types like Entity, Attribute) or an `extends` reference (definition types). For each, it resolves the full type chain and attaches the result as a `$resolvedType` property on the serialized object:

```typescript
// Simplified enrichment during toSerializable
function enrichWithTypeResolution(obj: any, astNode: AstNode): void {
    const typeRef = astNode.type?.ref ?? astNode.extends?.ref;
    if (typeRef && isObjectDefinition(typeRef)) {
        obj.$resolvedType = {
            id: typeRef.id,
            name: typeRef.name,
            definitionType: typeRef.$type,
            propertyDefinitions: resolveAllPropertyDefinitions(typeRef),
            inheritedProperties: resolveInheritedProperties(typeRef)
        };
    }
}
```

#### When Enrichment Happens

Enrichment runs in every scenario where the server sends a model to the client:

1. **Document opened** — initial `toSerializable` produces the enriched model.
2. **Document updated by the user** — after the server processes the update, it re-enriches the model before sending it back. This catches changes to the `type` or `extends` reference itself.
3. **Referenced ObjectDefinition changes** — when a type definition file (`.definition.cm`) is modified, the server must detect that open documents referencing that definition are affected and re-enrich them. This is triggered via the Langium document change/validation pipeline: when a definition document reaches the `Validated` state, any open documents whose `type` or `extends` references point to definitions in that document (or its extends chain) must be re-serialized with fresh enrichment and pushed to the client via `ModelUpdatedEvent`.

The `$resolvedType` property is a convention for enrichment data — it is read-only on the client and stripped before the server processes incoming updates (the client sends back the model without enrichment data, and the server re-enriches after processing).

#### What Gets Enriched

| Object | Type Reference | Enrichment Contains |
|--------|---------------|-------------------|
| Entity (root) | `entity.type` → EntityDefinition | propertyDefinitions (custom property schema), inheritedProperties |
| Attribute (collection item) | `attribute.type` → AttributeDefinition | inheritedProperties (datatype, length, etc.) |
| Relationship (root) | `relationship.type` → RelationshipDefinition | propertyDefinitions, inheritedProperties (cardinality) |
| DataModel (root) | `datamodel.type` → DataModelDefinition | propertyDefinitions |
| Definition (root) | `definition.extends` → parent definition | propertyDefinitions (from parent chain), inheritedProperties |
| CustomProperty (collection item) | `customProperty.type` → ObjectDefinition | inheritedProperties |

#### Per-Item Enrichment

For collection items (attributes, custom properties, identifiers), each item can have its own `type` reference pointing to a different definition. The server enriches *each item individually*:

```typescript
// Each attribute gets its own $resolvedType
entity.attributes = [
    { id: "HubKey", type: "HubKeyDef", $resolvedType: { inheritedProperties: { datatype: "Integer", mandatory: true } } },
    { id: "Name",   type: "TextAttr",   $resolvedType: { inheritedProperties: { datatype: "Text", length: 255 } } }
]
```

This replaces the current approach where the front-end uses `useRowTypeProperties()` to async-resolve each row's type individually.

## Model Service Lifecycle

### Files

- `packages/server/src/model-server/model-service.ts`
- `packages/server/src/model-server/model-server.ts`

### Document Operations

**open(uri):** Opens a document for editing. Sets up change listeners on the underlying Langium document.

**update(uri, model):** The core update flow:
1. Receive the updated CrossModelRoot from the UI (without enrichment data)
2. Strip any `$resolvedType` properties from the incoming model
3. Apply it to the Langium AST via `toAst()` (reverse of `toSerializable()`)
4. Serialize the AST to YAML text via `CrossModelSerializer.serialize()`
5. Compare with current document text
6. If different: update the document text, triggering Langium re-parsing and validation
7. Wait for validation to complete (polls with timeout)
8. Re-enrich the model with fresh type resolution data
9. Return the enriched document with fresh diagnostics

**on definition change:** When an ObjectDefinition document is modified and validated:
1. Server detects which open documents reference definitions in the changed document (or its extends chain)
2. For each affected document, re-runs `toSerializable()` with fresh enrichment
3. Sends `ModelUpdatedEvent` to the client with the re-enriched model
4. Client updates its state with the fresh model (same as receiving any server-originated update)

**save(uri):** Persists the current document text to disk. Clears dirty state.

### toSerializable / toAst

These are the bridge between Langium AST nodes and protocol objects:

- `toSerializable(astNode)`: Walks `Object.entries()` of the AST node, stripping `$`-prefixed internal properties (except `$type` and `$globalId`), recursing into child nodes and arrays. During this walk, it also runs enrichment (attaching `$resolvedType` where applicable). Produces plain JavaScript objects matching the protocol interfaces.
- The reverse (`toAst`) is handled by applying protocol object properties back onto existing AST nodes during `update()`. Enrichment properties (`$resolvedType`) are ignored during this reverse mapping.

### Cross-Reference Resolution

The `ModelService` provides reference resolution for the UI's autocomplete fields:

```typescript
findReferenceableElements(context: CrossReferenceContext): ReferenceableElement[]
```

This delegates to the scope provider, which:
1. Finds the container AST node from the context
2. Creates synthetic elements if needed (for new items being created)
3. Computes the scope for the target property
4. Filters and sorts results (removing abstract definitions, applying domain restrictions)
5. Returns label/value/uri triples for the UI dropdown

## Protocol Types

### Files

- `packages/protocol/src/model-service/protocol.ts`

### Key Types

```typescript
// Root container
interface CrossModelRoot {
    entity?: LogicalEntity;
    relationship?: Relationship;
    mapping?: Mapping;
    systemDiagram?: SystemDiagram;
    datamodel?: DataModel;
    objectDefinition?: ObjectDefinition;  // includes all subtypes
}

// Base definition type
interface ObjectDefinition {
    $type: string;
    id: string;
    name?: string;
    description?: string;
    abstract?: boolean;
    extends?: string;
    customProperties: CustomProperty[];
}

// Definition subtypes add specific properties
interface AttributeDefinition extends ObjectDefinition {
    datatype?: string;
    length?: number;
    precision?: number;
    scale?: number;
    mandatory?: boolean;
}

interface RelationshipDefinition extends ObjectDefinition {
    parentCardinality?: string;
    childCardinality?: string;
}

interface IdentifierDefinition extends ObjectDefinition {
    primary?: boolean;
}

// Enrichment data attached by the server
interface ResolvedObjectDefinition {
    id: string;
    name?: string;
    definitionType: string;
    propertyDefinitions: ResolvedPropertyDefinition[];
    inheritedProperties?: ResolvedInheritedProperties;
}
```

### Enrichment Convention

Any protocol object that has a `type` or `extends` reference may carry a `$resolvedType: ResolvedObjectDefinition` property. This is:
- **Set by the server** during `toSerializable()` enrichment
- **Read by the client** for rendering inherited values and definition rows
- **Stripped by the server** when receiving updates from the client (the client does not maintain or modify enrichment data)

There is no dedicated RPC endpoint for type resolution — the resolved data is always embedded in the model objects themselves.
