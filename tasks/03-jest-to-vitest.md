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
