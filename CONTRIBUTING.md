# Contributing to CrossModel

First of all, thank you for your interest in contributing to CrossModel!

CrossModel is an open-source project built to make model-driven data engineering more intuitive, transparent, and powerful. Whether you're fixing bugs, improving documentation, suggesting features, or helping shape the platform’s future, your contributions are welcome and appreciated.

This guide will help you get started with contributing to the project. It covers how to set up your environment, submit changes, and collaborate with the CrossModel team and community.

We believe in open collaboration, respectful communication, and building useful tools together. Let’s make better data modeling possible for everyone.

## Getting started

First of, in order to streamline the development, merge and CI/CD processes we adopt the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) standard for naming branches, commit messages, etc. This helps being organized and automate the release process.

Depending in your development environment there are different options to work on CrossModel.

### Work locally

Please install all necessary [prerequisites](https://github.com/eclipse-theia/theia/blob/master/doc/Developing.md#prerequisites) on your system.

For detailed instructions for a Windows machine, follow [this](./docs/PrerequisitesWindows.md) guide.

### Work in Dev Container (Windows)

When developing on Windows you can develop CrossModel from within a Dev Container (using WSL2). The best way to do so is create a new Dev Container and cloning the repository in there. For instructions please consult [this](https://code.visualstudio.com/docs/devcontainers/containers#_quick-start-open-a-git-repository-or-github-pr-in-an-isolated-container-volume) page.

Short steps:

1. Install Docker with WSL 2 engine enabled.
1. In VS Code press [CTRL] + [SHIFT] + [P] and type 'Dev Container: Clone Repository in Container Volume...' and press [Enter].
1. Enter the current repository URL and press [Enter]. Now the dev container will be created with the Git repository cloned in it (faster then cloned locally in Windows).

## Installing the application dependencies

    yarn

## Running the application

### Browser

This will build and start CrossModel as a web application. When the web application is running you can open <http://localhost:3000> in your browser to use CrossModel.

    yarn build:browser &&
    yarn start:browser

### Electron (desktop application)

This will build and start CrossModel as a native desktop application for the OS (Windows, Linux or MacOS) where the command is started.

    yarn build:electron &&
    yarn start:electron

## Developing

Start watching all packages of your application for either browser or electron version.

    yarn watch:browser

_or_

    yarn watch:electron

_or_ watch only specific packages with

    cd packages/<package-name>
    yarn watch

and the Electron example.

    cd applications/electron-app
    yarn watch

Run the example as [described above](#running-the-application).

Any code changes will be automatically detected and the application will be re-compiled.
If you only made changes to the frontend or plugins, simply reloading the running application with `F5` is enough.
If you also made changes to the backend, you can close and restart the application without manual re-compilation.

### Styling

Eclipse Theia allows themes to be used using any [VS Code Theme](https://code.visualstudio.com/docs/configure/themes). There is a [fixed set of theme colors](https://code.visualstudio.com/api/references/theme-color) that can be defined for different components within VS Code. For example, within the [Base colors](https://code.visualstudio.com/api/references/theme-color#base-colors) section there is a `foreground` color defined as the overall foreground color. Another example is the `button.hoverBackground` variable within the [Button control](https://code.visualstudio.com/api/references/theme-color#button-control) section which defines the background color of a button when hovering.

These theme colors are available from within any CSS file within CrossModel as a variable by prefixing the color variable with `--theia-` and replacing any `.` with a `-`. Also if a variable consists of multiple words (like hoverBackground), the words are also separated with a `-` and written in lowercase (so hover-background). See the example below how to use the two mentioned example base colors:

```css
body {
   color: var(--theia-foreground);
}

button:hover {
   color: var(--theia-button-hover-background);
}
```

For CrossModel a [theme](./extensions/crossmodel-theme/) extension has been created consisting of a [light](./extensions/crossmodel-theme/themes/crossmodel-light-color-theme.json) and [dark](./extensions/crossmodel-theme/themes/crossmodel-dark-color-theme.json) theme. Consult/adjust these files for the colors, fonts, etc. to be used within CrossModel.

## Packaging

We package CrossModel as a desktop application (Electron).
To package CrossModel as a desktop application, execute the following command:

    yarn theia:electron package

Depending on the platform, this will produce an executable or an installer for the application under `applications/electron-app/dist`.

Details about the packaging can be configured in `applications/electron-app/electron-builder.yml`.

## Conventions

Within the CrossModel project why adopt several conventions to streamline development and integration.

- Branching: [Conventional Branch](https://conventional-branch.github.io/)
- Commits: [Conventional Commits](https://www.conventionalcommits.org/)

## Structure

A general overview of the application architecture is provided in the [Architecture Overview](docs/Architecture.md).
The repository itself contains the following components structured as follows:

    ├── applications
    │   ├── browser-app              # Browser application
    │   └── electron-app             # Electron application
    ├── configs
    ├── docs                         # Documentation
    ├── examples
    │   ├── language-examples        # Example workspace with multiple model types
    │   ├── mapping-example          # Example workspace with a DWH example (multiple models and mappings)
    |   └── verdaccio-example        # Example workspace using verdaccio npm registry
    │       ├── libraries                # Example libraries referenced in the local npm registry
    │       ├── registry                 # Local npm registry using Verdaccio
    │       └── workspace                # Workspace that can be opened in the tool
    ├── extensions                   # VS Code extensions
    │   ├── crossmodel theme         # CrossModel Theme (with light & dark mode)
    │   └── crossmodel-lang          # CrossModel language support (through three servers)
    │       └── src
    │           ├── glsp-server      # Graphical modelling server based on GLSP
    │           ├── language-server  # Textual modelling server based on Langium
    │           ├── model-server     # Custom model server to provide access to the semantic models
    │           ├── extension.ts     # Extension starting the server process and the language client
    │           └── main.ts          # Server process starting up all servers
    └── packages                     # Theia extensions
            ├── composite-editor     # Composite editor with form and code editor.
            ├── core                 # Core customizations
            ├── form-client          # Form editor widget connecting to the model server
            ├── glsp-client          # Diagram configuration and widget using the GLSP server
            ├── model-service        # Model service providing access to the models
            ├── product              # Application-level modifications
            ├── property-view        # Property view widget used in diagram context.
            ├── protocol             # RPC protocol to communicate with custom model server
            └── react-model-ui       # Front-end form components

## Example Workspace

Under `examples/verdaccio-example/workspace` we provide an example workspace with some demo packages containing entities, relationships and system diagrams.
Each package represents a dedicated system or library and may depend on other packages.

Using a known package structure - npm in our case - we can re-use large parts of the package management to download dependencies that are not locally available from an external package registry.
In order to test this behavior, we use verdaccio as a local npm registry that provides some models that are needed by our workspace packages.
You can start verdaccio using

    yarn start:verdaccio

The local npm registry will be available under `http://localhost:4873/` where we already provide four packages by default.

After opening the workspace, you can install the necessary dependencies in the example workspace by opening a terminal in `examples/verdaccio-example/workspace` and execute

    npm install

This should download all dependencies into dedicated `node_modules` directories within the workspace.

Currently there is still an issue where new files are not recognized automatically, so you need to reload your workspace once for all the dependencies to be properly recognized.

## Used libraries and license

- mui-x : MUI X is open core—base components are MIT-licensed, while more advanced features require a Pro or Premium commercial license. We are currently only using core-base
- react-tabs: MIT
- chevrotain: This library is a dependency of langium. To get the Yaml language working in crossmodel an example implementation of the python language of chevrotain has been used. This example has been modified to make it work for the yaml language.
   - <https://github.com/Chevrotain/chevrotain>
   - example that has been used: <https://github.com/Chevrotain/chevrotain/tree/master/examples/lexer/python_indentation>
