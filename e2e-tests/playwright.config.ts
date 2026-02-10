/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import 'reflect-metadata';

import { defineConfig } from '@playwright/test';

export default defineConfig({
   testDir: './src/tests',
   testMatch: ['**/*.spec.ts'],
   workers: process.env.CI ? 1 : 2,
   retries: process.env.CI ? 1 : 0,
   // The number of times to repeat each test, useful for debugging flaky tests
   repeatEach: 1,
   // Fixture timeout (for each test) in milliseconds: 60 seconds.
   timeout: 60 * 1000,
   use: {
      // Timeout for each single action in milliseconds: 10 seconds (make sure it's less hen the fixture timeout, so it will timeout before the whole tests times out)
      actionTimeout: 10 * 1000,
      // Timeout for each navigation action in milliseconds: 30 seconds (make sure it's less hen the fixture timeout, so it will timeout before the whole tests times out)
      navigationTimeout: 30 * 1000,
      baseURL: 'http://localhost:3000',
      browserName: 'chromium',
      screenshot: 'only-on-failure',
      viewport: { width: 1920, height: 1080 }
   },
   snapshotDir: './src/tests/snapshots',
   expect: {
      toMatchSnapshot: { threshold: 0.01 }
   },
   preserveOutput: 'failures-only',
   reporter: process.env.CI ? [['list'], ['allure-playwright'], ['github']] : [['list'], ['html']],
   /* Run your local dev server before starting the tests */
   webServer: {
      command: 'yarn --cwd ../../ start:browser',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI
   }
});
