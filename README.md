# Redux TodoMVC Example

A TodoMVC client written in TypeScript with React and Redux, built and served by [Vite](https://vite.dev/).

## The stack

| Concern | What runs |
| --- | --- |
| Build and dev server | Vite 8 (`vite.config.mts`) |
| UI | React 19 with `createRoot` and `StrictMode` |
| State | Redux 5 with `@reduxjs/toolkit`'s `configureStore`; `connect()` containers |
| Data | `src/todo-api/` builds the requests and reads the answers; `fetch` lives in one adapter, and a middleware runs the calls against `api/todos/` |
| Types | TypeScript 5.9, `strict`, four projects: `tsconfig.json` for the app, `qa/tsconfig.json` for the E2E specs, `acceptance/tsconfig.json` for the acceptance runtime and step handlers, `tsconfig.tools.json` for the config files and scripts |
| Unit tests | Vitest, jsdom, `@testing-library/react` |
| Acceptance tests | Gherkin in `features/`, parsed and run through the [Acceptance Pipeline Specification](https://github.com/unclebob/Acceptance-Pipeline-Specification) |
| End-to-end tests | Playwright against a stub backend in `qa/` |
| Lint and format | ESLint 9 flat config (`eslint.config.js`) and Prettier (`prettier.config.js`) |

## Backend

Start [Todo Backend Express](https://github.com/wallymathieu/todo-backend-express) with docker compose. The dev and preview servers proxy `/api` to `http://localhost:4000`.

The end-to-end suite does not need it: it runs against the stub backend in `qa/stub/`, which implements the same contract and can be told to fail on demand.

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the app in development mode on [http://localhost:3000](http://localhost:3000), with hot module replacement.<br>
`npm start` is an alias for it.

### `npm run build`

Builds the app for production into the `dist` folder, minified and with hashed filenames.

### `npm run preview`

Serves the contents of `dist` locally, so the production build can be checked before it ships. Run `npm run build` first.

### `npm test`

Runs both Vitest projects once:

- `unit` - the application's specs under `src/`, in jsdom.
- `scripts` - the repository's own tooling under `scripts/`, in Node.

`npm run test:unit` and `npm run test:scripts` run one project each, so either
suite's file and test counts can be read on its own.

### `npm run lint`

Lints the whole repository with ESLint 9 (`eslint.config.js`): the application
sources, the end-to-end specs, the stub backend, and the root configs. Warnings
fail it as well as errors, so nothing accumulates unread.

### `npm run format` and `npm run format:check`

Formats, or checks the formatting of, everything Prettier owns
(`prettier.config.js`). `format:check` changes nothing and is the CI gate. The
E2E suite under `qa/` and the Markdown documents are excluded; see
`.prettierignore` for why.

### `npm run typecheck`

Type-checks all four TypeScript projects with the compiler: the application sources under `src/`, the end-to-end specs under `qa/`, the acceptance runtime and step handlers under `acceptance/`, and the repository's own tooling — `vite.config.mts`, `vitest.acceptance.config.mts`, the two `*.config.js` files, and `scripts/*.mjs`, which are JavaScript type-checked through their JSDoc. A diagnostic in any of them fails the check. Vite itself does not type-check while building.

The four are separate projects rather than one because their environments
disagree: only the tooling gets `"types": ["node"]`, so Node's globals never
reach the app's compilation.

The gate is `scripts/typecheck.mjs`, and `npm run test:scripts` is what keeps it
honest: it has reported success without checking anything three times in this
repository's history, and there is a test for each way it did.

### `npm run acceptance`

Runs the Gherkin in `features/` against the code: parse, generate, execute.

    features/*.feature -> gherkin-parser -> build/acceptance/ir/*.json
                       -> scripts/acceptance/generate-entrypoints.mjs
                       -> build/acceptance/generated/*.acceptance.test.mjs
                       -> vitest --config vitest.acceptance.config.mts

The parser is APS's, not this repository's; `acceptance/runtime.ts` and
`acceptance/steps/` are this repository's, and both derived directories are
rebuilt from scratch on every run. Acceptance tests are their own Vitest
configuration and never join `npm test`: they answer a different question and
are counted separately.

### `npm run acceptance:install`

Puts the APS commands where `npm run acceptance` looks for them, by building
them from the specification repository into `.aps/bin/` (gitignored). Needs Go
and, the first time, network access to clone. `$APS_SOURCE` points at a
checkout that already exists; `$APS_BIN_DIR` points at commands already built.

Run it once before the first acceptance run. Nothing else in this repository
needs it.

### `npm run test:e2e`

Builds the app and runs the end-to-end procedures in `qa/` against it with Playwright.

The suite needs a browser. This repository's own environment ships one; a fresh
checkout does not, so run `npx playwright install chromium` once before the
first run.

### `npm run test:e2e:dev` and `npm run test:e2e:preview`

The same procedures against `npm run dev` and against `npm run preview`, with
`/api` proxied to the stub. They exist to tell a server-specific failure apart
from an application one. Procedure 20 is skipped in both: a transport failure
cannot be delivered through an HTTP proxy.

## Continuous integration

`.github/workflows/nodejs.yml` runs, on every pull request and on every push to
`master`: `npm ci`, then lint, format check, typecheck, unit tests, production
build, a grep that fails if `propTypes` returns to `src/`, and the end-to-end
suite against the built app. Every step is one of the commands above, so a red
job reproduces locally by name.

`npm run acceptance` is not a CI step today: it needs a Go toolchain and a
clone of the APS repository, neither of which the workflow sets up.
