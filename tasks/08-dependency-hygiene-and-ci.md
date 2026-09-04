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
- `scripts/typecheck.mjs` has no test, and task 04's repairing coder judged that adding one there would have moved the unit suite's file and test counts, which that task's done criteria pinned. It belongs here: its own Vitest project in a Node environment, separate from the jsdom unit suite, driving the script's failure conditions. Add it, and keep the two projects' counts reportable separately so a later task can still pin either.
- `scripts/typecheck.mjs` must be trustworthy before CI depends on it. Task 04's architect found it returns a false green when `tsc` never runs: its error branch catches only a failure to spawn `npx`, so if `npx` spawns but cannot resolve `tsc`, that stderr is counted as a dependency diagnostic and the script reports `0 error(s) under src/` and exits 0. A repair landed before task 04 closed: the script now resolves the compiler through `typescript/package.json` and spawns it directly, so `npx` is out of the pipeline and cannot masquerade as a diagnostic, and it refuses to report success unless it parsed a complete report. Confirm it holds under CI's environment, where a missing binary is far likelier than it is locally.

  One hole is known and named rather than closed: a `typescript` that resolves, runs, exits 0 and prints nothing is indistinguishable from a clean compile from outside the process. Closing it needs a canary fixture, which a stub could also fake. Decide whether CI warrants that; if not, say so and leave it.
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
