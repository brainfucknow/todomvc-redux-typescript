/**
 * Flat config for ESLint 9.
 *
 * This file is CommonJS on purpose. `package.json` has no `"type": "module"`
 * and cannot get one while `qa/stub/` is CommonJS JavaScript, so Node reads a
 * bare `.js` here as CommonJS. Every other config in the repository states its
 * module system in its extension (`vite.config.mts`, `scripts/*.mjs`), and this
 * one does the same by not having one.
 *
 * The repository holds five kinds of code and each gets its own block, because
 * a single set of globals would be wrong for all of them:
 *
 *   src/                 browser + React + the Vitest globals the specs use
 *   qa/tests, qa/*.ts    Node, Playwright specs, no React and no JSX a11y
 *   qa/stub/             plain CommonJS JavaScript, Node, no TypeScript rules
 *   acceptance/,         Node, no React: the harnesses that drive src/ through
 *   properties/          its own module boundary
 *   root loose files     Node, ESM (vite.config.mts, scripts/*.mjs) or CJS
 *                        (eslint.config.js, prettier.config.js)
 *
 * One block is not about a kind of code but about one file: the todo API policy
 * module, which is forbidden the environment. See it below for why lint is the
 * only tool in this repository that can say so.
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
/**
 * eslint-plugin-jsx-a11y 6.10.2 ships no type declarations, so this is the one
 * require in this file that the tools type project cannot check. The
 * suppression is deliberately the expecting kind: the day the plugin ships
 * declarations, tsc reports this comment as unused and it goes away.
 */
// @ts-expect-error - untyped package
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
    ignores: ['dist/', 'coverage/', 'qa/.artifacts/', 'build/', '.aps/'],
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

  /**
   * The todo API policy module, and the one thing lint can say about it that
   * nothing else can.
   *
   * `src/todo-api/client.ts` is the module the acceptance and property suites
   * drive directly, on the promise that it has no environment: no network, no
   * console, no DOM, no clock. That promise was prose in a handoff note until
   * this block, and it is not implied by the type gate - `@types/node` declares
   * global `fetch`, `Response` and `console`, so `fetch(...)` inside this file
   * compiles clean under every project in the repository, DOM lib or not.
   *
   * What it imports is a different question with a different answer:
   * scripts/architecture/boundaries.mjs holds the dependency rules, because a
   * layer's allowed-dependency list is data other rules are written against,
   * not a lint setting.
   */
  {
    files: ['src/todo-api/client.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...[
          'fetch',
          'XMLHttpRequest',
          'WebSocket',
          'console',
          'window',
          'document',
          'navigator',
          'location',
          'history',
          'localStorage',
          'sessionStorage',
          'indexedDB',
          'caches',
          'alert',
          'process',
          'Date',
          'performance',
        ].map((name) => ({
          name,
          message:
            'src/todo-api/client.ts answers domain questions and must run with no environment. Take what you need as an argument and let the caller supply it, as SendRequest does.',
        })),
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'globalThis',
          message:
            'Reaching through globalThis is the same environment dependency spelled differently.',
        },
        {
          object: 'Math',
          property: 'random',
          message:
            'A module the property suite generates inputs for cannot generate its own.',
        },
      ],
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

  // The acceptance pipeline's runtime and step handlers, and the property
  // suite. Node, never a browser bundle, and no React: both drive src/ through
  // its own module boundary.
  {
    files: ['acceptance/**/*.ts', 'properties/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
  },

  // Loose files at the root that belong to no tsconfig project.
  {
    files: ['*.mts', 'scripts/**/*.mjs'],
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
