---
name: backend-language-server
description: "Implement language server changes for textual modeling. Use for LSP protocol, grammar updates, document store modifications, or workspace management based on approved specifications."
---

# Backend Language Server Skill

## When to Use

Use this skill when:
- Modifying Langium grammar (`.langium` files)
- Adding/changing semantic model elements
- Implementing LSP protocol features (diagnostics, completion, hover, etc.)
- Updating document store management
- Adding validation rules
- Implementing workspace indexing or package system
- Creating custom LSP commands

**Scope:** `extensions/crossmodel-lang/language-server/`

## Prerequisites

- Specification document (`.claude/specs/TICKET-ID-specification.md`)
- Interface contract (if frontend integration required)
- Understanding of Langium and LSP architecture

## Input Requirements

- Specification document path
- Interface contract path (if applicable)
- Ticket ID

## Process

### 1. Analyze Requirements

From specification, determine:
- Grammar changes needed?
- Semantic model modifications?
- New validation rules?
- LSP protocol features (diagnostics, code actions, etc.)?
- Document store updates?
- Workspace/package management changes?

### 2. Review Existing Architecture

**Key Files:**
- Grammar: `src/language/crossmodel.langium`
- Semantic model: Generated from grammar
- Validator: `src/language/cross-model-validator.ts`
- Scope provider: `src/language/cross-model-scope.ts`
- Module setup: `src/language/cross-model-module.ts`
- Document builder: `src/language/cross-model-document-builder.ts`

**Langium Services:**
```typescript
// Access via dependency injection
services.CrossModel.validation.DocumentValidator
services.CrossModel.workspace.DocumentBuilder
services.shared.AstReflection
services.CrossModel.serializer.Serializer
```

### 3. Implement Grammar Changes (if needed)

**Modify:** `src/language/crossmodel.langium`

```langium
// Example: Add new attribute type
AttributeType:
    'string' | 'number' | 'boolean' | 'date' | 'json'; // Added json

// Example: Add validation annotation
Attribute:
    'attribute' name=ID ':' type=AttributeType
    ('validate' validation=ValidationRule)?; // New optional validation
```

**After grammar changes:**
```bash
cd extensions/crossmodel-lang
yarn langium:generate
```

This regenerates:
- AST types (`src/language/generated/ast.ts`)
- Grammar parser
- Module definitions

### 4. Update Semantic Model (if needed)

**Modify:** Custom AST interfaces in `src/language/...`

```typescript
// Extend generated types with custom logic
export interface CustomEntity extends Entity {
    // Additional computed properties
    readonly allAttributes: Attribute[];
}

// Add utility functions
export function isCustomEntity(node: AstNode): node is CustomEntity {
    return (node as any).$type === 'Entity';
}
```

### 5. Implement Validation Rules

**Modify:** `src/language/cross-model-validator.ts`

```typescript
import { ValidationAcceptor, ValidationChecks } from 'langium';
import { CrossModelAstType, Entity, Relationship } from './generated/ast';

export class CrossModelValidator {
    protected readonly checks: ValidationChecks<CrossModelAstType> = {
        Entity: this.checkEntity,
        Relationship: this.checkCircularReferences, // New check
    };

    protected checkCircularReferences(
        relationship: Relationship,
        accept: ValidationAcceptor
    ): void {
        // Implement circular reference detection
        const visited = new Set<string>();
        if (this.hasCircularReference(relationship, visited)) {
            accept('error',
                'Circular relationship detected',
                { node: relationship, property: 'target' }
            );
        }
    }

    protected hasCircularReference(
        relationship: Relationship,
        visited: Set<string>
    ): boolean {
        // Recursive check logic
        // ...
    }
}
```

**Validation Best Practices:**
- Use semantic checks, not syntactic (grammar handles syntax)
- Provide clear, actionable error messages
- Include source location for precise error placement
- Consider performance for large models

### 6. Implement LSP Features

#### A. Diagnostics (already covered by validator)

#### B. Code Completion
**Modify:** Custom completion provider

