import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  { ignores: ['web/dist/**', 'node_modules/**', 'samples/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  // shared extractor core and CLI
  { files: ['src/**/*.js', 'bin/**/*.js', 'test/**/*.js', 'scripts/**/*.js', 'benchmark.js'], languageOptions: { globals: { ...globals.node } } },
  // browser app and its worker
  {
    files: ['web/**/*.{js,jsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  { files: ['web/src/worker.js'], languageOptions: { globals: { ...globals.worker } } },
  { files: ['vite.config.js', 'eslint.config.js'], languageOptions: { globals: { ...globals.node } } },
]);
