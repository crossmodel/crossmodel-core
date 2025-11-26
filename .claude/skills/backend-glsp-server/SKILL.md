---
name: backend-glsp-server
description: "Implement GLSP server changes for graphical modeling. Use for diagram operations, GModel management, and visual modeling features based on approved specifications."
---

# Backend GLSP Server Skill

## When to Use

Use this skill when:
- Adding new diagram element types
- Implementing diagram operations (create, update, delete, move)
- Updating GModel generation from semantic model
- Adding diagram-specific validation
- Implementing palette tools
- Handling diagram layout
- Creating visual representations of model elements

**Scope:** `extensions/crossmodel-lang/glsp-server/`

## Prerequisites

- Specification document (`.claude/specs/TICKET-ID-specification.md`)
- Interface contract (if frontend integration required)
- Understanding of GLSP architecture and semantic model

## Input Requirements

- Specification document path
- Interface contract path (if applicable)
- Understanding of how semantic model maps to GModel

## Process

### 1. Analyze Requirements

From specification, determine:
- New GModel element types needed?
- Operations to implement (create, delete, update, etc.)?
- Layout requirements?
- Validation in diagram context?
- Integration with document store?
- Client notification needs?

### 2. Review Existing Architecture

**Key Files:**
- DI Module: `src/common/cross-model-diagram-module.ts`
- Model Index: `src/common/model-index.ts`
- Operation Handlers: `src/operations/`
- GModel Factory: `src/diagram/`
- LSP Integration: `src/language-server/`

**GLSP Server Architecture:**
```
Client Request (Operation)
  → Operation Handler
  → Semantic Model Update (via Document Store)
  → GModel Generation
  → Response to Client
  → Notify Other Clients
```

### 3. Understand Semantic Model ↔ GModel Translation

**Critical:** GLSP server reads semantic model from Langium document store and generates GModel.

```typescript
// Semantic Model (from language server)
Entity {
    name: "Customer"
    attributes: [...]
}

// GModel (for diagram)
{
    type: 'node:entity',
    id: 'entity_Customer',
    position: { x: 100, y: 100 },
    size: { width: 120, height: 80 },
    children: [/* labels, compartments, etc. */]
}
```

### 4. Implement GModel Elements (if new types needed)

**Modify:** `src/diagram/` or equivalent

```typescript
// Define GModel node types
export interface EntityNode extends GNode {
    type: 'node:entity';
    name: string;
    attributes: AttributeInfo[];
}

// GModel factory/builder
export class CrossModelGModelFactory {
    createEntityNode(entity: Entity): EntityNode {
        return {
            type: 'node:entity',
            id: this.idProvider.getNodeId(entity),
            position: this.getPosition(entity),
            size: this.calculateSize(entity),
            name: entity.name,
            attributes: entity.attributes.map(a => ({
                name: a.name,
                type: a.type
            })),
            children: this.createEntityChildren(entity)
        };
    }

    protected createEntityChildren(entity: Entity): GModelElement[] {
        return [
            // Header label
            this.createLabel(entity.name, 'header'),
            // Attributes compartment
            this.createCompartment(entity.attributes),
            // Ports for connections
            ...this.createPorts(entity)
        ];
    }
}
```

### 5. Implement Operation Handlers

**Create/Modify:** `src/operations/your-operation-handler.ts`

Operations handle user actions from the diagram.

#### Example: Create Entity Operation

