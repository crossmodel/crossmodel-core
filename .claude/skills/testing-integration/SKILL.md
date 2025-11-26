---
name: testing-integration
description: "Create integration and E2E tests verifying cross-component functionality, document store sync, and multi-client scenarios based on approved specifications."
---

# Testing & Integration Skill

## When to Use

Use this skill when:
- Verifying cross-component communication (frontend ↔ backend)
- Testing multi-client synchronization scenarios
- Validating document store consistency
- Creating integration tests for RPC endpoints
- Implementing E2E user flow tests
- Validating interface contracts are fulfilled

**Scope:** Integration and E2E testing across the entire system

## Prerequisites

- Implementation complete (frontend and/or backend)
- Interface contract defined (if cross-component)
- Specification document with test scenarios
- Understanding of test infrastructure

## Input Requirements

- Specification document (`.claude/specs/TICKET-ID-specification.md`)
- Interface contract (`.claude/docs/interfaces/TICKET-ID-interface.md`) if applicable
- List of components changed

## Process

### 1. Review Test Requirements

From specification, identify:
- **Integration test needs:** Cross-component communication
- **Multi-client scenarios:** Concurrent editors
- **Document store sync:** Perspective synchronization
- **E2E user flows:** Complete user journeys
- **Contract verification:** Interface compliance

### 2. Understand Test Infrastructure

**Test Types in CrossModel:**

**Unit Tests:**
- Location: Co-located with source files (`.spec.ts`)
- Framework: Jest
- Run: `yarn test`
- Purpose: Test individual functions/classes

**Integration Tests:**
- Location: Package-specific test directories
- Framework: Jest
- Purpose: Test cross-component communication

**E2E Tests:**
- Location: `e2e-tests/`
- Framework: Playwright
- Run: `yarn ui-test`
- Purpose: Test complete user workflows

### 3. Create Integration Tests

#### A. RPC Communication Tests

**Test frontend-backend RPC calls:**

```typescript
// packages/form-client/src/integration/model-server.spec.ts
import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import { startModelServer, ModelClient } from '@crossmodel/protocol';

describe('Model Server Integration', () => {
    let modelServer: ModelServer;
    let client: ModelClient;

    beforeAll(async () => {
        // Start model server
        modelServer = await startModelServer();
        client = createModelClient(modelServer.port);
    });

    afterAll(async () => {
        await modelServer.stop();
    });

    test('should get entity via RPC', async () => {
        // Prepare test data
        await prepareTestDocument('file:///test.entity', `
            entity Customer {
                attribute name: string
            }
        `);

        // Make RPC call
        const response = await client.request('model/getEntity', {
            uri: 'file:///test.entity',
            entityId: 'Customer'
        });

        // Verify response
        expect(response.entity).toBeDefined();
        expect(response.entity.name).toBe('Customer');
        expect(response.entity.attributes).toHaveLength(1);
    });

    test('should update entity and notify clients', async () => {
        // Setup notification listener
        const notifications: any[] = [];
        client.onNotification('model/changed', (notif) => {
            notifications.push(notif);
        });

        // Update entity
        const response = await client.request('model/updateEntity', {
            uri: 'file:///test.entity',
            entityId: 'Customer',
            updates: { name: 'UpdatedCustomer' },
            clientId: 'test-client'
        });

        expect(response.success).toBe(true);

        // Wait for notification
        await waitFor(() => notifications.length > 0);

        expect(notifications[0]).toMatchObject({
            uri: 'file:///test.entity',
            changeType: 'modified'
        });
    });

    test('should handle RPC errors gracefully', async () => {
        await expect(
            client.request('model/getEntity', {
                uri: 'file:///nonexistent.entity',
                entityId: 'NotFound'
            })
        ).rejects.toMatchObject({
            code: expect.any(String),
            message: expect.stringContaining('not found')
        });
    });
});
```

#### B. Document Store Synchronization Tests

**Test that changes propagate correctly:**

