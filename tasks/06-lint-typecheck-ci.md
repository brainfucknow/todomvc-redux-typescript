# Task 06: ESLint flat config, typecheck, and CI

Status: pending

## Goal

The project lints and typechecks by explicit command, with rules it owns rather than rules CRA used to supply, and CI runs every gate the project has.

## Scope

- Add a flat-config ESLint setup (`eslint.config.js`) with `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, and `eslint-plugin-jsx-a11y` (already a dependency, currently unreachable). Fix the violations the new rules surface in project code.
- Add `npm run lint` and `npm run typecheck`.
- Rewrite `.github/workflows/nodejs.yml`: current action versions (`actions/checkout@v4` or later, `actions/setup-node@v4` or later), npm caching, Node 22.x, and steps for lint, typecheck, unit tests, acceptance tests, property tests, and build. E2E runs in CI if it can do so reliably against the stubbed network boundary; if it cannot, say why in the handoff note rather than adding a flaky job.
- Add whatever dependency-direction, forbidden-import, or cycle check the architect established in earlier tasks to the lint run, so the boundary rules are enforced rather than documented.
- Update `README.md` to describe the real command set.

## Out of scope

- Any deployment or publishing step. Settled out of scope in `PLAN.md` section 3.
- Behavior changes. Lint fixes in this task are mechanical and behavior-preserving; anything that would change behavior is a finding for the handoff note, not an edit.
- Reformatting the entire tree. Fix what the rules flag; do not run a formatter across untouched files.

## Done criteria

1. `npm run lint` and `npm run typecheck` both pass with zero errors and zero warnings.
2. The CI workflow runs lint, typecheck, unit, acceptance, property, and build, and is green.
3. `npm test`, `npm run test:acceptance`, `npm run test:property`, `npm run test:mutation`, and `npm run build` all pass locally.
4. `README.md` documents every script the project has and no script it does not have.
5. The E2E QA procedures pass when QA executes them.

## Handoffs

### Specifier

### Coder

### Cleaner

### Architect

### Hardener

### QA
