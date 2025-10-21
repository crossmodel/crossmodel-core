/** @type {import('ts-jest').JestConfigWithTsJest} */
const baseConfig = require('../../configs/base.esm.jest.config');

module.exports = {
   ...baseConfig,
   displayName: 'CrossModel Merge Extension',
   testMatch: ['**/*.spec.ts', '**/*.test.ts'],
   collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/types/**'],
   coverageDirectory: 'coverage',
   coverageReporters: ['text', 'lcov', 'html'],
   moduleNameMapper: {
      ...baseConfig.moduleNameMapper,
      '^vscode$': '<rootDir>/test/vscode-mock.ts'
   }
};
