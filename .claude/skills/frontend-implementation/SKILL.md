---
name: frontend-implementation
description: "Implement frontend changes in glsp-client or form-client packages following Theia/GLSP patterns. Use for UI components, widgets, and client-side logic based on approved specifications."
---

# Frontend Implementation Skill

## When to Use

Use this skill when:
- Implementing UI components or widgets
- Adding diagram-based interactions (glsp-client)
- Adding form-based editing features (form-client)
- Updating visual representations
- Implementing client-side validation or logic
- Following an approved specification

## Prerequisites

- Specification document (`.claude/specs/TICKET-ID-specification.md`)
- Interface contract (`.claude/docs/interfaces/TICKET-ID-interface.md`) if backend integration required
- Understanding of Theia and GLSP architecture

## Input Requirements

- Specification document path
- Interface contract path (if cross-component feature)
- Ticket ID

## Process

### 1. Analyze Requirements

From specification, identify:
- Which package(s) to modify:
  - `packages/glsp-client` - Diagram editor
  - `packages/form-client` - Form editor
  - `packages/composite-editor` - Combined views
  - `packages/property-view` - Property panel
  - `packages/react-model-ui` - React form components
- UI elements to add/modify
- User interactions to implement
- Data flows from/to backend
- Multi-client update handling

### 2. Review Existing Patterns

Before implementing, examine similar features:

**GLSP Client Examples:**
- Diagram elements: `packages/glsp-client/src/browser/diagram/`
- Actions/operations: `packages/glsp-client/src/browser/actions/`
- Tools: `packages/glsp-client/src/browser/tools/`

**Form Client Examples:**
- Form components: `packages/form-client/src/browser/`
- Model interaction: How form client calls model server

**Common Patterns:**
- Dependency injection: Use Inversify `@inject` decorators
- Theia widgets: Extend `BaseWidget` or `ReactWidget`
- RPC communication: Use protocol from `packages/protocol/`

### 3. Implement Following Architecture

#### For GLSP Client Changes

**A. Diagram Elements (if adding visual elements):**
```typescript
// packages/glsp-client/src/browser/diagram/...

// 1. Define GModel representation
// 2. Create view component (SGraph elements)
// 3. Register in module
```

**B. Operations (if adding user actions):**
```typescript
// Follow GLSP operation pattern

import { Operation } from '@eclipse-glsp/client';

export interface YourOperation extends Operation {
    kind: 'yourOperation';
    // ... operation-specific fields
}

// Send to GLSP server
await glspClient.sendActionMessage(operation);
```

**C. Tools (if adding interaction tools):**
```typescript
// Register tool in diagram module
// Handle mouse/keyboard events
// Trigger appropriate operations
```

#### For Form Client Changes

**A. React Components:**
```typescript
// packages/react-model-ui/src/...

// Follow existing form component patterns
// Use MUI components for consistency
// Handle validation state
```

**B. Model Server Communication:**
```typescript
// Use protocol from packages/protocol/
import { ModelClient } from '@crossmodel/protocol';

// Make RPC call
const response = await modelClient.request('model/operation', params);
```

**C. State Management:**
```typescript
// React state for form state
// Sync with model server
// Handle multi-client updates via notifications
```

### 4. Follow CrossModel Patterns

#### Dependency Injection
```typescript
import { inject, injectable } from 'inversify';

@injectable()
export class YourService {
    @inject(SomeService)
    protected someService: SomeService;
}
```

#### Theia Widgets
```typescript
import { BaseWidget } from '@theia/core/lib/browser';

export class YourWidget extends BaseWidget {
    constructor() {
        super();
        this.id = 'your-widget-id';
        this.title.label = 'Your Widget';
    }
}
```

#### Theming
```typescript
// Use Theia theme variables
const style = {
    color: 'var(--theia-foreground)',
    backgroundColor: 'var(--theia-editor-background)'
};
```

### 5. Handle Multi-Client Synchronization

**Critical:** Frontend must handle updates from other clients.

```typescript
// Subscribe to model change notifications
modelClient.onNotification('model/changed', (notification) => {
    // Update UI state
    this.updateFromServer(notification.uri);
});
```

**Ensure:**
- UI updates when document store changes
- No race conditions between local and remote changes
- Optimistic updates roll back on conflict

### 6. Respect Interface Contracts

If interface contract exists:
- Import types from `packages/protocol/`
- Use exact request/response interfaces
- Handle all defined error codes
- Follow sequence diagrams

```typescript
import { YourRequest, YourResponse } from '@crossmodel/protocol';

const request: YourRequest = {
    // Matches interface exactly
};

const response: YourResponse = await client.request('method', request);
```

### 7. Add Component Tests

```typescript
// Co-locate tests with components
// YourComponent.spec.tsx

import { render, screen } from '@testing-library/react';
import YourComponent from './YourComponent';

describe('YourComponent', () => {
    it('should render correctly', () => {
        render(<YourComponent />);
        expect(screen.getByText('Expected Text')).toBeDefined();
    });

    it('should handle user interaction', async () => {
        // Test user interactions
    });
});
```

### 8. Verify Build and Lint

