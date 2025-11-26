---
name: backend-model-server
description: "Implement model server changes for form-based modeling. Use for form operations, model serialization, and form-based UI backend based on approved specifications."
---

# Backend Model Server Skill

## When to Use

Use this skill when:
- Implementing form-based editing features
- Adding RPC endpoints for form client
- Updating model serialization/deserialization
- Handling form validation
- Managing model state for forms
- Implementing CRUD operations for form-based UI

**Scope:** `extensions/crossmodel-lang/model-server/`

## Prerequisites

- Specification document (`.claude/specs/TICKET-ID-specification.md`)
- Interface contract (if frontend integration required)
- Understanding of RPC protocol and form architecture

## Input Requirements

- Specification document path
- Interface contract path (if applicable)
- Knowledge of custom RPC protocol (`packages/protocol/`)

## Process

### 1. Analyze Requirements

From specification, determine:
- New RPC methods needed?
- Model access/modification operations?
- Serialization requirements (JSON with cyclic references)?
- Validation rules for forms?
- Document store integration?
- Client notification needs?

### 2. Review Existing Architecture

**Key Files:**
- DI Module: `src/model-server-module.ts`
- Model Service: `src/model-service.ts`
- RPC Protocol: `src/rpc-protocol.ts`
- Serialization: `src/serialization/`
- Document Store Integration: `src/document/`

**Model Server Architecture:**
```
Form Client (RPC Request)
  → Model Server receives request
  → Access Semantic Model (document store)
  → Serialize/Process
  → Return Response
  → (Optional) Notify other clients
```

### 3. Define RPC Protocol Methods

**Modify:** `src/rpc-protocol.ts`

Follow pattern from `packages/protocol/src/jsonrpc.ts`:

```typescript
// Define request/response types
export interface GetEntityRequest {
    uri: string;
    entityId: string;
}

export interface GetEntityResponse {
    entity: SerializedEntity;
}

export interface UpdateEntityRequest {
    uri: string;
    entityId: string;
    updates: Partial<SerializedEntity>;
    clientId: string;
}

export interface UpdateEntityResponse {
    success: boolean;
    updatedEntity?: SerializedEntity;
    error?: string;
}

// Define protocol namespace
export namespace EntityProtocol {
    export const getEntity = 'model/getEntity';
    export const updateEntity = 'model/updateEntity';
}
```

### 4. Implement RPC Method Handlers

**Modify:** `src/model-service.ts`

```typescript
import { injectable, inject } from 'inversify';
import { DocumentStore, AstNode } from 'langium';

@injectable()
export class CrossModelService {
    @inject(DocumentStore)
    protected documentStore: DocumentStore;

    @inject(Serializer)
    protected serializer: Serializer;

    @inject(NotificationService)
    protected notificationService: NotificationService;

    // RPC method: Get entity for form display
    async getEntity(request: GetEntityRequest): Promise<GetEntityResponse> {
        // 1. Load document from document store
        const document = await this.documentStore.getDocument(URI.parse(request.uri));
        if (!document) {
            throw new Error(`Document not found: ${request.uri}`);
        }

        // 2. Find entity in semantic model
        const rootModel = document.parseResult.value;
        const entity = this.findEntityById(rootModel, request.entityId);
        if (!entity) {
            throw new Error(`Entity not found: ${request.entityId}`);
        }

        // 3. Serialize entity (handle cyclic references)
        const serializedEntity = this.serializer.serialize(entity);

        return { entity: serializedEntity };
    }

    // RPC method: Update entity from form
    async updateEntity(request: UpdateEntityRequest): Promise<UpdateEntityResponse> {
        try {
            // 1. Load document
            const document = await this.documentStore.getDocument(URI.parse(request.uri));
            if (!document) {
                return { success: false, error: 'Document not found' };
            }

            // 2. Find entity
            const rootModel = document.parseResult.value;
            const entity = this.findEntityById(rootModel, request.entityId);
            if (!entity) {
                return { success: false, error: 'Entity not found' };
            }

            // 3. Apply updates
            Object.assign(entity, request.updates);

            // 4. Update document store
            await this.documentStore.update([document.uri], []);

            // 5. Notify other clients
            await this.notificationService.notifyDocumentChange(document.uri);

            // 6. Return updated entity
            const updatedEntity = this.serializer.serialize(entity);
            return { success: true, updatedEntity };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    protected findEntityById(model: Model, entityId: string): Entity | undefined {
        return model.entities.find(e => e.name === entityId || e.$meta?.id === entityId);
    }
}
```

