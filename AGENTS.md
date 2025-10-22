# Agent Guidelines for CrossModel Core

This document provides guidelines for AI agents working on the CrossModel Core repository.

## Repository Structure

### Core Packages
- **packages/core** - Core functionality and model definitions
- **packages/server** - Langium language server implementation
- **packages/glsp-server** - GLSP (Graphical Language Server Platform) server
- **packages/react-model-ui** - React-based UI components
- **packages/model-service** - Model service layer

### Extensions
- **extensions/crossmodel-lang** - CrossModel language extension for VS Code/Theia
- **extensions/crossmodel-merge** - 3-way AST-aware merge extension for CrossModel files

### Applications
- **applications/browser-app** - Theia browser-based application
- **applications/electron-app** - Theia electron-based application

### Testing
- **e2e-tests** - Playwright end-to-end tests

## Build System

The project uses:
- **Lerna** for monorepo management
- **Yarn** as package manager
- **TypeScript** for type safety
- **esbuild** for bundling extensions

### Common Commands
```bash
# Install dependencies
yarn install

# Build all packages
yarn build

# Build browser application
yarn build:browser

# Run linting
yarn lint

# Run tests
yarn test

# Run e2e tests
yarn ui-test
```

## Development Guidelines

### TypeScript Configuration
- The project uses strict TypeScript mode
- Root `tsconfig.json` references all packages and extensions
- Each package/extension has its own `tsconfig.json` that extends the root config

### Module Resolution
- **Important**: Extensions should use type-only imports from `langium` to avoid runtime dependency issues
- Langium functionality is provided by the `@crossmodel/server` at runtime in Theia/VS Code environments
- Use `import type` for Langium types to prevent CommonJS require() calls in the bundle

Example:
```typescript
// ✅ Correct - type-only import
import type { AstNode, AstReflection } from 'langium';

// ❌ Incorrect - runtime import
import { AstNode, isAstNode } from 'langium';
```

### Langium Services Access
- `AstReflection` is accessed via `services.shared.AstReflection` (not `services.CrossModel.reflection.AstReflection`)
- Serializer is accessed via `services.CrossModel.serializer.Serializer`

### File System Provider
When creating CrossModel services in extensions, provide a minimal file system provider:
```typescript
const emptyFileSystemProvider = {
   readFile: async (_uri: URI): Promise<string> => '',
   readDirectory: async (_uri: URI): Promise<any[]> => []
};

const EmptyFileSystem = {
   fileSystemProvider: () => emptyFileSystemProvider
};

const services = createCrossModelServices(EmptyFileSystem);
```

## Testing Guidelines

### Unit Tests
- Use Jest for unit testing
- Test files should be co-located with source files (`.spec.ts` or `.test.ts`)
- Configure Jest with `jest.config.cjs` in the package/extension root

### E2E Tests
- Use Playwright for end-to-end testing
- Tests are located in `e2e-tests/src/tests/`
- Tests should verify actual functionality, not just app initialization
- Make meaningful AST property changes in tests (e.g., modify `description`, add `customProperties`)
- Use robust selectors and timeouts for CI/CD stability

### Test Execution
```bash
# Install Playwright dependencies
yarn --cwd ./e2e-tests/ playwright:install

# Run e2e tests (requires xvfb on Linux)
yarn ui-test

# Run unit tests in a specific package
cd extensions/crossmodel-merge
yarn test
```

## Extension Development

### Package.json Configuration
- Extensions should have `langium` in `devDependencies` only
- Use `@crossmodel/server` for runtime Langium functionality
- Include proper build scripts using esbuild

### esbuild Configuration
- Bundle as CommonJS format (`.cjs`)
- Mark external dependencies appropriately
- Use `external: ['@crossmodel/server', 'vscode', '@theia/plugin']`

### Extension Activation
- Use `onStartupFinished` activation event for extensions that need to be active immediately
- Register commands, tree view providers, and UI contributions in the `activate()` function

## CI/CD Integration

### GitHub Workflows
- The `cicd-feature` workflow runs on feature branches and copilot branches
- Includes linting, building, and e2e testing on Ubuntu
- Tests run in headless mode with xvfb

### Branch Naming
- Feature branches: `feature/*`
- Copilot branches: `copilot/*`

## Common Issues and Solutions

### Issue: ERR_PACKAGE_PATH_NOT_EXPORTED
**Cause**: Runtime imports from `langium` package in bundled code  
**Solution**: Use type-only imports (`import type`) and implement local helper functions

### Issue: Cannot read properties of undefined (reading 'AstReflection')
**Cause**: Incorrect service access path  
**Solution**: Use `services.shared.AstReflection` instead of `services.CrossModel.reflection.AstReflection`

### Issue: context.fileSystemProvider is not a function
**Cause**: Missing file system provider when creating services  
**Solution**: Provide empty file system provider implementation

### Issue: All files show as "Add" instead of "Changed"
**Cause**: Incorrect diff3 parameters  
**Solution**: For 2-way diff (HEAD vs working tree), pass `diff3Node(base, base, ours, ...)` not `diff3Node(base, base || ours, ours, ...)`

## Best Practices

1. **Minimal Changes**: Make the smallest possible changes to achieve the goal
2. **Type Safety**: Leverage TypeScript's type system fully
3. **Schema Agnostic**: Use Langium reflection instead of hard-coding property lists
4. **Testing**: Always add tests for new functionality
5. **Documentation**: Update README.md and other docs when adding features
6. **Linting**: Run linters before committing
7. **Build Verification**: Ensure `yarn build` succeeds before submitting changes

## Useful Resources

- [Langium Documentation](https://langium.org/)
- [Eclipse Theia Documentation](https://theia-ide.org/)
- [GLSP Documentation](https://www.eclipse.org/glsp/)
- [Playwright Documentation](https://playwright.dev/)

## Contributing

When working on this repository:
1. Create a feature branch from the main branch
2. Make changes following the guidelines above
3. Run linting and tests
4. Create a pull request with a clear description
5. Address review comments promptly

## Agent-Specific Notes

- Agents should prioritize understanding the existing codebase before making changes
- Run tests locally when possible to verify changes
- Use the CI/CD pipeline to validate changes when local testing is not feasible
- Respond to review comments by making targeted fixes and including commit hashes in replies
