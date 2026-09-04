/**
 * Flat config for ESLint 9.
 *
 * This file is CommonJS on purpose. `package.json` has no `"type": "module"`
 * and cannot get one while `qa/stub/` is CommonJS JavaScript, so Node reads a
 * bare `.js` here as CommonJS. Every other config in the repository states its
 * module system in its extension (`vite.config.mts`, `scripts/*.mjs`), and this
 * one does the same by not having one.
 *
 * The repository holds four kinds of code and each gets its own block, because
 * a single set of globals would be wrong for all of them:
 *
 *   src/                 browser + React + the Vitest globals the specs use
 *   qa/tests, qa/*.ts    Node, Playwright specs, no React and no JSX a11y
 *   qa/stub/             plain CommonJS JavaScript, Node, no TypeScript rules
 *   root loose files     Node, ESM (vite.config.mts, scripts/*.mjs) or CJS
 *                        (eslint.config.js, prettier.config.js)
 *
 * Formatting is Prettier's job alone: `eslint-config-prettier` comes last and
 * switches off every ESLint rule that has an opinion about layout, so the two
 * tools can never disagree about the same line.
 */

const js = require('@eslint/js')
const globals = require('globals')
const tseslint = require('typescript-eslint')
const react = require('eslint-plugin-react')
const reactHooks = require('eslint-plugin-react-hooks')
const jsxA11y = require('eslint-plugin-jsx-a11y')
const prettier = require('eslint-config-prettier/flat')

/**
 * Vitest runs with `globals: true` (see vite.config.mts), so the specs call
 * describe/it/expect/vi without importing them. The `globals` package has no
 * entry for Vitest.
 */
const vitestGlobals = Object.fromEntries(
  [
    'describe',
    'it',
    'test',
    'expect',
    'vi',
    'beforeAll',
    'beforeEach',
    'afterAll',
    'afterEach',
  ].map((name) => [name, 'readonly']),
)

module.exports = tseslint.config(
  {
    ignores: ['dist/', 'coverage/', 'qa/.artifacts/'],
  },

  // The application.
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...vitestGlobals },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs['recommended-latest'].rules,
      ...jsxA11y.flatConfigs.recommended.rules,
    },
  },

  // Playwright specs and their support code. Node, never a browser bundle.
  {
    files: ['qa/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
  },

  // The stub backend: plain CommonJS JavaScript, no TypeScript rules to apply.
  {
    files: ['qa/stub/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },

  // Loose files at the root that belong to no tsconfig project.
  {
    files: ['vite.config.mts', 'scripts/**/*.mjs'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
  },
  {
    files: ['eslint.config.js', 'prettier.config.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },

  prettier,
)
