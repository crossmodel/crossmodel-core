/** @type {import('eslint').Linter.Config} */
module.exports = {
   extends: ['../../.eslintrc.js'],
   ignorePatterns: ['jest.config.cjs'],
   rules: {
      // turn import issues off as eslint cannot handle ES modules
      'import/no-unresolved': 'off'
   }
};