```typescript
import { CreateNodeOperation, OperationHandler } from '@eclipse-glsp/server';

@injectable()
export class CreateEntityOperationHandler extends OperationHandler {
    operationType = CreateNodeOperation.KIND;

    @inject(ModelIndex)
    protected modelIndex: ModelIndex;

    @inject(DocumentStore)
    protected documentStore: DocumentStore;

    async execute(operation: CreateNodeOperation): Promise<void> {
        // 1. Extract operation parameters
        const { elementTypeId, location, containerId } = operation;

        if (elementTypeId !== 'node:entity') {
            return; // Not our operation
        }

        // 2. Get semantic model document
        const document = this.modelIndex.getCurrentDocument();
        const rootModel = document.parseResult.value;

        // 3. Create new semantic element
        const newEntity: Entity = {
            $type: 'Entity',
            name: this.generateUniqueName('Entity'),
            attributes: [],
            relationships: []
        };

        // 4. Update document store
        rootModel.entities.push(newEntity);
        await this.documentStore.update([document.uri], []);

        // 5. Notify clients
        await this.notificationService.notifyDocumentChange(document.uri);

        // 6. Update GModel
        await this.actionDispatcher.dispatch(
            UpdateModelAction.create(this.gModelFactory.create(rootModel))
        );
    }
}
```

#### Example: Delete Element Operation

```typescript
@injectable()
export class DeleteElementOperationHandler extends OperationHandler {
    operationType = DeleteElementOperation.KIND;

    async execute(operation: DeleteElementOperation): Promise<void> {
        for (const elementId of operation.elementIds) {
            // 1. Find semantic element from GModel ID
            const semanticElement = this.modelIndex.findSemanticElement(elementId);

            if (!semanticElement) continue;

            // 2. Remove from semantic model
            const container = semanticElement.$container;
            const feature = semanticElement.$containerProperty;
            const array = container[feature] as Array<any>;
            const index = array.indexOf(semanticElement);
            array.splice(index, 1);

            // 3. Update document store
            await this.documentStore.update([document.uri], []);
        }

        // 4. Notify and update
        await this.notificationService.notifyDocumentChange(document.uri);
    }
}
```

#### Example: Validation Operation

```typescript
@injectable()
export class ValidateRelationshipOperationHandler extends OperationHandler {
    operationType = 'validateRelationship';

    async execute(operation: ValidateRelationshipOperation): Promise<void> {
        const { relationshipId } = operation;

        // 1. Get semantic relationship
        const relationship = this.modelIndex.findSemanticElement(relationshipId);

        // 2. Perform validation
        const errors = await this.validator.validate(relationship);

        // 3. Send validation result to client
        if (errors.length > 0) {
            await this.actionDispatcher.dispatch(
                ValidationMarkerAction.create(errors.map(e => ({
                    elementId: relationshipId,
                    message: e.message,
                    severity: 'error'
                })))
            );
        } else {
            // Clear validation markers
            await this.actionDispatcher.dispatch(
                ClearValidationMarkersAction.create([relationshipId])
            );
        }
    }
}
```

### 6. Register Operation Handlers

**Modify:** `src/common/cross-model-diagram-module.ts`

```typescript
export const crossModelDiagramModule = new ContainerModule((bind, unbind, isBound, rebind) => {
    const context = { bind, unbind, isBound, rebind };

    // Existing bindings...

    // Register operation handlers
    configureOperationHandlers(context,
        CreateEntityOperationHandler,
        DeleteElementOperationHandler,
        ValidateRelationshipOperationHandler
    );
});
```

### 7. Update Model Index

**Model Index** maintains mapping between GModel IDs and semantic elements.

**Modify:** `src/common/model-index.ts`

```typescript
@injectable()
export class CrossModelModelIndex extends ModelIndex {
    protected semanticElementMap = new Map<string, AstNode>();

    findSemanticElement(gModelId: string): AstNode | undefined {
        return this.semanticElementMap.get(gModelId);
    }

    indexSemanticModel(rootModel: Model): void {
        this.semanticElementMap.clear();

        // Index all entities
        for (const entity of rootModel.entities) {
            const id = this.idProvider.getNodeId(entity);
            this.semanticElementMap.set(id, entity);
        }

        // Index all relationships
        for (const relationship of rootModel.relationships) {
            const id = this.idProvider.getEdgeId(relationship);
            this.semanticElementMap.set(id, relationship);
        }
    }
}
```

### 8. Integrate with Language Server

**Critical:** GLSP server must stay in sync with language server's document store.