```bash
# From repository root
yarn build:packages

# Or specific package
cd packages/glsp-client
yarn build
yarn lint
```

### 9. Test Locally

```bash
# Build and run browser app
yarn build:browser
yarn start:browser

# Open http://localhost:3000
# Test feature in running application
# Verify multi-client sync (open multiple browser tabs)
```

## Output

- Working frontend implementation
- Component tests added
- Build successful
- Linting passes
- Feature tested in running application

## Handoff

After implementation:
- **To:** `testing-integration` skill (if integration tests needed)
- **To:** `user-story-orchestrator` (for final coordination)

## Context Scope

**Packages:**
- `packages/glsp-client/` - Diagram editor
- `packages/form-client/` - Form editor
- `packages/composite-editor/` - Combined views
- `packages/property-view/` - Property panel
- `packages/react-model-ui/` - React components
- `packages/protocol/` - RPC protocol types

**Key Files:**
- GLSP client DI: `packages/glsp-client/src/browser/crossmodel-diagram-module.ts`
- Form client DI: `packages/form-client/src/browser/crossmodel-form-module.ts`
- Protocol definitions: `packages/protocol/src/jsonrpc.ts`

**Do NOT modify:**
- Backend packages (`extensions/crossmodel-lang/`)
- Language server code
- GLSP server code
- Model server code

## Common Tasks

### Task 1: Add Diagram Validation Display

**Files to modify:**
- `packages/glsp-client/src/browser/diagram/...`

**Steps:**
1. Listen for validation notifications from GLSP server
2. Add visual error markers to diagram
3. Show tooltip with error message on hover
4. Clear markers when validation passes

### Task 2: Add Form Field

**Files to modify:**
- `packages/react-model-ui/src/components/...`
- `packages/form-client/src/browser/...`

**Steps:**
1. Create React component for new field
2. Integrate with form state management
3. Add validation logic
4. Connect to model server for persistence

### Task 3: Add Custom Tool

**Files to modify:**
- `packages/glsp-client/src/browser/tools/...`

**Steps:**
1. Create tool class extending GLSP tool
2. Handle mouse events
3. Trigger appropriate operations
4. Register tool in DI module

### Task 4: Update Property Panel

**Files to modify:**
- `packages/property-view/src/browser/...`

**Steps:**
1. Add new property fields
2. Connect to model server for data
3. Handle property updates
4. Sync with other perspectives

## Theia/GLSP Best Practices

1. **Use Inversify DI:** All services injected via `@inject`
2. **Follow GLSP Patterns:** Use actions, operations, and commands correctly
3. **Respect Theia Lifecycle:** Initialize in `onStart`, cleanup in `onStop`
4. **Use Theia Services:** CommandRegistry, MenuRegistry, KeybindingRegistry
5. **Theme Variables:** Always use CSS variables for colors/fonts
6. **Accessibility:** Add ARIA labels and keyboard navigation
7. **Error Handling:** User-friendly error messages via notification service

## Example Implementation

**Scenario:** Add validation error display to diagram

**Files Modified:**
```
packages/glsp-client/src/browser/diagram/validation/
├── validation-marker-manager.ts    (new)
├── validation-decorator.ts         (new)
└── validation.module.ts            (new)

packages/glsp-client/src/browser/crossmodel-diagram-module.ts (updated)
```

**Implementation:**
```typescript
// validation-marker-manager.ts
@injectable()
export class ValidationMarkerManager {
    @inject(GLSPActionDispatcher)
    protected actionDispatcher: GLSPActionDispatcher;

    protected markers = new Map<string, ValidationMarker[]>();

    async updateMarkers(uri: string, errors: ValidationError[]): Promise<void> {
        // Clear old markers
        this.markers.delete(uri);

        // Add new markers
        const markers = errors.map(error => ({
            elementId: error.elementId,
            message: error.message,
            severity: error.severity
        }));

        this.markers.set(uri, markers);

        // Trigger diagram update
        await this.actionDispatcher.dispatch(
            UpdateModelAction.create(/* updated model with markers */)
        );
    }
}

// Register in module
bind(ValidationMarkerManager).toSelf().inSingletonScope();
```

**Tests:**
```typescript
// validation-marker-manager.spec.ts
describe('ValidationMarkerManager', () => {
    it('should update markers on validation', async () => {
        const manager = new ValidationMarkerManager();
        await manager.updateMarkers('test-uri', [
            { elementId: 'e1', message: 'Error', severity: 'error' }
        ]);
        expect(manager.getMarkers('test-uri')).toHaveLength(1);
    });
});
```

## Troubleshooting

**Issue:** TypeScript compilation errors
- Check interface contract compliance
- Verify import paths
- Ensure all types are defined

**Issue:** RPC calls fail
- Verify backend is running
- Check protocol method names match
- Inspect browser console for errors

**Issue:** Multi-client sync not working
- Check notification subscriptions
- Verify document URIs match
- Test with multiple browser tabs

**Issue:** UI not updating
- Check React state management
- Verify Theia widget refresh called
- Check for console errors

---

**Remember:** Frontend changes must work across all perspectives (diagram, form, code). Test thoroughly with multi-client scenarios.
