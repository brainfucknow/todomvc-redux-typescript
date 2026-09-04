# React Modernization Plan

Project manager owned. Tasks run serially, one at a time, in the order below.
Each task runs the full role chain: specifier -> coder -> cleaner -> architect -> hardener -> QA.

## 1. Repository survey (as found)

| Area | State at plan time |
| --- | --- |
| Build tooling | Create React App, `react-scripts` 5.0.1. No build config in repo. `public/index.html` template. `package.json` `proxy: http://localhost:4000`. |
| Language | TypeScript 3.9.2, `tsconfig.json` targeting `es5`, `jsx: react`, `moduleResolution: node`, `noEmit`. `src/react-app-env.d.ts` references `react-scripts` types. |
| React | React 18.x / react-dom 18.3.1, `createRoot` + `StrictMode` in `src/index.tsx`. Two class components (`TodoItem`, `TodoTextInput`), rest function components. `prop-types` still used on `Footer`, `TodoItem`, `TodoTextInput`. |
| State | Redux 5 + `@reduxjs/toolkit` 2 `configureStore`, but reducers are hand-written switch statements (`src/reducers/todos.ts`, `visibilityFilter.ts`, `apis.ts`). Action creators are plain functions split `local.ts` / `api.ts` with a re-export barrel `index.ts`. `reselect` 4 selectors. Four `connect()` containers in `src/containers/`; `RootState` is hand-declared there and is missing the `errorMessage` and `exec` slices that `reducers/index.ts` actually combines. |
| Async / API | Custom `callAPIMiddleware` (`src/middlewares/callapimiddleware.ts`) doing `fetch` against `api/todos/*`, dispatching `*_REQUEST` / `*_SUCCESS` / `*_FAILURE`. `redux-thunk` is a dependency but unused. Todos load from `TodoList`'s `useEffect`. Backend is Todo-Backend Express on `localhost:4000` reached through the CRA dev proxy. |
| Routing | None. Visibility filter lives only in Redux state; no URL involvement. |
| Test setup | `react-scripts test` (Jest, CRA preset). Component tests use `react-shallow-renderer` and assert on React element trees, not on rendered output. `@testing-library/react` 14 and `@testing-library/dom` are installed but unused. No E2E tests. |
| Lint | No project ESLint config; relies on CRA's built-in lint. `eslint-plugin-jsx-a11y` installed but unreachable. |
| CI | `.github/workflows/nodejs.yml`: Node 22.x, `actions/checkout@v1`, `actions/setup-node@v1`, `npm ci && npm run build && npm test`. |
| Deployment | None. |

## 2. Build tool decision

**Create React App is replaced by Vite (v8) with `@vitejs/plugin-react`, and Jest/`react-scripts test` by Vitest (v5) with jsdom and `@testing-library/react`.**

Justification:

