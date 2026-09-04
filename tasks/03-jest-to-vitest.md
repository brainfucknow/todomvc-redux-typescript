# Task 03: Migrate Jest to Vitest

**Track:** Tooling
**Chain:** coder -> QA
**Status:** in progress

## Goal

Run the unit suite on Vitest instead of the Jest instance bundled inside `react-scripts`, so the next task can remove `react-scripts` without losing the ability to test.

## Context

`react-scripts` supplies both the test runner and the bundler. Detaching the runner first leaves task 04 a working `npm test` to verify against.

Vitest reads `vite.config.ts`. Introducing that file here is expected and is what task 04 will build on for the app bundle.

## Scope

- Add `vitest`, `@vitejs/plugin-react`, `vite`, and a jsdom environment.
- Add `vite.config.ts` carrying the Vitest configuration: jsdom environment, globals matching the Jest globals the suites already use, a setup file wiring `@testing-library/jest-dom` if the suites need its matchers, and the include pattern for `src/**/*.spec.{ts,tsx}`.
- Point `npm test` at Vitest in run mode, non-watching, suitable for CI.
- Adjust test bodies only where the Jest and Vitest APIs genuinely differ, for example `jest.fn` to `vi.fn`. Prefer configuring Vitest to accept the existing API over editing many call sites.
- Remove `@types/jest` if nothing needs it.
- Absorb the DRY findings task 02's QA recorded but was forbidden to fix, because that task's done criteria allowed no new file under `src/`. Three suites each build their own store, three each spell their own return-key press, and two each stub `fetch`. Put those in shared test helpers and have the suites use them. Keep the helpers out of the application's module graph: nothing under `src/` that ships may import them, and they must not be reachable from `src/index.tsx`.
- Leave `react-scripts` installed and leave `npm run build` and `npm start` pointed at it.

## Out of scope

- Replacing the bundler. `npm run build` and `npm start` still run `react-scripts` when this task ends.
- Moving `index.html`, changing the entry layout, or changing env variable prefixes. That is task 04.
- Changing any application source under `src/` that is not a `.spec` file. New test-only helper files are the single exception, and only for the DRY work named in scope above; no shipping module may import them.
- Changing what the tests assert.

## Done criteria

- `npm test` runs Vitest and reports the same suites and the same test count as the Jest baseline of 10 suites and 55 tests, all passing.
- `npm run build` still compiles via `react-scripts`.
- The regression suite from `qa/procedures/` passes.
- No application source changed. The production build's main chunk still hashes `main.1875e386.js` at 56.9 kB gzipped, as it has since task 01.
- The store, return-key, and `fetch`-stub duplication is gone, and no shipping module imports a test helper.

## Handoffs

### Coder

**What changed**

- Added `vitest` 5.0.0, `vite` 8.2.2, `@vitejs/plugin-react` 6.1.1 and `jsdom` 30.0.1 as devDependencies.
- Added `vite.config.ts` at the repository root: `@vitejs/plugin-react`, and a `test` block with
  `environment: 'jsdom'`, `globals: true`, and `include: ['src/**/*.spec.{ts,tsx}']`. The config is
  imported from `vitest/config` so the `test` key is typed. No setup file: the suites assert on plain
  DOM properties and never use a `@testing-library/jest-dom` matcher, and that package is not in the
  project, so there was nothing to wire. `globals: true` also gives `@testing-library/react` 14 the
  global `afterEach` it needs to auto-cleanup, which is what Jest was giving it before.
- `npm test` is now `vitest run`. Run mode, no watch, so CI's `npm test` under `CI: true` is unchanged
  in shape. `npm start` and `npm run build` still run `react-scripts`.
- Removed `@types/jest`. Added `"types": ["vitest/globals"]` to `tsconfig.json` so the specs' global
  `describe`/`it`/`expect`/`beforeEach`/`vi` still resolve. TypeScript 3.9 parses `vitest/globals`
  without complaint (checked with `tsc --noEmit`: no diagnostic under `src/`).
- API differences edited at the call sites, nothing more: `jest.fn(` -> `vi.fn(` in six specs. The
  assertion aliases the suites use (`toBeCalled`, `toBeCalledWith`) exist in Vitest, so no assertion
  was rewritten and no assertion changed meaning.
