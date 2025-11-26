# CrossModel Core - Claude Project Guide

## Project Overview

CrossModel is an open-source platform for data modeling and model-driven data engineering. It provides intuitive, collaborative tools for defining, structuring, and managing data models with Git-backed versioning and integrated AI assistance.

**Core Capabilities:**
- Visual and textual data modeling (entities, relationships, attributes)
- Multi-perspective editing (diagram, form, code)
- Mapping definitions for data flows
- Package-based workspace system with npm dependency management
- Real-time multi-client synchronization

## Architecture Principles

### 1. Document Store as Source of Truth
The **Langium document store** is the single source of truth for all model data. All perspectives (textual, graphical, form-based) synchronize through this central store.

**Critical Rule:** Never modify models directly. Always go through the document store to ensure consistency across all clients.

### 2. Frontend/Backend Separation
- **Frontend (Theia-based):** UI components, widgets, editors
  - `packages/glsp-client` - Graphical diagram editor
  - `packages/form-client` - Form-based editor
  - `packages/composite-editor` - Combined editor views
  - `packages/property-view` - Property panel

- **Backend Services:**
  - `extensions/crossmodel-lang/language-server` - LSP server (textual modeling, grammar, semantic model)
  - `extensions/crossmodel-lang/glsp-server` - GLSP server (graphical modeling)
  - `extensions/crossmodel-lang/model-server` - Model server (form-based access, RPC)

### 3. Multi-Client Awareness
Changes in one perspective must propagate to all others. The system supports multiple concurrent editors viewing/editing the same model.

**Notification Flow:**
```
Document Store Change
  → Language Server broadcasts
    → GLSP Server updates GModel
    → Model Server updates form state
    → Form Client refreshes UI
    → GLSP Client refreshes diagram
```

## Repository Structure

```
crossmodel-core/
├── .claude/                          # Claude AI configuration (THIS DIRECTORY)
│   ├── CLAUDE.md                     # This file
│   ├── skills/                       # Modular skills for different tasks
│   ├── specs/                        # User story specifications
│   └── docs/interfaces/              # Interface contracts
├── applications/
│   ├── browser-app/                  # Web application
│   └── electron-app/                 # Desktop application
├── packages/                         # Theia extensions (FRONTEND)
│   ├── glsp-client/                  # Diagram editor client
│   ├── form-client/                  # Form editor client
│   ├── composite-editor/             # Combined editor views
│   ├── property-view/                # Property panel
│   ├── model-service/                # Frontend model service layer
│   ├── protocol/                     # RPC protocol definitions
│   ├── react-model-ui/               # React UI components
│   ├── core/                         # Core customizations
│   └── product/                      # Application-level modifications
├── extensions/crossmodel-lang/       # VS Code/Theia extension (BACKEND)
│   ├── language-server/              # LSP server (textual modeling)
│   ├── glsp-server/                  # GLSP server (graphical modeling)
│   ├── model-server/                 # Model server (form-based access)
│   ├── extension.ts                  # Extension entry point
│   └── main.ts                       # Server process startup
├── examples/                         # Example workspaces
├── e2e-tests/                        # End-to-end tests
└── docs/                             # Documentation

```

## Development Workflow

### Phase-Based User Story Implementation

When implementing user stories, follow this strict workflow:

**Phase 1: Requirements Clarification (ALWAYS FIRST)**
- Use `requirements-clarification` skill
- Interactive Q&A to eliminate ambiguities
- Identify affected components
- Define acceptance criteria
- Output: `specs/TICKET-ID-specification.md`

**Phase 2: Interface Contract (when frontend + backend affected)**
- Use `interface-contract` skill
- Define TypeScript interfaces
- Document RPC protocols
- Create sequence diagrams
- Output: `docs/interfaces/TICKET-ID-interface.md`

**Phase 3: Focused Implementation**
- Use appropriate skill(s):
  - `frontend-implementation` - For UI/client changes
  - `backend-language-server` - For LSP/grammar/document store
  - `backend-glsp-server` - For diagram operations
  - `backend-model-server` - For form-based operations
- Parallel execution when independent

**Phase 3.5: Build Verification (AUTOMATIC)**
- Use `build-verification` skill
- Monitor CI/CD build status
- Auto-fix compilation errors
- Ensure TypeScript compilation passes
- Output: Green CI/CD build

**Phase 4: Testing & Integration**
- Use `testing-integration` skill
- Verify cross-component communication
- Test multi-client scenarios
- Validate document store sync

**Orchestration:**
- `user-story-orchestrator` coordinates the entire workflow
- Only invoked after requirements are approved

### Build Commands

