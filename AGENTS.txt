# Agent Guidelines

## Repository Snapshot
- Monorepo managed via npm workspaces and Lerna (`lerna.json` sets `npmClient: npm`).
- Toolchain expectations: Node >= 20 (CI runs Node 22.x) and Python 3.11 for tooling scripts.
- Primary apps live under `applications/` (browser and electron) with shared Theia extensions in `packages/` and VS Code extensions in `extensions/`.

## Environment & Dependency Setup
- Always install dependencies with `npm ci` from the repository root; it respects the lockfile and triggers the required postinstall hooks (`theia check:theia-version` + `theia-patch`).
- Avoid `npm install` unless you are intentionally modifying dependencies; keep `package-lock.json` and workspace lockfiles in sync.
- Use `npm run --workspace <name> <script>` for package-specific commands (e.g. `npm run --workspace crossmodel-e2e-tests playwright:install`).

## Core Scripts
- `npm run build:browser` / `npm run build:electron`: builds the web or desktop targets (both call through to Lerna + Theia scripts).
- `npm run start:browser` / `npm run start:electron`: launches dev instances after a build.
- `npm run watch:browser` / `npm run watch:electron`: watch mode across workspaces; scope-specific watch scripts exist under each workspace if you need finer control.
- `npm run theia:electron -- build|package|start`: passes sub-commands to the electron workspace (see `package.json` for options).

## Testing & Quality Gates
- Unit tests: `npm run test` (runs both CJS and ESM Jest suites). Clean artifacts land in `unit-test-results/`.
- Lint: `npm run lint` (Lerna executes lint in each package).
- Formatting: `npm run format` for repository-wide Prettier + ESLint fixes.
- E2E: `npm run --workspace crossmodel-e2e-tests ui-test` (ensures Playwright browsers installed first via the `playwright:install` script).
- When touching affected areas, run the relevant scripts locally before pushing; CI mirrors these commands in `.github/workflows/`.

## CI/CD Expectations
- GitHub Actions use the composite action in `.github/actions/common-build`. Keep npm commands aligned there when adding steps.
- Caches are keyed for npm. Do not reintroduce Yarn-specific config or lockfiles.
- Release packaging (`cicd-release.yml`) relies on `npm ci`, `npm run build:packages`, and Theia electron build/package scripts; ensure related changes keep those commands functional.

## Contribution Conventions
- Follow Conventional Commits and Conventional Branch naming (see `CONTRIBUTING.md`).
- Update documentation in `docs/`, `README.md`, or relevant workspaces when behaviour or commands change.
- Prefer small, focused changes; include tests or adjustments when modifying functionality.

## When Investigating Issues
- Check shared configuration under `configs/` and workspace-specific `package.json` files to understand script behaviour.
- For packaging issues, inspect `applications/electron-app/electron-builder.yml` and artifacts under `applications/electron-app/dist`.
- Architecture references live in `docs/Architecture.md` and can clarify component responsibilities before refactoring.

## Miscellaneous
- Verdaccio example workflows live under `examples/verdaccio-example`; use `npm run start:verdaccio` if you need the local registry during tests.
- Respect TypeScript project references defined in `tsconfig.json` / `packages/*/tsconfig.json` when adding new packages or build steps.
- Keep instructions ASCII-only and avoid altering generated assets unless regeneration is part of the change.