```typescript
// Integration test for document store sync
describe('Document Store Synchronization', () => {
    test('should sync changes across all perspectives', async () => {
        // 1. Create entity via language server
        await languageServer.createDocument('file:///test.entity', `
            entity Customer {
                attribute name: string
            }
        `);

        // 2. Wait for GLSP server to receive update
        await waitFor(() => glspServer.hasDocument('file:///test.entity'));

        // 3. Get GModel from GLSP server
        const gModel = await glspServer.getGModel('file:///test.entity');
        expect(gModel.children).toContainEqual(
            expect.objectContaining({
                type: 'node:entity',
                name: 'Customer'
            })
        );

        // 4. Wait for model server to receive update
        await waitFor(() => modelServer.hasDocument('file:///test.entity'));

        // 5. Get entity from model server
        const entity = await modelClient.request('model/getEntity', {
            uri: 'file:///test.entity',
            entityId: 'Customer'
        });
        expect(entity.entity.name).toBe('Customer');

        // All perspectives are now in sync!
    });

    test('should propagate updates from GLSP to form and text', async () => {
        // Create entity in diagram (GLSP)
        await glspClient.dispatch(CreateNodeOperation.create({
            elementTypeId: 'node:entity',
            location: { x: 100, y: 100 }
        }));

        // Verify language server received update
        await waitFor(async () => {
            const doc = await languageServer.getDocument('file:///test.entity');
            return doc.parseResult.value.entities.length > 0;
        });

        // Verify model server received update
        const entities = await modelClient.request('model/listEntities', {
            uri: 'file:///test.entity'
        });
        expect(entities.entities).toHaveLength(1);
    });
});
```

#### C. Multi-Client Scenario Tests

**Test concurrent editing:**

```typescript
describe('Multi-Client Scenarios', () => {
    let client1: ModelClient;
    let client2: ModelClient;

    beforeEach(async () => {
        client1 = createModelClient(modelServer.port, 'client-1');
        client2 = createModelClient(modelServer.port, 'client-2');
    });

    test('should notify all clients of changes', async () => {
        // Client 2 listens for changes
        const client2Notifications: any[] = [];
        client2.onNotification('model/changed', (notif) => {
            client2Notifications.push(notif);
        });

        // Client 1 updates entity
        await client1.request('model/updateEntity', {
            uri: 'file:///test.entity',
            entityId: 'Customer',
            updates: { name: 'UpdatedByClient1' },
            clientId: 'client-1'
        });

        // Client 2 should receive notification
        await waitFor(() => client2Notifications.length > 0);

        expect(client2Notifications[0]).toMatchObject({
            uri: 'file:///test.entity',
            changeType: 'modified'
        });

        // Client 2 fetches updated entity
        const response = await client2.request('model/getEntity', {
            uri: 'file:///test.entity',
            entityId: 'Customer'
        });
        expect(response.entity.name).toBe('UpdatedByClient1');
    });

    test('should handle concurrent edits correctly', async () => {
        // Both clients attempt to update simultaneously
        const [result1, result2] = await Promise.all([
            client1.request('model/updateEntity', {
                uri: 'file:///test.entity',
                entityId: 'Customer',
                updates: { name: 'UpdatedByClient1' },
                clientId: 'client-1'
            }),
            client2.request('model/updateEntity', {
                uri: 'file:///test.entity',
                entityId: 'Customer',
                updates: { name: 'UpdatedByClient2' },
                clientId: 'client-2'
            })
        ]);

        // Both should succeed (last write wins)
        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);

        // Verify final state
        const finalEntity = await client1.request('model/getEntity', {
            uri: 'file:///test.entity',
            entityId: 'Customer'
        });

        // One of the updates should be the final state
        expect(['UpdatedByClient1', 'UpdatedByClient2']).toContain(finalEntity.entity.name);
    });
});
```

#### D. Interface Contract Verification Tests

**Verify implementations follow the contract:**