```typescript
export class CrossModelCompletionProvider extends DefaultCompletionProvider {
    protected override async completionFor(
        context: CompletionContext,
        next: NextFeature<AstNode>,
        acceptor: CompletionAcceptor
    ): Promise<void> {
        // Custom completion logic
        if (next.type === 'Attribute') {
            // Suggest attribute types
            ['string', 'number', 'boolean', 'date'].forEach(type => {
                acceptor({ label: type, kind: CompletionItemKind.Keyword });
            });
        }
        return super.completionFor(context, next, acceptor);
    }
}
```

#### C. Hover Information
**Modify:** Custom hover provider

```typescript
export class CrossModelHoverProvider extends DefaultHoverProvider {
    protected override getHoverContent(document: LangiumDocument, offset: number): Hover | undefined {
        const element = this.getElementAt(document, offset);
        if (isEntity(element)) {
            return {
                contents: {
                    kind: 'markdown',
                    value: `**Entity:** ${element.name}\n\nAttributes: ${element.attributes.length}`
                }
            };
        }
        return super.getHoverContent(document, offset);
    }
}
```

#### D. Custom LSP Commands
**Modify:** Add command handlers

```typescript
// In module setup
export function createCrossModelServices(context: DefaultSharedModuleContext): {
    shared: LangiumSharedServices;
    CrossModel: CrossModelServices;
} {
    const services = /* ... */;

    // Register custom command
    services.shared.lsp.LanguageServer.onRequest(
        'crossmodel/validateCircular',
        async (params) => {
            // Handle custom command
            return await validateCircular(params.uri);
        }
    );

    return services;
}
```

### 7. Update Document Store Management

**Modify:** `src/language/cross-model-document-builder.ts`

```typescript
export class CrossModelDocumentBuilder extends DefaultDocumentBuilder {
    async update(
        changed: URI[],
        deleted: URI[]
    ): Promise<void> {
        // Custom update logic
        await super.update(changed, deleted);

        // Notify other services
        await this.notifyClientsOfChanges(changed);
    }

    protected async notifyClientsOfChanges(uris: URI[]): Promise<void> {
        // Broadcast to GLSP server, model server, etc.
        // Use shared workspace manager
    }
}
```

### 8. Implement Workspace/Package Management

**Modify:** Workspace manager for package dependencies

```typescript
export class CrossModelWorkspaceManager extends DefaultWorkspaceManager {
    async loadAdditionalDocuments(
        folders: WorkspaceFolder[],
        collector: (document: LangiumDocument) => void
    ): Promise<void> {
        // Load npm package dependencies
        await this.loadPackageDependencies(folders, collector);
        await super.loadAdditionalDocuments(folders, collector);
    }

    protected async loadPackageDependencies(
        folders: WorkspaceFolder[],
        collector: (document: LangiumDocument) => void
    ): Promise<void> {
        // Scan node_modules for CrossModel packages
        // Load .entity, .relationship files from packages
    }
}
```

### 9. Handle Multi-Client Notifications

**Critical:** When document store changes, notify all clients.

```typescript
// After document update
await documentBuilder.update([uri], []);

// Notify GLSP server
await glspServerConnection.notifyDocumentChange(uri);

// Notify model server
await modelServerConnection.notifyDocumentChange(uri);

// LSP clients automatically get diagnostics via standard protocol
```

### 10. Add Unit Tests

```typescript
// cross-model-validator.spec.ts
import { describe, expect, test } from 'vitest';
import { parseHelper } from 'langium/test';

describe('CrossModel Validator', () => {
    const parse = parseHelper(services);

    test('should detect circular references', async () => {
        const document = await parse(`
            entity A {
                relationship b: B
            }
            entity B {
                relationship a: A
            }
        `);

        const diagnostics = await services.CrossModel.validation.DocumentValidator
            .validateDocument(document);

        expect(diagnostics).toContainEqual(
            expect.objectContaining({
                message: expect.stringContaining('Circular relationship')
            })
        );
    });
});
```

### 11. Build and Verify

```bash
cd extensions/crossmodel-lang
yarn build
yarn lint
yarn test
```

## Output

- Grammar updated (if applicable)
- Validation rules implemented
- LSP features added
- Document store handling correct
- Unit tests passing
- Build successful

## Handoff

