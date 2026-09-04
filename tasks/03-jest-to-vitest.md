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

### QA
