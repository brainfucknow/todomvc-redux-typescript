# Task 04: Replace react-scripts with Vite

**Track:** Tooling
**Chain:** coder -> architect -> QA

The architect is in this chain because Vite forces file moves and import-path changes. The architect's job here is narrowed: review only the moves and boundary changes the tooling forced, and record extraction candidates in the note rather than acting on them.

**Status:** pending

## Goal

Build, serve, and preview the app with Vite. Remove `react-scripts` from the repository.

## Context

Create React App is archived. `react-scripts` 5.0.1 pins a webpack 5 / Babel 7 stack whose transitive dependencies no longer receive fixes.

Vite config already exists from task 03 and carries the Vitest settings. This task extends it to build the app.

Things `react-scripts` does today that must keep working:

- Serves `public/index.html` with the bundle injected, on port 3000.
- Proxies unmatched requests to `http://localhost:4000`, configured by the `proxy` field in `package.json`. The app fetches relative paths like `api/todos/`, so this proxy is load-bearing in development.
- Provides ambient types via `/// <reference types="react-scripts" />` in `src/react-app-env.d.ts`.
- Serves `todomvc-app-css/index.css`, imported from `src/index.tsx`.
- Reads `REACT_APP_`-prefixed env variables. Nothing in `src/` reads any today; confirm that before deciding what to migrate.

## Scope

- Move `public/index.html` to the project root and add the module script tag pointing at `src/index.tsx`. Keep the `<div class="todoapp" id="root">` element and the page title exactly as they are.
- Replace `src/react-app-env.d.ts` with a Vite equivalent.
- Move the dev proxy from the `package.json` `proxy` field into the Vite server proxy config, preserving the same target and the same set of proxied paths.
- Add `npm run build`, `npm start` or `npm run dev`, and `npm run preview` scripts.
- Add `npm run typecheck` running `tsc --noEmit`, since Vite does not typecheck during build and `react-scripts` did.
- Remove `react-scripts` and any dependency that only existed to serve it.
- Update `.gitignore` for Vite's output directory if it differs from `build/`.
- Confirm `npm run test:e2e` still runs. The E2E stub serves the built app from `build/`, falling back to `dist/`, and honours a `QA_APP_DIR` override, so the command is expected to survive the output-directory change. Confirm that; do not assume it. The stub and the tests belong to QA: if the command needs a change, QA makes it, not the coder.
- Update `README.md` where it documents CRA commands and `npm run eject`.
- Decide `"type": "module"` in `package.json`. Vite 8 prints a deprecation warning on every run because `vite.config.ts` is ESM loaded as CJS. Task 03 left this alone deliberately: setting it changes how `react-scripts` and `qa/playwright.config.ts` load, and `react-scripts` is still present there. It is gone by the time you run, so settle it here. If setting it breaks `qa/playwright.config.ts`, that file is QA's; stop and report rather than editing it.

## Out of scope

- Changing any application logic. `src/**/*.tsx` and `src/**/*.ts` change only where the tooling forces it: the entry file's imports, and the ambient type declaration file.
- Extracting logic out of components. If you see candidates, record them; do not act.
- Changing React, TypeScript, or lint tooling versions.
- Adding a deployment target.

## Done criteria

- `npm run build` produces a production bundle with no `react-scripts` involved.
- `npm run preview` serves that bundle and the app works in it.
- `npm run dev` serves the app and its proxy reaches a backend on port 4000.
- `npm run typecheck` passes.
- `npm test` passes with the same test count as before.
- The regression suite from `qa/procedures/` passes against the dev server and against the preview server.
- No occurrence of `react-scripts` remains in the repository.
- The architect's note lists any extraction candidates seen, for the project manager to plan as structural tasks.

## Handoffs

### Coder

### Architect

### QA