After implementation:
- **To:** `testing-integration` skill (for cross-component tests)
- **To:** `user-story-orchestrator` (for final coordination)

## Context Scope

**Directory:** `extensions/crossmodel-lang/language-server/`

**Key Files:**
- `src/language/crossmodel.langium` - Grammar definition
- `src/language/cross-model-validator.ts` - Validation rules
- `src/language/cross-model-scope.ts` - Scoping/reference resolution
- `src/language/cross-model-module.ts` - Dependency injection
- `src/language/cross-model-document-builder.ts` - Document management
- `src/language/generated/ast.ts` - Generated AST (don't edit directly)

**Do NOT modify:**
- Frontend packages
- GLSP server (unless coordinated)
- Model server (unless coordinated)

## Common Tasks

### Task 1: Add Grammar Element

1. Update `.langium` file
2. Run `yarn langium:generate`
3. Update validator for new element
4. Add tests
5. Update scoping if cross-references needed

### Task 2: Add Validation Rule

1. Add check to `CrossModelValidator.checks`
2. Implement check function
3. Add unit tests with valid/invalid cases
4. Verify error messages are clear

### Task 3: Add Custom LSP Command

1. Register command handler in module
2. Implement command logic
3. Document in interface contract
4. Test from frontend

### Task 4: Update Document Store Handling

1. Modify `DocumentBuilder`
2. Add notification logic
3. Test multi-client sync
4. Verify all perspectives update

## Langium Best Practices

1. **Grammar First:** Design grammar carefully before implementing logic
2. **Type Safety:** Use generated AST types everywhere
3. **Validation vs. Scoping:** Validation checks correctness; scoping resolves references
4. **Performance:** Cache expensive computations; use lazy evaluation
5. **Error Messages:** User-friendly, actionable messages with source locations
6. **Testing:** Test both valid and invalid cases; use `parseHelper` for setup

## CrossModel Architecture Notes

### Document Store is Source of Truth
All model changes go through Langium document store. Never manipulate AST directly without updating the document.

### Multi-Server Coordination
Language server is the primary owner of document store. GLSP server and model server must sync through it.

### Notification Pattern
```
Language Server (document store change)
  → Notify GLSP Server
  → Notify Model Server
  → Publish LSP diagnostics to editors
```

## Example Implementation

**Scenario:** Add validation for circular entity relationships

**Files Modified:**
```
extensions/crossmodel-lang/language-server/src/language/
├── cross-model-validator.ts         (updated)
├── cross-model-validator.spec.ts    (new tests)
└── utils/graph-utils.ts             (new helper)
```

**Implementation:**
```typescript
// cross-model-validator.ts
export class CrossModelValidator {
    protected checkCircularReferences(
        relationship: Relationship,
        accept: ValidationAcceptor
    ): void {
        const source = relationship.$container;
        const target = relationship.target?.ref;

        if (!source || !target) return;

        if (this.detectCycle(source, target, new Set())) {
            accept('error',
                `Circular relationship detected: ${source.name} → ${target.name}`,
                { node: relationship, property: 'target', code: 'circular-reference' }
            );
        }
    }

    protected detectCycle(
        start: Entity,
        current: Entity,
        visited: Set<Entity>
    ): boolean {
        if (current === start) return true;
        if (visited.has(current)) return false;

        visited.add(current);

        for (const rel of current.relationships) {
            const target = rel.target?.ref;
            if (target && this.detectCycle(start, target, visited)) {
                return true;
            }
        }

        return false;
    }
}
```

## Troubleshooting

**Issue:** Grammar changes not reflected
- Run `yarn langium:generate`
- Rebuild: `yarn build`
- Restart language server

**Issue:** Validation not triggering
- Check validation is registered in `checks` object
- Verify node type matches exactly
- Check ValidationAcceptor usage

**Issue:** Cross-references not resolving
- Update scope provider
- Check grammar reference syntax (`:` vs `=`)
- Verify qualified names

**Issue:** Multi-client sync broken
- Check notification broadcasting
- Verify document URIs match across servers
- Test with multiple editors open

---

**Remember:** Language server is the source of truth. All changes must properly update the document store and notify dependent services.
