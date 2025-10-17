# CrossModel Merge Assistant

This extension provides a Langium-powered 3-way merge experience for CrossModel documents. It discovers schema information from the runtime AST, renders a checkbox-driven tree diff, and applies selections back to the working tree using the existing CrossModel serializer.

## Linking the CrossModel services

The project dynamically loads the CrossModel Langium services via a relative path:

```ts
// src/io/parse.ts
const MODULE_PATH = '../../../../packages/server/src/language-server/cross-model-module';
const { createCrossModelServices } = require(MODULE_PATH);
```

If your workspace hosts the module elsewhere, update `MODULE_PATH` accordingly. In addition, expose the existing serializer in `src/types/langium-bridge.d.ts` by wiring the correct type/field names for your generated services. A TODO in that file shows where to plug the serializer instance (for example `services.CrossModel.serializer` or a registry lookup).

## Building

```bash
yarn install
yarn compile
```

The generated `out/` folder contains the compiled extension.

## Commands

* **CrossModel: Preview AST Diff** (`crossmodel.previewDiff`) – Two-way diff between HEAD and the working tree, rendered as a read-only tree.
* **CrossModel: Merge From Ref** (`crossmodel.mergeFromRef`) – Prompts for a Git ref, performs a 3-way diff (merge-base vs ours vs theirs), and enables checkbox selections.
* **CrossModel: Apply Selected Changes** (`crossmodel.applySelected`) – Applies the currently selected nodes/properties to the working tree, re-serialising via the official CrossModel serializer.
* **CrossModel: Submit CrossModel Changes** (`crossmodel.submitChanges`) – Uses the Git API to commit (via Smart Commit when available) and push the merged changes.

The view toolbar offers shortcuts for refreshing the diff, accepting everything from ours or theirs, applying the selection, and showing the raw textual diff.

## Identity

Every CrossModel node implements `IdentifiedObject` and exposes a stable `id` field. The merge engine always prefers `node.id` as the canonical identity. When a node has no `id`, the resolver synthesises a stable key from the node type and the most descriptive scalar property.

## Serializer

`src/io/emit.ts` delegates to the official CrossModel serializer that ships with your Langium services. No custom emitters or YAML helpers are used, ensuring a deterministic round-trip. Update the TODO in `langium-bridge.d.ts` if the serializer lives under a different field.

## Validation

After applying a selection the extension re-parses the affected files, rebuilds cross-file links, and publishes diagnostics to the Problems view. Diagnostics never block the file write, but help surface broken references early.

## Compatibility

The extension uses only the stable VS Code API (≥1.80) and avoids VS Code specific UI primitives so it also runs inside Eclipse Theia.
