# CrossModel Merge Extension

A VS Code extension for 3-way merge of CrossModel files, driven by Langium AST reflection.

## Features

- **2-way diff preview**: Compare HEAD vs working tree
- **3-way merge**: Merge changes from any ref/branch with conflict detection
- **AST-aware diffing**: Uses Langium reflection to discover properties dynamically
- **Identity-based reconciliation**: Uses `IdentifiedObject.id` for stable node identity
- **Checkbox UI**: Select which changes to apply
- **Serialization via CrossModel serializer**: No custom YAML/text generation

## Commands

- `CrossModel: Preview Diff` - Show 2-way diff (HEAD vs working tree)
- `CrossModel: Merge from Ref` - Compute 3-way merge with a target branch
- `CrossModel: Apply Selected` - Apply checked changes to working tree
- `CrossModel: Submit Changes` - Commit and push changes
- `CrossModel: Refresh` - Recompute the current view
- `CrossModel: Accept All Ours` - Accept our version for all conflicts
- `CrossModel: Accept All Theirs` - Accept their version for all conflicts

## Configuration

- `crossmodelMerge.modelGlob` - Glob pattern for CrossModel files (default: `**/*.cm`)
- `crossmodelMerge.git.targetRef` - Default target ref for merge (default: prompt)

## Integration with CrossModel

### Serializer Integration

The extension uses the existing CrossModel serializer from the language server. The serializer is accessed via:

```typescript
import { createCrossModelServices } from '../../packages/server/src/language-server/cross-model-module.js';

const services = createCrossModelServices({ connection: undefined });
const serializer = services.CrossModel.serializer.Serializer;
const text = serializer.serialize(root, destinationUri);
```

**Important**: The import path in `src/io/parse.ts` must be updated to match your repository structure.

### Identity via IdentifiedObject

All top-level CrossModel documents and most children implement `IdentifiedObject` with a stable `id` field:

```langium
interface IdentifiedObject {
    id?: string;
}
```

The merge logic prefers `node.id` for identity. If `id` is not present, it synthesizes a key from `$type` and visible scalar properties.

### Schema-Agnostic Design

The extension uses Langium runtime reflection to discover properties. It does NOT hard-code property names or types. This means:

- **Automatic adaptation**: Grammar changes (new properties, sections) appear automatically
- **No maintenance**: No need to update the extension when the grammar evolves
- **Type-safe**: Uses Langium's `AstReflection` API

### Testing the Extension

1. **Install dependencies**:
   ```bash
   cd extensions/crossmodel-merge
   yarn install
   ```

2. **Build the extension**:
   ```bash
   yarn build
   ```

3. **Test in VS Code**:
   - Open VS Code to the `extensions/crossmodel-merge` directory
   - Press F5 to launch Extension Development Host
   - Open a workspace with CrossModel files
   - Use the commands from the Command Palette (Ctrl+Shift+P)

4. **View changes**:
   - The "CrossModel Changes" view appears in the SCM sidebar
   - Shows grouped changes by file and type
   - Checkboxes appear in merge mode

## How It Works

### 1. Discovery (reflection-based)

```typescript
import { discoverProps } from './reflection/discover';

const props = discoverProps(node, reflection, hints);
// Returns: { scalars, singletons, arrays }
```

Ignores properties starting with `$`. Categorizes properties into:
- **Scalars**: primitives, nulls, references
- **Singletons**: single child nodes
- **Arrays**: arrays of child nodes

### 2. Identity Resolution

```typescript
import { resolveId } from './reflection/ids';

const id = resolveId(node, hint);
```

Prefers `node.id` from `IdentifiedObject`. Falls back to synthesized key from `$type` and scalar properties.

### 3. 3-Way Diff

```typescript
import { diff3Node } from './diff3/diff-nodes';

const change = diff3Node(base, ours, theirs, fileUri, reflection, hints);
```

Produces a `Change` tree with:
- **kind**: `add` | `remove` | `update` | `rename`
- **details**: per-property deltas (base/ours/theirs)
- **conflicts**: true if both sides changed differently
- **children**: nested changes

### 4. Apply Changes

```typescript
import { applySelected } from './apply/apply';

const modified = applySelected(oursRoot, rootChange, selection, reflection, hints);
```

Mutates the `ours` AST based on selected changes. Handles:
- Property updates
- Child node additions/removals
- Deep cloning from `theirs`

### 5. Serialization

```typescript
import { serializeWithCrossModel } from './io/emit';

const text = serializeWithCrossModel(modified, fileUri);
```

Delegates to the existing CrossModel serializer. No custom YAML/text generation.

## Requirements

- VS Code ≥ 1.95.0
- Node.js 18+
- Git extension (built-in)
- CrossModel language server (from `@crossmodel/server`)

## Known Limitations

- Add operations require access to the `theirs` AST node (not fully implemented)
- Rename detection for root nodes not yet implemented
- No graphical diff viewer (only tree view)
- Works best with files that have stable `id` properties

## Troubleshooting

### "CrossModel serializer not found"

Check that the import path in `src/io/parse.ts` is correct:
```typescript
import { createCrossModelServices } from '../../../packages/server/src/language-server/cross-model-module.js';
```

### "Failed to parse file"

Ensure the file is a valid CrossModel file and the Langium grammar is up to date. Check the console for parse errors.

### Checkboxes not appearing

Ensure you're using "Merge from Ref" (not "Preview Diff"). Diff mode is read-only.

## Contributing

This extension is part of the CrossModel Core project. See the main repository for contribution guidelines.

## License

AGPL-3.0-or-later