```bash
# Install dependencies
yarn install

# Build all packages
yarn build

# Build browser app
yarn build:browser

# Build electron app
yarn build:electron

# Development mode
yarn watch:browser
yarn watch:electron

# Testing
yarn test              # Unit tests
yarn ui-test           # E2E tests
yarn lint              # Linting
```

### Running the Application

**Browser mode:**
```bash
yarn build:browser && yarn start:browser
# Open http://localhost:3000
```

**Electron mode:**
```bash
yarn build:electron && yarn start:electron
```

## Code Review Checklist

Before committing changes:

- [ ] Frontend/backend separation respected
- [ ] Changes propagate through document store (not direct model modification)
- [ ] Multi-client notifications implemented
- [ ] Interface contracts followed (if applicable)
- [ ] Tests added for new functionality
- [ ] All affected perspectives updated (diagram, form, code)
- [ ] Error handling for cross-component communication
- [ ] TypeScript compilation successful
- [ ] Linting passes
- [ ] No console errors in running application

## Safety Rules

### Git Workflow
- **NEVER push to main/master branch**
- Always work on feature branches: `feature/description` or `fix/description`
- Follow [Conventional Commits](https://www.conventionalcommits.org/) standard
- Branch naming: [Conventional Branch](https://conventional-branch.github.io/)
- Create PRs for all changes

### Development Safety
- **NEVER modify document store directly from frontend**
- **NEVER skip interface contract phase for cross-component features**
- **ALWAYS test multi-client scenarios** when modifying shared state
- **NEVER hard-code file paths** - use URI utilities
- **ALWAYS handle cyclic references** in model serialization

## Key File Locations

### Configuration Files
- `lerna.json` - Monorepo configuration
- `tsconfig.json` - Root TypeScript config
- `package.json` - Root package definition
- `.eslintrc.js` - ESLint configuration

### Language Definition
- `extensions/crossmodel-lang/language-server/src/language/crossmodel.langium` - Grammar
- `extensions/crossmodel-lang/language-server/src/language/cross-model-scope.ts` - Scoping
- `extensions/crossmodel-lang/language-server/src/language/cross-model-validator.ts` - Validation

### GLSP Server
- `extensions/crossmodel-lang/glsp-server/src/common/cross-model-diagram-module.ts` - Dependency injection
- `extensions/crossmodel-lang/glsp-server/src/common/model-index.ts` - Model indexing
- `extensions/crossmodel-lang/glsp-server/src/language-server/` - LSP integration

### Model Server
- `extensions/crossmodel-lang/model-server/src/model-server-module.ts` - DI configuration
- `extensions/crossmodel-lang/model-server/src/model-service.ts` - Core service
- `extensions/crossmodel-lang/model-server/src/serialization/` - Serialization handling

### Frontend Clients
- `packages/glsp-client/src/browser/diagram/` - Diagram editor components
- `packages/form-client/src/browser/` - Form editor components
- `packages/protocol/src/jsonrpc.ts` - RPC protocol client
- `packages/react-model-ui/src/` - React form components

## Common Patterns

### Accessing Langium Services
```typescript
// In extensions, access services correctly:
const astReflection = services.shared.AstReflection;  // ✓ Correct
const serializer = services.CrossModel.serializer.Serializer;  // ✓ Correct

// Use type-only imports to avoid runtime issues:
import type { AstNode, AstReflection } from 'langium';  // ✓ Correct
import { AstNode, isAstNode } from 'langium';  // ✗ Avoid in extensions
```

### Document Store Updates
```typescript
// Always update through document builder
await documentBuilder.update([uri], []);
// Notify other clients
await notificationService.notifyDocumentChange(uri);
```

### RPC Communication
```typescript
// Frontend calls backend via protocol
const result = await modelClient.request('operation', params);
```

## Module System Notes

- **Important:** Extensions should use type-only imports from `langium` to avoid runtime dependency issues
- Langium functionality is provided by `@crossmodel/server` at runtime
- Use `import type` to prevent CommonJS require() calls in extension bundles

## Testing Strategy

- **Unit tests:** Jest-based, co-located with source (`.spec.ts`)
- **Integration tests:** Cross-component RPC communication
- **E2E tests:** Playwright tests in `e2e-tests/`
- **Multi-client tests:** Verify sync across perspectives

## Resources

- **Contributing Guide:** `CONTRIBUTING.md`
- **Architecture Overview:** `docs/Architecture.md`
- **Example Workspaces:** `examples/mapping-example`, `examples/verdaccio-example`
- **Official Website:** https://crossmodel.io
- **GitHub Repository:** https://github.com/crossmodel/crossmodel-core

---

**Last Updated:** 2025-11-26
**Claude Skills Version:** 1.0