**Listen to Document Changes:**
```typescript
@injectable()
export class DocumentSynchronizer {
    @inject(LanguageServerConnection)
    protected lsConnection: LanguageServerConnection;

    @inject(GModelFactory)
    protected gModelFactory: GModelFactory;

    @inject(ActionDispatcher)
    protected actionDispatcher: ActionDispatcher;

    async initialize(): Promise<void> {
        // Subscribe to document change notifications from language server
        this.lsConnection.onNotification('textDocument/didChange', async (params) => {
            await this.handleDocumentChange(params.uri);
        });
    }

    protected async handleDocumentChange(uri: string): Promise<void> {
        // 1. Reload semantic model from language server
        const semanticModel = await this.lsConnection.getSemanticModel(uri);

        // 2. Regenerate GModel
        const gModel = this.gModelFactory.create(semanticModel);

        // 3. Update clients
        await this.actionDispatcher.dispatch(UpdateModelAction.create(gModel));
    }
}
```

### 9. Add Diagram-Specific Validation

**Optional:** Validation beyond what language server provides.

```typescript
@injectable()
export class DiagramValidator {
    validateLayout(gModel: GModelRoot): ValidationIssue[] {
        const issues: ValidationIssue[] = [];

        // Check for overlapping elements
        const overlaps = this.findOverlappingElements(gModel);
        for (const [elem1, elem2] of overlaps) {
            issues.push({
                elementId: elem1.id,
                message: `Element overlaps with ${elem2.id}`,
                severity: 'warning'
            });
        }

        return issues;
    }

    protected findOverlappingElements(gModel: GModelRoot): Array<[GNode, GNode]> {
        // Spatial index for overlap detection
        // ...
    }
}
```

### 10. Handle Client Notifications

When semantic model changes, notify all diagram clients:

```typescript
@injectable()
export class ClientNotificationService {
    @inject(GLSPServerConnections)
    protected connections: GLSPServerConnections;

    async notifyDocumentChange(uri: string): Promise<void> {
        // Get all clients viewing this document
        const clients = this.connections.getClientsFor(uri);

        for (const client of clients) {
            // Send update action
            await client.send(UpdateModelAction.create(/* updated GModel */));
        }
    }
}
```

### 11. Add Unit Tests

```typescript
// create-entity-operation-handler.spec.ts
import { expect, describe, test } from 'vitest';

describe('CreateEntityOperationHandler', () => {
    let handler: CreateEntityOperationHandler;
    let modelIndex: ModelIndex;

    beforeEach(() => {
        // Setup test environment
        handler = createTestHandler();
        modelIndex = createTestModelIndex();
    });

    test('should create entity in semantic model', async () => {
        const operation: CreateNodeOperation = {
            kind: CreateNodeOperation.KIND,
            elementTypeId: 'node:entity',
            location: { x: 100, y: 100 }
        };

        await handler.execute(operation);

        const document = modelIndex.getCurrentDocument();
        const entities = document.parseResult.value.entities;

        expect(entities).toHaveLength(1);
        expect(entities[0].name).toContain('Entity');
    });

    test('should notify clients after creation', async () => {
        const notifySpy = vi.spyOn(notificationService, 'notifyDocumentChange');

        await handler.execute(createOperation);

        expect(notifySpy).toHaveBeenCalledWith(expect.any(String));
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

- Operation handlers implemented
- GModel generation updated
- Semantic model integration working
- Client notifications functioning
- Unit tests passing
- Build successful

## Handoff

After implementation:
- **To:** `testing-integration` skill (for cross-component tests)
- **To:** `user-story-orchestrator` (for final coordination)

## Context Scope

**Directory:** `extensions/crossmodel-lang/glsp-server/`

**Key Files:**
- `src/common/cross-model-diagram-module.ts` - DI configuration
- `src/common/model-index.ts` - GModel ↔ Semantic mapping
- `src/operations/` - Operation handlers
- `src/diagram/` - GModel factory
- `src/language-server/` - LSP integration

**Do NOT modify:**
- Frontend packages (glsp-client)
- Language server (coordinate via document store)
- Model server (unless coordinated)

## Common Tasks

### Task 1: Add New Diagram Element Type

1. Define GModel type
2. Create GModel factory method
3. Update model index
4. Add create/delete operation handlers
5. Test in diagram client

### Task 2: Add Diagram Operation

1. Define operation interface
2. Implement operation handler
3. Update semantic model
4. Notify clients
5. Register in DI module

### Task 3: Update Element Visual Representation

1. Modify GModel factory
2. Adjust size/layout calculations
3. Update children (labels, compartments)
4. Test rendering in client

### Task 4: Add Validation Markers

1. Implement validation logic
2. Create validation marker actions
3. Send to clients
4. Clear markers when validation passes

## GLSP Best Practices

1. **Semantic Model First:** Always update semantic model, not GModel directly
2. **Document Store Sync:** All changes go through Langium document store
3. **Client Notifications:** Notify all clients of model changes
4. **Operation Handlers:** One handler per operation type
5. **Model Index:** Keep GModel ↔ Semantic mapping up-to-date
6. **Layout:** Provide reasonable default layout; let client adjust
7. **Type Safety:** Use TypeScript interfaces for all GModel elements

## CrossModel Architecture Notes

### Data Flow
```
User Action (Diagram)
  → GLSP Client sends Operation
  → GLSP Server receives Operation
  → Update Semantic Model (document store)
  → Language Server notified
  → Regenerate GModel
  → Send UpdateModelAction to all clients
  → GLSP Client updates diagram
  → Form Client updates form (via language server notification)