```typescript
describe('Interface Contract Compliance', () => {
    test('should match request/response types from contract', async () => {
        // Import types from contract
        import type { ValidateEntityNameRequest, ValidateEntityNameResponse } from '@crossmodel/protocol';

        const request: ValidateEntityNameRequest = {
            uri: 'file:///test.entity',
            name: 'Customer'
        };

        const response = await client.request('model/validateEntityName', request);

        // TypeScript compilation ensures type match
        // Runtime verification of structure
        expect(response).toHaveProperty('valid');
        expect(response).toHaveProperty('errors');
        expect(typeof response.valid).toBe('boolean');
        expect(Array.isArray(response.errors)).toBe(true);
    });

    test('should handle all defined error codes', async () => {
        // Test each error code from contract
        const errorCodes = ['REQUIRED_FIELD', 'DUPLICATE_NAME', 'INVALID_FORMAT'];

        for (const expectedCode of errorCodes) {
            // Trigger specific error scenario
            const response = await client.request('model/validateEntityName', {
                uri: 'file:///test.entity',
                name: getInvalidNameFor(expectedCode)
            });

            expect(response.valid).toBe(false);
            expect(response.errors).toContainEqual(
                expect.objectContaining({ code: expectedCode })
            );
        }
    });
});
```

### 4. Create E2E Tests

**Test complete user workflows:**

```typescript
// e2e-tests/tests/entity-validation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Entity Validation E2E', () => {
    test('should validate entity name in form editor', async ({ page }) => {
        // 1. Open CrossModel application
        await page.goto('http://localhost:3000');

        // 2. Create new workspace
        await page.click('text=New Workspace');

        // 3. Open entity in form editor
        await page.click('text=New Entity');

        // 4. Enter invalid name (empty)
        await page.fill('input[name="entityName"]', '');
        await page.blur('input[name="entityName"]');

        // 5. Verify error message appears
        await expect(page.locator('.error-message')).toContainText('Entity name cannot be empty');

        // 6. Enter valid name
        await page.fill('input[name="entityName"]', 'Customer');

        // 7. Verify error disappears
        await expect(page.locator('.error-message')).not.toBeVisible();

        // 8. Save entity
        await page.click('button:has-text("Save")');

        // 9. Verify entity appears in diagram view
        await page.click('text=Diagram View');
        await expect(page.locator('.diagram-node:has-text("Customer")')).toBeVisible();
    });

    test('should sync changes between diagram and form', async ({ page }) => {
        // Open two views side by side
        await page.goto('http://localhost:3000');

        // Create entity in diagram
        await page.click('text=Diagram View');
        await page.click('button[title="Create Entity"]');
        await page.click('.diagram-canvas', { position: { x: 200, y: 200 } });

        // Switch to form view
        await page.click('text=Form View');

        // Verify entity appears in form
        await expect(page.locator('input[name="entityName"]')).toHaveValue(/Entity\d+/);

        // Edit in form
        await page.fill('input[name="entityName"]', 'Customer');
        await page.click('button:has-text("Save")');

        // Switch back to diagram
        await page.click('text=Diagram View');

        // Verify change reflected in diagram
        await expect(page.locator('.diagram-node:has-text("Customer")')).toBeVisible();
    });

    test('should handle multi-client sync', async ({ browser }) => {
        // Open two browser contexts (simulating two users)
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        // Both open same workspace
        await page1.goto('http://localhost:3000?workspace=test');
        await page2.goto('http://localhost:3000?workspace=test');

        // User 1 creates entity
        await page1.click('text=New Entity');
        await page1.fill('input[name="entityName"]', 'Customer');
        await page1.click('button:has-text("Save")');

        // User 2 should see the entity appear
        await page2.waitForSelector('.entity-list:has-text("Customer")');
        await expect(page2.locator('.entity-list:has-text("Customer")')).toBeVisible();

        // Clean up
        await context1.close();
        await context2.close();
    });
});
```

### 5. Add Test Utilities

**Create helper functions for common test scenarios:**

```typescript
// test-utils/model-server-utils.ts
export async function prepareTestDocument(uri: string, content: string): Promise<void> {
    await languageServer.createDocument(uri, content);
    await waitForDocumentStoreSync();
}

export async function waitForDocumentStoreSync(): Promise<void> {
    // Wait for all servers to sync
    await Promise.all([
        languageServer.waitForSync(),
        glspServer.waitForSync(),
        modelServer.waitForSync()
    ]);
}

export function createModelClient(port: number, clientId: string = 'test-client'): ModelClient {
    // Create RPC client with proper configuration
    // ...
}

export async function waitFor(condition: () => boolean | Promise<boolean>, timeout = 5000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (await condition()) return;
        await sleep(100);
    }
    throw new Error('Timeout waiting for condition');
}
```