- CRA is unmaintained and formally deprecated; `react-scripts` 5.0.1 pins webpack 4/5-era transitive dependencies that this repo has been patching one Dependabot PR at a time (the entire recent commit history is bumps to CRA's transitive graph). Removing `react-scripts` removes that maintenance stream at the root.
- Vite is the mainstream successor for client-rendered SPAs and is what the React team's own docs point non-framework projects at. It gives native ESM dev, esbuild transforms, Rollup production builds, and first-class TypeScript and JSX handling with no ejection story.
- Vitest shares Vite's transform pipeline and config, so one `vite.config.ts` serves dev, build, and test. Its API is Jest-compatible enough that the existing assertions survive mechanical conversion, which keeps task 01 a toolchain swap rather than a test rewrite.
- Next.js was considered and rejected: this is a client-only TodoMVC talking to an external Todo-Backend. SSR, the App Router, and a Node server are cost without benefit here, and adopting them would be a rewrite, not a modernization.
- Rsbuild was considered and rejected: closest to CRA's webpack semantics, but Vite has the larger ecosystem and the tighter test-runner story, and there is nothing webpack-specific in this repo to preserve.

## 3. Settled scope decisions

Answered by the repository owner before Phase 2 started. Treat these as settled; do not relitigate them inside a task.

1. **Backend posture: keep the API, stub at the network edge.** The app keeps talking to the Todo-Backend over HTTP. CRA's `package.json` `proxy` becomes Vite `server.proxy`. E2E QA procedures drive the real UI with the network boundary stubbed (Playwright route interception). No offline mode, no local persistence, no removal of `callAPIMiddleware`.
2. **Routing: none.** The visibility filter stays in Redux state. No hash routes, no router dependency, no deep linking. Do not add routing under any task.
3. **Refactor depth: hooks only, reducers kept.** `connect()` containers become `useSelector` / `useDispatch`; the two class components become function components; `prop-types` goes. The hand-written switch reducers, the plain action creators, and `callAPIMiddleware` stay as they are. No `createSlice`, no `createAsyncThunk`, no RTK Query.
4. **Deployment: out of scope.** CI builds, lints, typechecks, and runs the test tiers. No publishing step, no hosting target.

## 4. Shared conventions

Every role in every task works to these. They are project-manager decisions, not task-level ones.

- **Acceptance pipeline (APS).** `github.com/unclebob/Acceptance-Pipeline-Specification`. Babashka is not available in this environment; the Go fallback binaries build cleanly from that repo with the Go toolchain present at `/usr/local/go/bin/go`. Vendor a bootstrap script that fetches and builds `gherkin-parser`, `gherkin-ir-dry-checker`, and `gherkin-mutator` into a gitignored `bin/` directory. Never reimplement those tools.
- **Directory layout.** Feature files in `features/`. Parser IR and generated entry points under `build/acceptance/` (gitignored). Acceptance mutation output under `build/acceptance-mutation/` (gitignored). Project-written pipeline parts (entrypoint generator, runtime, step handlers, runner adapter) under `acceptance/`.
- **E2E QA procedures live in `qa/`,** one Markdown file per behavior area, procedures lettered so QA can cite them.
- **Build output is `dist/`.**
- **Scenario-name comments.** A comment line carrying the scenario name goes immediately before each `Scenario:`.
- **Test tiers, separate commands.** `npm test` runs unit tests only. `npm run test:acceptance` runs parse -> generate -> execute. `npm run test:property` runs property tests. `npm run test:mutation` runs language mutation. `npm run test:e2e` runs the QA-owned E2E tests. Generated acceptance tests never live beside unit tests.
- **Tooling picks, to be introduced by whichever role first needs them.** Language mutation: Stryker (`@stryker-mutator/core` with its Vitest runner). Property tests: `fast-check`. E2E: `@playwright/test`, using the preinstalled Chromium at `/opt/pw-browsers` (`PLAYWRIGHT_BROWSERS_PATH` is already set; never run `playwright install`). CRAP has no off-the-shelf JS tool: a small `scripts/crap.mjs` computing cyclomatic complexity against Vitest coverage is expected, first written by the task 01 cleaner and reused thereafter.
- **Project self-checks live under `scripts/`,** as tested packages (`scripts/crap/`, `scripts/architecture/`), alongside the CLI shells that invoke them. `scripts/` means the project's own tooling; a checker is tooling, not application code.
- **CRAP gate is <= 10** on changed files, per the shared definitions handed to each role.
- **A server started through `npm run <script>` releases its port after the `npm` process exits, not with it.** Anything asserting a port is free must wait for it, bounded, rather than sampling once. Found in task 01 as an intermittent E2E failure that passed on isolated re-runs.
- **Vite decides production-ness from `process.env.NODE_ENV`, not from `mode`,** and Vitest sets `NODE_ENV=test`. Driving a Vite build from inside a test runner silently produces a development bundle.
- **Test every instrument in the failing direction.** Three times in task 01 the defect was in a check rather than in the product: a coverage tier that measured but was never merged, `PACKAGES = []` making a spec pass vacuously, and a mutation manifest whose `implementation_hash` did not cover the implementation. A check that cannot fail is worth less than no check, because it also suppresses the search for one. Before trusting a green result, break the thing under test and confirm the check goes red.
- **Carried work:** `scripts/acceptance-mutation.ts` and the language-mutation runner both hold stamp logic that no test tier judges, the same gap that was closed for `scripts/crap.mjs`. Owned by the task 02 Cleaner.
- **Mutation manifests** live under `.mutation/` and are committed. Never hand-edit them; preserve them across file splits.
- **Node 22.x**, matching CI.

## 5. Tasks

| # | Task | File | Status |
| --- | --- | --- | --- |
| 01 | Replace CRA with Vite and Vitest | (file deleted) | done |
| 02 | Replace shallow-renderer tests with Testing Library | `tasks/02-testing-library-suite.md` | in progress |
| 03 | Upgrade to React 19 | `tasks/03-react-19.md` | pending |
| 04 | Replace connect() containers with hooks | `tasks/04-hooks-replace-connect.md` | pending |
| 05 | Convert class components to function components | `tasks/05-function-components.md` | pending |
| 06 | ESLint flat config, typecheck, and CI | `tasks/06-lint-typecheck-ci.md` | pending |

### Ordering rationale

01 first: nothing else can be verified until the project builds and tests without `react-scripts`. It also stands up the acceptance pipeline, because every later task's coder and QA need it to exist.

02 before 03: `react-shallow-renderer` asserts on unrendered element trees and has no React 19 story. The suite has to be rewritten against rendered output before the React upgrade, or the upgrade lands with no working component tests.

03 before 04 and 05: the hooks and function-component refactors should be written once, against the React version they will ship on.

04 before 05: removing `connect()` settles how components receive state and dispatch, which changes the props the two class components are converted against.

06 last: the lint rules and CI gates codify the shape the code has by then. Running it earlier means writing rules against code that is about to change.

## 6. Task lifecycle

- No task starts before the previous one passes QA.
- No role is skipped. A role with nothing to do runs, says so in its handoff note, and hands off.
- When a task passes QA, its row above is marked `done` and its `tasks/NN-*.md` file is deleted.
- When every task is done, `PLAN.md` and `tasks/` are deleted.