- Absorbed task 02's three deferred DRY findings into `src/test-support/`, one job per file:
  - `store.tsx` - `createTestStore()` (root reducer + `callAPIMiddleware`) and
    `renderWithStore(ui, store?)`. `App.spec`, `Footer.spec` and `MainSection.spec` use it; `Footer`
    passes its own store because it dispatches `setVisibilityFilter` before rendering.
  - `keyboard.ts` - `pressReturn(input)`, used by `Header.spec`, `TodoItem.spec` and
    `TodoTextInput.spec`.
  - `fetch.ts` - `stubPendingFetch()`, the never-settling `fetch`, used by `App.spec` and
    `MainSection.spec` as `beforeEach(stubPendingFetch)`.
  Nothing outside a `.spec` file imports `src/test-support/`; the directory is unreachable from
  `src/index.tsx`, which the unchanged bundle hash confirms.
- Bumped `@types/node` from `^13.13.6` to `^22.19.1` (resolves 22.20.1). This was forced, not
  opportunistic: every Vite version declares `@types/node` as an optional peer with a floor far above
  13, so `npm ci` failed with `ERESOLVE` while the old range stood, which would have broken the CI
  workflow. `@types/node` was CRA boilerplate that nothing under `src/` imports, and with the
  `types` array now set it is no longer auto-included in the compilation either. `npm install` and
  `npm ci` both resolve strictly, with no `--legacy-peer-deps` and no `.npmrc`.

**Verified**

- `npm test` -> Vitest, 10 test files, 55 tests, all passing. Same ten files as the Jest baseline
  (`CI=true npx react-scripts test --watchAll=false`, re-run here before any change: 10 suites, 55
  tests). Vitest's `include` keeps `qa/tests/*.spec.ts` out of the unit run.
- `npm run build` -> `react-scripts`, compiled successfully, `build/static/js/main.1875e386.js`
  at 56.9 kB gzipped and `main.344fbdf7.css` at 1.76 kB: the same chunk hash the build has produced
  since task 01.
