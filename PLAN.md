# React Modernization Plan

## Baseline recorded 2026-09-04

Verified on the unmodified repository at `66d36ad`:

- `npx react-scripts test --watchAll=false` -> 10 suites, 54 tests, all pass.
- `npx react-scripts build` -> compiles, 56.9 kB gzipped JS.

### What exists

| Concern | Current state |
| --- | --- |
| Build tooling | Create React App, `react-scripts` 5.0.1. No config files, no eject. |
| React | 18.3.1 with `createRoot` and `StrictMode`. `src/index.tsx` is the entry. |
| Routing | None. No `react-router`. Filters live in Redux state, not the URL. |
| State | Redux 5 + `@reduxjs/toolkit` 2.10.1 `configureStore`, but hand-written switch reducers, no `createSlice`. `connect()` HOC containers, no react-redux hooks. `reselect` 4 for two selectors. |
| Data fetching | Bespoke `callAPIMiddleware` firing `fetch` at `api/todos/`, dispatching REQUEST/SUCCESS/FAILURE triples. CRA dev-server `proxy` points at `http://localhost:4000` (todo-backend-express). `redux-thunk` is a dependency but never used directly. |
| Tests | Jest via `react-scripts test`. 8 of 10 suites use `react-shallow-renderer`, which asserts on React element trees rather than rendered output. `@testing-library/react` 14 is installed and used by two suites. |
| Lint / format | None standalone. Only the `eslint-config-react-app` pass baked into `react-scripts`. `eslint-plugin-jsx-a11y` is a devDependency that nothing reads. No Prettier. |
| TypeScript | 3.9.2, six years stale. `target: es5`, `jsx: "react"`, `moduleResolution: "node"`. |
| Deployment | `.github/workflows/nodejs.yml` runs `npm ci`, build, test on Node 22. No deploy step, no lint step, no typecheck step. |

### Known defects carried by the baseline

Recorded so later tasks preserve them deliberately or fix them deliberately, never by accident:

- `src/reducers/apis.ts` has a stray `console.log('action', action)` in the PATCH/DELETE request branch.
- `RootState` in `src/containers/index.ts` is hand-declared and omits `errorMessage` and `exec`, so those two reducers' state is unreachable through the typed selector surface.
- Nothing in the UI reads `errorMessage` or `exec`. Loading and failure are invisible to the user.
- `prop-types` runtime checks duplicate the TypeScript prop interfaces on `Footer`, `TodoItem`, `TodoTextInput`.
- `resolutions` in `package.json` is a Yarn field and has no effect under npm.

## Decisions

**Replacing Create React App with Vite.** CRA is archived and `react-scripts` 5.0.1 pins a webpack 5 / Babel 7 / Jest 27 stack whose transitive dependencies no longer receive fixes. Vite is the migration path CRA's own deprecation notice points to. It reads the existing `src/index.tsx` entry with one plugin, needs no Babel config for TS + JSX, and shares its config and module graph with Vitest, so the test runner and the bundler resolve modules identically. The alternatives were considered and rejected: Next.js changes the application model to file routing plus a server and would not preserve behavior; Parcel and Rsbuild both work but neither brings a test runner that shares the bundler's resolution.

**Vitest replaces Jest.** It reads `vite.config.ts`, so path resolution, JSX handling, and env handling match the app build exactly. Its API is Jest-compatible enough that the assertion bodies survive the move.

**React 19.** Confirmed with the requester. Forces two things that are due anyway: `react-shallow-renderer` has no React 19 build, and React 19 ignores `propTypes`.

**TypeScript 5.x, not 7.0.** Confirmed with the requester. Broadest support across Vite, Vitest, and typescript-eslint.

**No router.** Confirmed with the requester. Adding hash routes would change the URL, the back button, and deep linking, all user-visible. Out of scope for a behavior-preserving modernization.

**E2E runs against a stub backend in `qa/`.** Confirmed with the requester. Every mutation in this app round-trips to `api/todos/`, so an offline suite could only characterize filters, toggle-all, and clear-completed. A small in-repo fake implementing the todo-backend contract makes data loading, mutation, and error states testable without Docker and runs unattended in CI.

## Track definitions

**Tooling** changes how the app is built, tested, linted, typed, or run, without changing the application's module structure.
Chain: coder -> QA. The architect is inserted between them only where noted, when the task moves files or changes import paths as a side effect.

