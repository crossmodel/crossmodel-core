/**@type {import('eslint').Linter.Config} */
module.exports = {
   root: true,
   parser: '@typescript-eslint/parser',
   parserOptions: {
      ecmaVersion: 6,
      sourceType: 'module'
   },
   plugins: ['@typescript-eslint'],
   extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended'
   ],
   rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
   }
};
