# Testing CrossModel

## Getting started

The testing framework for this project is Jest. The dev NPM packages are _jest_ and _ts-jest_.

## Setting up the tests on your system

Run this command in your terminal: `yarn`

It is recommended to run the Jest tests using the VS Code extension: [_Jest_](https://marketplace.visualstudio.com/items?itemName=Orta.vscode-jest). With this extension, tests will automatically run when updated and it is very easy to run the tests from the VS Code GUI (using the button immediately left of the test in question).

## Writing tests

Unit tests can be placed in the same directory as the TypeScript files they test. It is also possible to add them to the `crossmodel/tests/` directory. Functional and integration tests are located in the `crossmodel/tests/` directory as well.

Unit test files should have the structure `*.test.ts` as their filename, for clarity in the project structure and to allow Jest to run your TypeScript tests[^1]. Consider using the inbuilt assert functions of Jest, such as:  
`expect(sum(5, 25)).toEqual(30)` and `expect(results_arr.length).toBeGreaterThan(2)` . See all the methods available on [`expect()`](https://jestjs.io/docs/expect).

[^1]: Files with this name structure are transformed by _ts-jest_ so that _Jest_ can process them as Javascript

## Running tests

Test can be run by using the following command in the root directory or in the sub-directory where the tests are located you want to run.

    yarn test

### Debugging test

There is also an option to debug tests, by using the "Debug Jest Tests" in vscode. You have to change the argument to point to the correct test file. This is done by changing the launch.json in the .vscode folder of the project.