### 5. Register RPC Handlers

**Modify:** `src/model-server-module.ts`

```typescript
import { ContainerModule } from 'inversify';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/shared/vscode-languageserver';

export const modelServerModule = new ContainerModule((bind, unbind, isBound, rebind) => {
    // Bind service
    bind(CrossModelService).toSelf().inSingletonScope();

    // Register RPC connection handler
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler('/crossmodel-model-server', () => {
            const service = ctx.container.get(CrossModelService);

            // Return RPC method map
            return {
                // Map method names to service functions
                [EntityProtocol.getEntity]: service.getEntity.bind(service),
                [EntityProtocol.updateEntity]: service.updateEntity.bind(service)
            };
        })
    ).inSingletonScope();
});
```

### 6. Handle Serialization with Cyclic References

**Modify:** `src/serialization/serializer.ts`

Models may have circular references (e.g., Entity A references Entity B, which references Entity A).

```typescript
@injectable()
export class CrossModelSerializer {
    serialize(node: AstNode, seen = new WeakMap()): any {
        if (!node) return null;

        // Handle cyclic references
        if (seen.has(node)) {
            // Return reference ID instead of full object
            return { $ref: this.getNodeId(node) };
        }

        seen.set(node, true);

        const serialized: any = {
            $type: node.$type,
            $id: this.getNodeId(node)
        };

        // Serialize properties
        for (const [key, value] of Object.entries(node)) {
            if (key.startsWith('$')) continue; // Skip meta properties

            if (Array.isArray(value)) {
                serialized[key] = value.map(v => this.serializeValue(v, seen));
            } else {
                serialized[key] = this.serializeValue(value, seen);
            }
        }

        return serialized;
    }

    protected serializeValue(value: any, seen: WeakMap<any, boolean>): any {
        if (value === null || value === undefined) {
            return value;
        }

        if (typeof value === 'object' && value.$type) {
            // Another AST node
            return this.serialize(value, seen);
        }

        if (isReference(value)) {
            // Langium reference
            return value.ref ? { $ref: this.getNodeId(value.ref) } : null;
        }

        return value; // Primitive value
    }

    protected getNodeId(node: AstNode): string {
        // Use existing ID or generate one
        return node.$meta?.id || `${node.$type}_${hash(node)}`;
    }

    deserialize(data: any, documentStore: DocumentStore): AstNode {
        // Reverse process: JSON → AST Node
        // Resolve $ref references
        // ...
    }
}
```

### 7. Implement Form Validation

**Add:** `src/validation/form-validator.ts`

Validation specific to form context (beyond language server validation):

```typescript
@injectable()
export class FormValidator {
    validateEntityUpdate(entity: Entity, updates: Partial<Entity>): ValidationError[] {
        const errors: ValidationError[] = [];

        // Validate required fields
        if (updates.name !== undefined && !updates.name.trim()) {
            errors.push({
                field: 'name',
                message: 'Entity name cannot be empty',
                code: 'REQUIRED_FIELD'
            });
        }

        // Validate name uniqueness
        if (updates.name && this.isDuplicateName(entity, updates.name)) {
            errors.push({
                field: 'name',
                message: 'Entity name must be unique',
                code: 'DUPLICATE_NAME'
            });
        }

        // Validate attribute types
        if (updates.attributes) {
            for (const attr of updates.attributes) {
                if (!this.isValidAttributeType(attr.type)) {
                    errors.push({
                        field: `attributes.${attr.name}.type`,
                        message: `Invalid attribute type: ${attr.type}`,
                        code: 'INVALID_TYPE'
                    });
                }
            }
        }

        return errors;
    }
}
```

### 8. Integrate with Document Store

**Critical:** Model server must use language server's document store.

