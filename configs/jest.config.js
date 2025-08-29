/** @type {import('ts-jest').JestConfigWithTsJest} */
const baseConfig = require('./base.jest.config');
const path = require('path');

module.exports = {
   ...baseConfig,
   rootDir: '../',
   reporters: [
      [
         'jest-junit',
         {
            outputDirectory: path.join(__dirname, '..', 'unit-test-results'),
            outputName: 'jest-report',
            uniqueOutputName: 'true'
         }
      ],
      ['github-actions', { silent: false }],
      'summary',
      'default'
   ],
   // Explicit list to avoid pulling in ESM server package and extension tests
   projects: [
      '<rootDir>/packages/core',
      '<rootDir>/packages/composite-editor',
      '<rootDir>/packages/form-client',
      '<rootDir>/packages/glsp-client',
      '<rootDir>/packages/model-service',
      '<rootDir>/packages/product',
      '<rootDir>/packages/property-view',
      '<rootDir>/packages/react-model-ui'
   ]
};