**Structural** changes how the application's own code is organized, moving logic out of components into testable modules.
Chain: specifier -> coder -> cleaner -> architect -> QA. The hardener is inserted between architect and QA only where noted, when the task creates or changes a testable module.

## Tasks

Serial. Each task assumes every earlier task is merged.

| # | Task | Track | Chain | Status |
| --- | --- | --- | --- | --- |
| 01 | Characterize current behavior | Characterization | specifier -> QA | **done** |
| 02 | Migrate component tests off react-shallow-renderer | Tooling | coder -> QA | **done** |
| 03 | Migrate Jest to Vitest | Tooling | coder -> QA | **done** |
| 04 | Replace react-scripts with Vite | Tooling | coder -> architect -> QA | in progress |
| 05 | TypeScript 3.9 to 5.x and modern tsconfig | Tooling | coder -> QA | pending |
| 06 | ESLint 9 flat config and Prettier | Tooling | coder -> QA | pending |
| 07 | React 18 to 19 and remove prop-types | Tooling | coder -> QA | pending |
| 08 | Dependency hygiene and CI release checks | Tooling | coder -> QA | pending |
| 09 | Extract the todo API client into a testable module | Structural | specifier -> coder -> cleaner -> architect -> hardener -> QA | pending |
| 10 | Replace callAPIMiddleware with RTK slices and thunks | Structural | specifier -> coder -> cleaner -> architect -> hardener -> QA | pending |
| 11 | Convert class components to functions and extract their input rules | Structural | specifier -> coder -> cleaner -> architect -> hardener -> QA | pending |
| 12 | Replace connect() containers with react-redux hooks | Structural | specifier -> coder -> cleaner -> architect -> hardener -> QA | pending |
| 13 | Move UI-derived observables into domain selectors | Structural | specifier -> coder -> cleaner -> architect -> hardener -> QA | pending |

### Why this order

Tooling precedes structural work so the structural tasks land on a modern runner and typechecker rather than churning twice.

Within tooling, task 02 comes first because `react-shallow-renderer` blocks both Vitest and React 19, and rewriting those suites while the rest of the stack is unchanged isolates the variable. Task 03 precedes 04 because `react-scripts` supplies both the test runner and the bundler; moving the runner off it first means task 04 has a working test command to verify against. Task 05 follows 04 so the TypeScript bump is not constrained by `react-scripts`' pinned fork-ts-checker. Task 06 follows 05 because typescript-eslint needs the new compiler. Task 07 needs 02 and 03 merged. Task 08 closes out tooling once every command it must run in CI exists.

Within structural work, task 09 gives 10 a client to call, 10 settles the state shape that 11 and 12 read, and 13 is last because it can only ask domain functions for observables once those functions own the state.

### Architect and hardener placement

- Task 04 gets the architect: Vite requires `index.html` at the project root with a module script tag and replaces `react-app-env.d.ts` with `vite-env.d.ts`. Those are file moves and import-path changes forced by the tooling. (An earlier draft of this line also cited an env-variable prefix change. That was wrong: nothing in `src/` reads a `REACT_APP_` variable or `process.env` at all, so no prefix migration existed. Task 04's architect caught it.)
- Tasks 02, 03, 05, 06, 07, 08 do not get the architect: they change configuration, dependencies, and test bodies, not module boundaries.
- Tasks 09 through 13 all get the hardener: each creates or changes a testable module. 09 creates the API client, 10 creates slice reducers, 11 creates the text-input rules module, 12 changes the selector input type, 13 changes the selectors themselves.

## The regression bar

Task 01 produced `qa/procedures/`: 21 procedures and 22 executable Playwright
cases, green against the unmodified repository. `npm run test:e2e` builds the
app, starts the stub backend, runs the suite, and stops the stub. No Docker, no
manually started backend.

Every task from 02 onward must leave that suite passing. A procedure and its
test change together and only QA touches them.

Two behaviors the suite records but cannot pin tighter, because the app renders
nothing at the moment they happen: toggle-all and clear-completed issue no
request at all, and a failed request produces no UI at all. If any task adds a
loading or error indicator, that is a behavior change; the specifier rewrites
procedures 16 to 20 first, and the task stops and asks before proceeding.

## Out of scope for the whole plan

- Adding a router or URL-driven filters.
- Adding a hosting deployment. The repository has none today; adding one is new behavior, not modernization.
- Changing what the user sees. Every task in this plan preserves observable behavior. If a task cannot, it stops and asks.