```typescript
@injectable()
export class DocumentStoreIntegration {
    @inject(LanguageServerConnection)
    protected lsConnection: LanguageServerConnection;

    async getDocument(uri: URI): Promise<LangiumDocument> {
        // Request document from language server
        return await this.lsConnection.getDocument(uri);
    }

    async updateDocument(uri: URI, updater: (doc: LangiumDocument) => void): Promise<void> {
        // 1. Get document
        const document = await this.getDocument(uri);

        // 2. Apply updates
        updater(document);

        // 3. Notify language server to update document store
        await this.lsConnection.updateDocument(uri);
    }
}
```

### 9. Handle Client Notifications

When model changes via form, notify all clients:

```typescript
@injectable()
export class ModelChangeNotificationService {
    @inject(ModelServerConnections)
    protected connections: ModelServerConnections;

    async notifyModelChange(uri: string, changeType: 'created' | 'modified' | 'deleted'): Promise<void> {
        // Notify all form clients
        const formClients = this.connections.getFormClients(uri);
        for (const client of formClients) {
            await client.send({
                method: 'model/changed',
                params: { uri, changeType }
            });
        }

        // Also notify other servers (GLSP server, etc.) via language server
        await this.lsConnection.notifyDocumentChange(uri);
    }
}
```

### 10. Add Error Handling

```typescript
// Wrap RPC methods with error handling
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
    method: T
): T {
    return (async (...args: any[]) => {
        try {
            return await method(...args);
        } catch (error) {
            console.error('RPC method error:', error);
            throw {
                code: 'INTERNAL_ERROR',
                message: error.message || 'An internal error occurred',
                data: error
            };
        }
    }) as T;
}

// Use in service
async getEntity(request: GetEntityRequest): Promise<GetEntityResponse> {
    return withErrorHandling(async () => {
        // ... implementation
    })();
}
```

### 11. Add Unit Tests

```typescript
// model-service.spec.ts
import { describe, expect, test, beforeEach } from 'vitest';

describe('CrossModelService', () => {
    let service: CrossModelService;
    let documentStore: DocumentStore;

    beforeEach(() => {
        service = createTestService();
        documentStore = createTestDocumentStore();
    });

    test('should get entity by id', async () => {
        const request: GetEntityRequest = {
            uri: 'file:///test.entity',
            entityId: 'Customer'
        };

        const response = await service.getEntity(request);

        expect(response.entity).toBeDefined();
        expect(response.entity.$type).toBe('Entity');
        expect(response.entity.name).toBe('Customer');
    });

    test('should update entity', async () => {
        const request: UpdateEntityRequest = {
            uri: 'file:///test.entity',
            entityId: 'Customer',
            updates: { name: 'UpdatedCustomer' },
            clientId: 'test-client'
        };

        const response = await service.updateEntity(request);

        expect(response.success).toBe(true);
        expect(response.updatedEntity.name).toBe('UpdatedCustomer');
    });

    test('should handle cyclic references in serialization', () => {
        const entityA = { name: 'A', relationships: [] };
        const entityB = { name: 'B', relationships: [entityA] };
        entityA.relationships.push(entityB);

        const serialized = serializer.serialize(entityA);

        expect(serialized.relationships[0].relationships[0]).toEqual({
            $ref: expect.any(String)
        });
    });
});
```

### 12. Build and Verify

```bash
cd extensions/crossmodel-lang
yarn build
yarn lint
yarn test
```

## Output

- RPC methods implemented
- Serialization handling cyclic references
- Form validation working
- Document store integration correct
- Client notifications functioning
- Unit tests passing
- Build successful

## Handoff

After implementation:
- **To:** `testing-integration` skill (for cross-component tests)
- **To:** `user-story-orchestrator` (for final coordination)

## Context Scope

**Directory:** `extensions/crossmodel-lang/model-server/`

**Key Files:**
- `src/model-server-module.ts` - DI configuration
- `src/model-service.ts` - Core service with RPC methods
- `src/rpc-protocol.ts` - Protocol definitions
- `src/serialization/` - Serialization handlers
- `src/validation/` - Form validation

**Protocol Definition:** `packages/protocol/src/jsonrpc.ts`

**Do NOT modify:**
- Frontend packages (form-client)
- Language server (coordinate via document store)
- GLSP server (unless coordinated)

