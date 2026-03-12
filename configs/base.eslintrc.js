module.exports = {
   parser: '@typescript-eslint/parser',
   parserOptions: {
      sourceType: 'module',
      ecmaVersion: 6,
      ecmaFeatures: {
         jsx: true
      }
   },
   plugins: ['@typescript-eslint', '@tony.ganchev/header', 'import', 'no-null', 'deprecation', 'jest'],
   extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:import/errors',
      'plugin:import/warnings',
      'plugin:import/typescript',
      'plugin:react/recommended',
      'plugin:react-hooks/recommended'
   ],
   env: {
      browser: true,
      'jest/globals': true,
      es6: true,
      node: true
   },
   ignorePatterns: ['node_modules', '*.d.ts']
};
