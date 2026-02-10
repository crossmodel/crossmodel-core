# Documentation Screenshot Tests Manual

This guide explains how to produce and update Playwright tests that generate documentation screenshots for the knowledge base. Each knowledge‑base page should have a matching test that produces the required screenshots.

## Goals

- Generate consistent screenshots for documentation pages.
- Regenerate all screenshots after UI changes before every release.
- Adjust tests when flows or UI structure change.
- Add new tests for new tutorials or website pages.

## Folder and Naming Convention

- Each documentation test stores screenshots in a folder named after the test file (or page topic).
- Example: screenshots for datamodeling-fundamentals live in:

screenshots/datamodeling-fundamentals/

- In tests, build the screenshot_path with a shared prefix:

const test_title = 'datamodeling-fundamentals';
const screenshot_path = `./screenshots/${test_title}`;
// To produce a screenshot in the correct path use :
await page.screenshot({ path: `${screenshot_path}/example.png` });

## Running All Documentation Screenshot Tests

To regenerate screenshots for all documentation tests, use the VS Code Test tab interface:

- Open the Test tab in VS Code (beaker icon on the Activity Bar).
- Locate the documentation tests under the e2e-tests/src/tests/documentation folder.
- Click the play button next to a test or test suite to run and update screenshots.

This is the recommended way to run documentation screenshot tests, as command-line execution may not work in all environments.

## Adjusting a Test When the Flow Changes

Recommended workflow:

1. Run the application in the dev container (so it is reachable at <http://localhost:3000>).
   **Recommended command:**

   ```sh
   yarn build:browser && yarn start:browser
   ```

2. On your local machine, install the same Playwright version used by the project (see e2e-tests/package.json).
   **Recommended command:**

   ```sh
   npm install -D @playwright/test@1.47.0
   ```

3. Run codegen locally to record steps:

npx playwright codegen <http://localhost:3000>

1. Copy the generated steps into the test in this repo.
2. Translate selectors to Theia‑safe or project‑specific selectors (see below).
3. Run the test in the dev container and verify screenshots.

## Selector Strategy

Playwright does not interact with React components directly; it only sees the rendered HTML. For robust tests, prefer stable selectors in the DOM.

### 1) Our own UI widgets (recommended)

When you control the component, add stable attributes:

- data-test-id
- aria-label
- role + accessible name

Use them like this:

- page.getByTestId('my-component')
- page.getByRole('button', { name: 'Save' })
- page.getByLabel('Name')

### 2) Theia / VS Code‑like widgets (3rd‑party)

When you cannot add data-test-id, scope and use stable roles, labels, or container selectors.

#### Command palette (quick input)

Scope to the quick input container so you avoid matching unrelated comboboxes:

const quickInput = page.locator('#quickInputWidget');
await quickInput.getByRole('combobox', { name: 'input' }).fill('>git clone');

If #quickInputWidget does not exist, inspect the DOM and use the actual class (often .quick-input-widget).

#### Dialogs

The dialog shell often spans the full page. Target the dialog content container inside it:

const shell = page.locator('#theia-dialog-shell');
const dialog = shell.locator('div.contentDialog');
await dialog.waitFor({ state: 'visible' });

If multiple dialogs appear, filter by visible text:

const dialog = shell.locator('div.contentDialog').filter({ hasText: 'Select Repository' });

### 3) Scoping to avoid collisions

Always scope locators inside a stable parent container to avoid matching unrelated elements:

const dialog = page.locator('#theia-dialog-shell').locator('div.contentDialog');
await dialog.getByRole('button', { name: 'Open' }).click();

## Screenshot Techniques

### 1) Whole page

await page.screenshot({ path: `./screenshots/${main_title}/full-page.png` });

### 2) Specific component

const button = page.getByRole('button', { name: 'Select as Repository' });
await button.screenshot({ path: `./screenshots/${main_title}/select-repo-button.png` });

### 3) Zoomed-out component (component + context)

Use bounding boxes and page.screenshot with clip:

const locator = page.getByRole('combobox', { name: 'input' });
const box = await locator.boundingBox();
if (box) {
await page.screenshot({
path: `./screenshots/${main_title}/clone-inputbox.png`,
clip: {
x: Math.max(box.x - 20, 0),
y: Math.max(box.y - 20, 0),
width: box.width + 40,
height: box.height + 40
}
});
}

Note: clip is only available on page.screenshot (not locator.screenshot).

### 4) Temporary highlight for emphasis

const dialog = page.locator('div.contentDialog');
await dialog.waitFor({ state: 'visible' });

const originalBorder = await dialog.evaluate(el => el.style.border);
await dialog.evaluate(el => (el.style.border = '3px solid red'));
await dialog.screenshot({ path: `./screenshots/${main_title}/dialog-highlight.png` });
await dialog.evaluate((el, border) => (el.style.border = border), originalBorder);

## Make Screenshots Deterministic

To avoid flaky screenshots:

- Set a fixed viewport size in the Playwright config or at the test start.
- Disable animations when possible.
- Wait for the UI to settle (network idle, specific element visible).
- Hide dynamic content (timestamps, random IDs) if needed.
- Avoid scrolling unless required and ensure consistent scroll positions.

Example for fixed viewport:

await page.setViewportSize({ width: 1440, height: 900 });

## Common Pitfalls

- Using selectOption on input elements: selectOption only works on <select>.
- Using locator.screenshot with clip: clip is only on page.screenshot.
- Using non‑scoped selectors: Theia UI has many repeating inputs; always scope.

## Summary

- Use stable selectors whenever possible.
- Scope locators inside Theia containers.
- Prefer element screenshots or clipped regions for consistent documentation images.
- Keep screenshot paths organized by documentation page name.
- Run all documentation tests to regenerate the full set of screenshots.
