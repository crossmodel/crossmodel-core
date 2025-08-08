# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build Commands
- `yarn build` - Build all packages
- `yarn build:browser` - Build browser application
- `yarn build:electron` - Build electron application
- `yarn build:packages` - Build only packages (excludes applications)

### Development Workflow
- `yarn` - Install dependencies
- `yarn watch:browser` - Start development mode for browser app
- `yarn watch:electron` - Start development mode for electron app
- `yarn start:browser` - Start browser app (builds first)
- `yarn start:electron` - Start electron app (builds first)

### Testing & Quality
- `yarn test` - Run all tests (CJS and ESM)
- `yarn lint` - Run linting across all packages
- `yarn format` - Format code with prettier

### Package Management
- `yarn clean` - Clean all build artifacts
- `yarn package:extensions` - Package VS Code extensions

## Architecture Overview

CrossModel is a data modeling platform built on Theia with multiple modeling perspectives:

### Core Components
1. **Langium Language Server** (`extensions/crossmodel-lang/`) - Provides textual modeling with LSP
2. **GLSP Server** - Handles graphical/diagram modeling 
3. **Model Service** - Central service for model synchronization across editors
4. **Theia Packages** (`packages/`) - Frontend extensions for different editors

### Key Packages
- `composite-editor` - Multi-perspective editor combining form and code views
- `glsp-client` - Diagram editor client using GLSP protocol
- `form-client` - Form-based editor for model properties
- `model-service` - Core model management and synchronization
- `protocol` - Shared protocols for client-server communication
- `react-model-ui` - React components for form-based editing

### Applications
- `browser-app` - Web application build
- `electron-app` - Desktop application build

### Data Model Management
- Uses a DataModel Manager for project-like semantics where `datamodel.cm` files define system boundaries
- Model synchronization across different editors through central document store
- Support for dependencies between data models/systems

### File Extensions
- `.cm` files - CrossModel data files
- `datamodel.cm` - Project/system definition files

## Development Notes

- Monorepo managed with Lerna
- Uses Yarn for package management
- Built on Theia 1.64.0 framework
- Language support through VS Code extensions in `extensions/`
- Multiple editor perspectives sync through shared document store
- GLSP server runs in same process as Langium server for efficiency