## Common Tasks

### Task 1: Add New RPC Endpoint

1. Define request/response types
2. Add method to protocol namespace
3. Implement method in service
4. Register in module
5. Add tests
6. Document in interface contract

### Task 2: Add Form Validation Rule

1. Implement validation function
2. Call from update methods
3. Return validation errors to client
4. Add tests for valid/invalid cases

### Task 3: Handle New Model Type

1. Add serialization logic
2. Handle cyclic references
3. Add CRUD operations
4. Update form validator
5. Test serialization round-trip

### Task 4: Improve Performance

1. Add caching for frequently accessed models
2. Optimize serialization for large models
3. Batch notifications
4. Add request throttling

## RPC Best Practices

1. **Type Safety:** Use TypeScript interfaces from protocol package
2. **Error Handling:** Return structured errors with codes
3. **Validation:** Validate on server, not just client
4. **Notifications:** Notify all affected clients
5. **Cyclic References:** Always handle in serialization
6. **Document Store:** Single source of truth via language server
7. **Testing:** Test both success and error paths

## CrossModel Architecture Notes

### Model Server Role
Model server provides **structured access** to semantic models for form-based editing. It's a convenience layer over the document store.

### Data Flow
```
Form Client (edit entity name)
  → RPC: model/updateEntity
  → Model Server receives request
  → Model Server updates semantic model via Document Store
  → Language Server notified
  → Language Server broadcasts change
  → GLSP Client updates diagram
  → Form Client updates form
```

### Serialization Complexity
CrossModel models have circular references:
- Entity A has relationship to Entity B
- Entity B has relationship back to Entity A

Use `$ref` placeholders during serialization to avoid infinite loops.

## Example Implementation

**Scenario:** Add RPC endpoint for validating entity names in forms

**Files Modified:**
```
extensions/crossmodel-lang/model-server/src/
├── rpc-protocol.ts                    (updated)
├── model-service.ts                   (updated)
├── validation/name-validator.ts       (new)
└── model-service.spec.ts              (updated)
```

**Implementation:**
```typescript
// rpc-protocol.ts
export interface ValidateEntityNameRequest {
    uri: string;
    name: string;
    excludeId?: string; // Exclude current entity when checking uniqueness
}

export interface ValidateEntityNameResponse {
    valid: boolean;
    errors: ValidationError[];
}

export namespace ValidationProtocol {
    export const validateEntityName = 'model/validateEntityName';
}

// model-service.ts
async validateEntityName(request: ValidateEntityNameRequest): Promise<ValidateEntityNameResponse> {
    const document = await this.documentStore.getDocument(URI.parse(request.uri));
    const rootModel = document.parseResult.value;

    const errors: ValidationError[] = [];

    // Check empty name
    if (!request.name.trim()) {
        errors.push({
            field: 'name',
            message: 'Entity name cannot be empty',
            code: 'REQUIRED_FIELD'
        });
    }

    // Check duplicate name
    const duplicate = rootModel.entities.find(e =>
        e.name === request.name &&
        e.$meta?.id !== request.excludeId
    );

    if (duplicate) {
        errors.push({
            field: 'name',
            message: `Entity name "${request.name}" already exists`,
            code: 'DUPLICATE_NAME'
        });
    }

    // Check naming convention
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(request.name)) {
        errors.push({
            field: 'name',
            message: 'Entity name must start with uppercase letter and contain only alphanumeric characters',
            code: 'INVALID_FORMAT'
        });
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
```

## Troubleshooting

**Issue:** RPC calls not reaching server
- Check connection is established
- Verify method names match exactly
- Check server is running and registered

**Issue:** Cyclic reference errors
- Verify serializer handles `$ref` placeholders
- Check WeakMap usage for visited nodes
- Test with simple cyclic structure first

**Issue:** Document store out of sync
- Ensure language server is notified of changes
- Check URI formats match exactly
- Verify update() is called after modifications

**Issue:** Form validation not working
- Check validation runs before update
- Verify error format matches client expectations
- Test validation logic independently

---

**Remember:** Model server bridges form UI and semantic model. Keep it focused on structured access, serialization, and form-specific validation.