### 6. Run Tests and Verify

```bash
# Run unit tests
yarn test

# Run integration tests
yarn test:integration

# Run E2E tests
yarn ui-test

# Run all tests
yarn test && yarn ui-test
```

### 7. Document Test Coverage

Create test coverage report in specification:

```markdown
## Test Coverage for TICKET-ID

### Unit Tests
- ✓ ValidationRule.detectCircular
- ✓ EntitySerializer.handleCyclicReferences
- ✓ FormValidator.validateEntityName

### Integration Tests
- ✓ RPC: model/getEntity
- ✓ RPC: model/updateEntity
- ✓ Document store sync: Language Server → GLSP Server
- ✓ Document store sync: Language Server → Model Server
- ✓ Multi-client notifications

### E2E Tests
- ✓ User Flow: Create entity in form, view in diagram
- ✓ User Flow: Edit entity in diagram, view in form
- ✓ Multi-client: Changes sync between two users

### Interface Contract Verification
- ✓ Request/response types match contract
- ✓ All error codes handled
- ✓ Sequence diagrams validated
```

## Output

- Integration tests created and passing
- E2E tests created and passing
- Multi-client scenarios verified
- Document store sync confirmed
- Interface contracts validated
- Test coverage documented

## Handoff

After testing:
- **To:** `user-story-orchestrator` (for final commit and PR)
- **Report:** Test results summary

## Context Scope

**Testing Locations:**
- Unit tests: Co-located with source (`.spec.ts`)
- Integration tests: Package-level or shared test directories
- E2E tests: `e2e-tests/tests/`

**Test Infrastructure:**
- Jest: Unit and integration tests
- Playwright: E2E tests
- Test utilities: Shared helpers

**Do NOT:**
- Skip integration tests for cross-component features
- Skip multi-client tests for shared state
- Assume tests will pass without running them

## Common Test Patterns

### Pattern 1: Test RPC Endpoint
```typescript
test('should [action] via RPC', async () => {
    const response = await client.request('method', params);
    expect(response).toMatchObject(expectedShape);
});
```

### Pattern 2: Test Document Store Sync
```typescript
test('should sync [component A] to [component B]', async () => {
    await componentA.update(data);
    await waitFor(() => componentB.hasSyncedData());
    expect(componentB.getData()).toEqual(expectedData);
});
```

### Pattern 3: Test Multi-Client
```typescript
test('should notify client B when client A changes', async () => {
    const notifications: any[] = [];
    clientB.onNotification('event', (n) => notifications.push(n));

    await clientA.performAction();

    await waitFor(() => notifications.length > 0);
    expect(notifications[0]).toMatchObject(expectedNotification);
});
```

### Pattern 4: Test E2E User Flow
```typescript
test('should [complete user workflow]', async ({ page }) => {
    await page.goto(url);
    await page.click(selector1);
    await page.fill(selector2, value);
    await expect(page.locator(selector3)).toContainText(expected);
});
```

## Best Practices

1. **Test Isolation:** Each test should be independent
2. **Clean State:** Reset state between tests
3. **Wait Properly:** Use `waitFor` instead of fixed delays
4. **Error Messages:** Use descriptive expect messages
5. **Test Data:** Use realistic test data
6. **Mock Sparingly:** Prefer real integration over mocks
7. **Coverage:** Test both success and failure paths
8. **Performance:** Keep tests fast (parallelize when possible)

## Troubleshooting

**Issue:** Tests timing out
- Increase timeout for async operations
- Check servers are actually starting
- Verify notification subscriptions

**Issue:** Flaky tests
- Add proper wait conditions
- Don't use fixed sleep() delays
- Check for race conditions

**Issue:** E2E tests failing locally
- Ensure application is built
- Check port availability
- Verify test data exists

**Issue:** Integration tests can't find servers
- Check server startup sequence
- Verify port configuration
- Ensure proper cleanup between tests

---

**Remember:** Testing validates the entire system works as specified. Don't skip it—regressions are costly!
