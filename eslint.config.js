import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Allow _prefixed unused vars (common for unused function parameters)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // React compiler rules that produce false positives for our patterns:
      // - refs: flags intentional ref reads in useMemo/render (e.g. stable keys)
      // - set-state-in-effect: flags standard async fetch→setState patterns
      // - globals: flags valid global access patterns
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/globals': 'off',
      // Allow files to export both components and non-components (constants, hooks)
      'react-refresh/only-export-components': 'off',
    },
  },
])
