/** @type {import('ts-jest').JestConfigWithTsJest} */
const baseConfig = require('./base.esm.jest.config');
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
   projects: ['<rootDir>/packages/protocol', '<rootDir>/packages/server']
};
