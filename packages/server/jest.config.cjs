/** @type {import('ts-jest').JestConfigWithTsJest} */
const baseConfig = require('../../configs/base.esm.jest.config');

module.exports = {
   ...baseConfig,
   displayName: 'Server'
};