```

### Multi-Perspective Sync
GLSP server is NOT the source of truth. Language server's document store is.

```
GLSP Server changes semantic model
  → Must notify Language Server
  → Language Server updates document store
  → Language Server notifies all clients (GLSP, Form, Text)
  → All perspectives stay in sync
```

## Example Implementation

**Scenario:** Add validation for circular relationships in diagram

**Files Modified:**
```
extensions/crossmodel-lang/glsp-server/src/
├── operations/validate-relationship-handler.ts   (new)
├── diagram/validation-marker-factory.ts          (new)
└── common/cross-model-diagram-module.ts          (updated)
```

**Implementation:**
```typescript
// validate-relationship-handler.ts
@injectable()
export class ValidateRelationshipHandler extends OperationHandler {
    operationType = 'validateRelationship';

    async execute(operation: ValidateRelationshipOperation): Promise<void> {
        const relationship = this.modelIndex.findSemanticElement(operation.relationshipId);

        // Check for circular reference
        const hasCircular = this.detectCircular(relationship);

        if (hasCircular) {
            // Add error marker
            await this.actionDispatcher.dispatch(
                SetMarkersAction.create([{
                    elementId: operation.relationshipId,
                    kind: 'validation',
                    label: 'Circular relationship detected',
                    description: 'This relationship creates a circular reference',
                    severity: MarkerKind.ERROR
                }])
            );
        } else {
            // Clear markers
            await this.actionDispatcher.dispatch(
                DeleteMarkersAction.create([{
                    elementId: operation.relationshipId,
                    kind: 'validation'
                }])
            );
        }
    }

    protected detectCircular(relationship: Relationship): boolean {
        // Circular detection logic (similar to language server)
        // ...
    }
}
```

## Troubleshooting

**Issue:** GModel not updating
- Check UpdateModelAction is dispatched
- Verify GModel factory generates correct structure
- Check client connection is active

**Issue:** Semantic model changes not persisting
- Ensure document store is updated
- Check document URI is correct
- Verify language server is notified

**Issue:** Multi-client sync broken
- Check notification broadcasting
- Verify all clients subscribed
- Test with multiple diagram tabs

**Issue:** Operation not executing
- Verify operation handler is registered
- Check operation type string matches
- Ensure handler is bound in DI module

---

**Remember:** GLSP server is the bridge between diagram visuals and semantic model. Always keep them in sync through the document store.
