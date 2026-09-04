# Task 08: Dependency hygiene and CI release checks

**Track:** Tooling
**Chain:** coder -> QA
**Status:** pending

## Goal

Close out the tooling track: remove dependencies nothing uses, and make CI run every check the project now has.

## Context

`.github/workflows/nodejs.yml` runs `actions/checkout@v1` and `actions/setup-node@v1`, both long superseded, on a single-entry Node 22 matrix. It runs `npm ci`, `npm run build`, and `npm test`. It does not lint, does not typecheck, and does not run the E2E regression suite.

Dependency debt still standing after tasks 02 through 07:

- `redux-thunk` is a direct dependency but nothing imports it. Redux Toolkit's `configureStore` includes thunk in its default middleware.
- `reselect` is a direct dependency; `@reduxjs/toolkit` re-exports `createSelector`.
- `@types/classnames` is present, but `classnames` has shipped its own types for years.
- `@types/jest` and `@types/node` may be unused after task 03 and task 05.

`README.md` still documents `npm run eject` and describes the project as a Create React App template.

## Scope

- Remove every dependency nothing imports. Verify by search, not by assumption, and name what you checked in the handoff.
- Rewrite the workflow: current `actions/checkout` and `actions/setup-node` majors, npm caching, and steps running install, lint, format check, typecheck, unit tests, production build, and the E2E regression suite against the built app.
- Choose the Node version matrix deliberately and say why in the handoff.
- Rewrite `README.md` to describe the actual stack and the actual commands.

## Out of scope

- Adding a hosting deployment. The repository has none today and adding one is new behavior.
- Upgrading dependencies that are merely not-newest. This task removes the unused; it does not chase versions.
- Any change under `src/` beyond deleting imports of removed dependencies.

## Done criteria

- Every remaining dependency is imported somewhere, or is a tool invoked by a script, and the handoff says which.
- The workflow runs lint, format check, typecheck, unit tests, build, and the E2E suite, and passes.
- All local commands pass: `npm run lint`, the format check, `npm run typecheck`, `npm test`, `npm run build`, `npm run preview`, and the regression suite.
- `README.md` contains no reference to Create React App, `react-scripts`, or `eject`, and every command it documents exists.

## Handoffs

### Coder

### QA
