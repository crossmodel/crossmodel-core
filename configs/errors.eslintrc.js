const year = new Date().getFullYear();
module.exports = {
   rules: {
      // https://eslint.org/docs/rules/
      // Possible Errors
      'no-inner-declarations': 'off',
      // Best Practices
      eqeqeq: ['error', 'smart'],
      'guard-for-in': 'error',
      'no-caller': 'error',
      'no-eval': 'error',
      'no-restricted-imports': [
         'error',
         {
            paths: ['..', '../index', '../..', '../../index', 'src'],
            patterns: [
               {
                  group: ['**/generated/ast', '**/generated/ast.js'],
                  message: 'Import from the augmented AST module (e.g., "../ast.js") instead of directly from "generated/ast.js".'
               }
            ]
         }
      ],
      'no-sequences': 'error',
      'no-throw-literal': 'error',
      'no-unused-expressions': [
         'error',
         {
            allowShortCircuit: true,
            allowTernary: true
         }
      ],
      // Variables
      'no-unused-vars': 'off', // typescript-eslint rule activated instead
      'no-use-before-define': 'off', // typescript-eslint rule activated instead
      'no-underscore-dangle': 'off',
      quotes: 'off', // typescript-eslint rule activated instead
      'one-var': ['error', 'never'],
      // ECMAScript6
      'arrow-body-style': ['error', 'as-needed'],
      'no-var': 'error',
      'prefer-const': [
         'error',
         {
            destructuring: 'all'
         }
      ],
      // @typescript-eslint/eslint-plugin
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/consistent-type-definitions': 'error',
      '@typescript-eslint/no-misused-new': 'error',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-unused-vars': [
         'error',
         {
            args: 'none'
         }
      ],
      // eslint-plugin-header
      'header/header': [
         2,
         'block',
         [
            {
               pattern: '[\n\r]+ \\* Copyright \\([cC]\\) \\d{4}(-\\d{4})? .*[\n\r]+',
               template: `*******************************************************************************
 * Copyright (c) ${year} CrossBreeze.
 *******************************************************************************`
            }
         ]
      ],
      // eslint-plugin-import
      'import/export': 'off', // we have multiple exports due to namespaces, enums and classes that share the same name
      'import/no-deprecated': 'error',
      // eslint-plugin-no-null
      'no-null/no-null': 'error',
      'no-unused-expressions': 'off',
      'react/react-in-jsx-scope': 'off'
   }
};