- `npm run test:e2e` -> 22 passed, unchanged. Nothing under `qa/` was touched.
- `npm ci --dry-run` -> resolves.
- `npx tsc --noEmit` -> no diagnostic under `src/`. (Raw `tsc` still reports parse errors inside
  `node_modules/@reduxjs/toolkit`; that predates this task, TypeScript 3.9 cannot read those
  declarations, and `react-scripts`' checker filters diagnostics to `**/src/**`. Task 05 clears it.)
- `git diff --stat` -> only the eight `*.spec.tsx`, `package.json`, `package-lock.json`,
  `tsconfig.json`, plus the new `vite.config.ts` and `src/test-support/`. No application source
  differs. `grep -rn jest src/` returns nothing.

**Left for the next role**

- `react-scripts`, its bundled Jest 27, and `@testing-library/*` are all still installed. Removing
  the runner half of `react-scripts` is task 04's business, not this task's.
- Vite 8 prints one warning on every `vitest run`: `vite.config.ts` uses ESM syntax but loads as
  CommonJS, because the root `package.json` has no `"type": "module"`. It is a
  forward-compatibility warning about a future default config loader, not an error, and the run is
  unaffected. Adding `"type": "module"` would change how `react-scripts` and
  `qa/playwright.config.ts` load, so it belongs to task 04 along with the rest of the bundler move.
- `tsconfig.json`'s new `types: ["vitest/globals"]` narrows automatic `@types` inclusion to that one
  package. Nothing under `src/` needed the others, but task 05 should revisit the array when it
  rewrites the tsconfig.
- `resolutions` is still the inert Yarn field `PLAN.md` records; untouched here.

No open questions.

### QA

**Verified**

All commands run from a clean tree at `2bd9508`, after a real `npm ci`.

- `npm ci` (not `--dry-run`) -> 1775 packages, exit 0. No `.npmrc` anywhere, `legacy-peer-deps=false`.
- `CI=true npm test` -> Vitest 5.0.0, 10 test files, 55 tests, all passing. Re-run three times across the
  session, same numbers.
- `CI=true npm run build` -> `react-scripts`, compiled successfully,
  `build/static/js/main.1875e386.js` at 56.9 kB gzipped, `main.344fbdf7.css` at 1.76 kB. The task 01
  baseline hash, unchanged.
- `npm run test:e2e` -> 22 passed. Nothing under `qa/` is modified; `git status --short qa/` is empty.
  The 21 procedures still describe what the 22 cases assert, because no observable behavior changed,
  so no procedure needed rewriting and none was touched.
- `npx tsc --noEmit` -> 20 errors, all 20 in `node_modules/@reduxjs/toolkit/dist/index.d.ts`, none
  under `src/` or `qa/`. Pre-existing: I ran the same command against a worktree at `af2058e`
  (task 02's end state) and the same RTK parse errors appear there. The new `types` array is in fact
  a large reduction in tsc noise, from ~1980 errors to 20, because it stops `@types/node` 22 and the
  CRA `@types/*` tree from being auto-included under TypeScript 3.9.
- `git diff af2058e HEAD --name-only -- src/` lists only `*.spec.tsx` and `src/test-support/`. No
  application source changed anywhere in this task.
- Only spec files import `src/test-support/`; `grep -c` for `createTestStore|renderWithStore|stubPendingFetch|pressReturn`
  in `build/static/js/*.js` returns 0.
- The three deferred DRY findings are gone: no spec calls `configureStore`, none spells a
  `keyCode: 13` keydown, none assigns `global.fetch`. `grep -rn jest src/` returns nothing and
  `@types/jest` is not installed.

**The runner swap did not weaken the suite**

Green counts matching is not evidence, so I checked three separate ways.

1. *Same tests.* Extracted every `describe`/`it` title from each spec at `af2058e` and from each spec
   now: byte-identical in all ten files. Same for the multiset of matcher names per file and the
   `expect(` count per file. Nothing was renamed, dropped, or silently converted. No `.only`,
   `.skip`, `xit` or `it.todo` anywhere.
2. *Same files running.* Ten `*.spec.*` files exist under `src/`; Vitest reports ten. `qa/tests/`
   stays out. A broken `include` cannot pass silently: `vitest run` with a filter matching nothing
   prints `No test files found` and exits 1.
3. *Still discriminating.* Eleven mutations of application source, each run against the specs that
   should catch it, each reverted afterwards. Ten killed, and every one of the ten spec files was
   killed by at least one mutation:
   - `TodoTextInput` ignores the return key -> kills 6 tests across `TodoTextInput`, `Header` and
     `TodoItem`. This is the one that matters most: it proves the shared `pressReturn` helper really
     presses return in all three suites.
   - `completeTodo(id, todo.completed)` instead of `!todo.completed` -> kills `TodoItem`, so
     `toBeCalledWith` still discriminates on argument values.
   - `Header` calls `addTodo` unconditionally -> kills `Header`, so `not.toBeCalled()` still fails
     when it should.
   - `Link` loses its `onClick`, `Footer` never renders the clear button, `MainSection`'s toggle-all
     is always unchecked, `TodoList` renders no rows, `App` drops `<Header/>`, `visibilityFilter`
     ignores `SET_VISIBILITY_FILTER` (this one goes through `createTestStore` + `renderWithStore`),
     `todos` reducer ignores `ADD_TODO`, `actions/local.addTodo` drops its text -> all killed.
   The eleventh mutation was mine, not a survivor: I mutated `src/actions/index.ts` while
   `actions/index.spec.ts` imports `./local` directly. Re-aimed at `local.ts` it was killed.
   `git status` is clean, so no mutation leaked.
4. *Auto-cleanup.* `globals: true` is load-bearing for `@testing-library/react` 14's `afterEach`
   cleanup, and a missing cleanup would leak DOM between tests without failing anything. I ran a
   throwaway two-test spec asserting the previous render is gone from `document.body`; it passed,
   then I deleted the file. Cleanup runs.

One honest caveat, not a defect: `stubPendingFetch` is no longer load-bearing. Removing
`beforeEach(stubPendingFetch)` from `App.spec` leaves it green, because Node 22's global `fetch`
exists inside Vitest's jsdom environment where Jest 27's jsdom had none. The stub is still installed
and still keeps the store from moving under an assertion, so behavior is identical; it just no longer
doubles as a crash guard. Nothing to change.

**The `@types/node` bump was necessary and sufficient**

Reproduced from a scratch directory holding the current `package.json` with only the `@types/node`
range altered, resolving fresh with `npm install --package-lock-only --dry-run`:

- `^13.13.6` -> `ERESOLVE`, real, exactly as reported.
- `^20.19.0` -> still `ERESOLVE`. Major 20 satisfies Vite but not Vitest.
- `^22.0.0` -> resolves.
- `^22.19.1` (what shipped) -> resolves; `npm ci` on the real tree succeeds with no flags.

So: necessary, and major 22 is the floor. One correction to the coder's note, which matters because
it was copied forward into `tasks/05-typescript-5.md`: the binding constraint is **Vitest**, not
Vite. `vite@8.2.2` asks for `@types/node@^20.19.0 || >=22.12.0`; `vitest@5.0.0` asks for
`^22.0.0 || >=24.0.0`. Vite alone would have been satisfied by a `^20` bump. The conclusion in both
task files is right and the range that shipped is right, only the reason named is too narrow. I did
not edit `tasks/05`; that file is not mine.

**Gate**

- CRAP <= 10 on changed files: measured cyclomatic complexity with ESLint's `complexity` rule
  (threshold 1, so every function reports) over `src/test-support/`, the eight specs and
  `vite.config.ts`. The maximum in the whole changed set is 2 (`TodoItem.spec`'s `setup(editing = false)`);
  everything else is 1. Every helper and every `setup()` is executed by the passing suite, so
  CRAP reduces to complexity. Nothing near the gate.
- DRY on changed files: the three named duplications are absorbed and I found no new one. What
  remains across specs is each suite's own `setup()` doing `Object.assign({...defaults}, propOverrides)`
  and returning `{props, container}`. I considered folding those together and rejected it: the prop
  shapes differ per component and a shared builder would have to take the shape the caller already
  knows. Leaving it.

**Release checks with no command in this repository**

Named rather than skipped:

- **Lint.** No `lint` script and no standalone ESLint config. Only the `eslint-config-react-app` pass
  baked into `react-scripts build`, which ran clean. Task 06 adds the real thing.
- **Preview.** No `preview` script. `react-scripts` has no preview mode; the E2E stub serves `build/`
  itself. Task 04 introduces it with Vite.
- **Gherkin / acceptance pipeline.** Absent, and correctly so. No `.feature` file, no APS tooling,
  no `gherkin-parser` or `gherkin-mutator` in the tree. Every mention of Gherkin in the repository is
  a forward-looking line in `tasks/09` through `tasks/13`. Task 09 is where the pipeline first
  becomes due.
- **Property tests.** Absent. No `fast-check` or equivalent.
- **`npm start`.** Fails in this container with
  `options.allowedHosts[0] should be a non-empty string` before compiling anything. Not a regression:
  I reproduced it identically from a worktree at `af2058e`. It is CRA 5 deriving `allowedHosts` from a
  LAN address that does not exist here, reached only because `package.json` sets `proxy`. Environmental
  and pre-existing; the task's done criteria do not cover it and I changed nothing. Worth knowing before
  task 04 touches the dev server.

**Result**

All done criteria met. `npm test` runs Vitest at 10 files / 55 tests, the build still compiles via
`react-scripts` to the unchanged `main.1875e386.js` at 56.9 kB gzipped, the 22-case E2E suite passes,
no application source changed, and the store / return-key / fetch-stub duplication is gone with no
shipping module importing a helper. No fix is owed to any role.

**Left for the next role**

- Task 04 owns the `"type": "module"` decision and the Vite 8 config-loader warning; the coder already
  wrote that into `tasks/04`. The warning prints on every `vitest run` and is cosmetic.
- Task 05 should read the `@types/node` correction above: the floor comes from Vitest's peer range,
  not Vite's. The instruction to leave the dependency alone still stands.
- `npm start` is broken in this environment for the pre-existing reason above. If task 04 wants to
  smoke-test the dev server it will need to deal with `allowedHosts`, which Vite handles differently.

**Open questions**

- One process note, for the project manager rather than the next role. My brief said to leave changes
  in the working tree and not commit. Partway through my verification the coder's working-tree changes
  appeared as commit `2bd9508` ("Run the unit suite on Vitest"), which I did not create. I verified the
  committed tree is byte-identical to what I had been testing and that no mutation of mine leaked into
  it, and the whole verification above was re-run against `2bd9508`. Flagging it only so the commit's
  provenance is not a surprise later. My own change is this handoff note, uncommitted.
