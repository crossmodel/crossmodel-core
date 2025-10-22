# Change Log

All notable changes to the "crossmodel-merge" extension will be documented in this file.

## [0.9.5] - 2024-10-19

### Added
- Initial release of CrossModel Merge extension
- 3-way merge support for CrossModel files using Langium AST reflection
- Identity-based node reconciliation using IdentifiedObject.id
- AST-aware diffing with automatic schema discovery
- Checkbox-based UI for selecting changes to apply
- Commands for preview diff, merge from ref, apply selected, and submit changes
- Integration with VS Code Git API for merge operations
- Support for both VS Code and Eclipse Theia
- Conflict detection and resolution
- Tree view grouped by file and change type
- Serialization via existing CrossModel serializer (no custom YAML generation)
- Configurable model file glob pattern
- Accept all ours/theirs shortcuts for conflicts

### Features
- **2-way diff preview**: Compare HEAD vs working tree
- **3-way merge**: Merge changes from any ref/branch with conflict detection
- **AST-aware diffing**: Uses Langium reflection to discover properties dynamically
- **Identity-based reconciliation**: Uses IdentifiedObject.id for stable node identity
- **Checkbox UI**: Select which changes to apply
- **Serialization via CrossModel serializer**: No custom YAML/text generation

### Technical Details
- Schema-agnostic design using Langium runtime reflection
- Supports scalar properties, singleton children, and array children
- Unordered set reconciliation for child arrays
- Conflict detection per property
- Deep cloning for AST node operations
- WorkspaceEdit-based file modifications
