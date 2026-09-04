# Task 03: Upgrade to React 19

Status: pending

## Goal

The project runs on current React (19.x) with matching `@types/react` and `@types/react-dom`, and no deprecated-in-19 APIs remain.

## Scope

- Upgrade `react`, `react-dom`, `@types/react`, `@types/react-dom` to current 19.x. The `resolutions` pin on `@types/react` was already removed as dead configuration by the task 01 Cleaner, so there is nothing to unpin here.
- Upgrade `react-redux` and any other React-peer dependency to a version that supports React 19.
- Fix what React 19 breaks: removed APIs, the stricter `@types/react` 19 typings (notably that `children` is no longer implicit on `React.FunctionComponent`), and any ref or `propTypes` handling React 19 no longer supports on function components.
- Confirm StrictMode double-invocation does not produce duplicate `loadTodos` requests; if it does, that is behavior this task must fix.

## Out of scope

- Adopting new React 19 features (Actions, `use`, `useOptimistic`, the compiler). This is a version upgrade, not a feature adoption.
- Removing `connect()`. Task 04.
- Converting class components or removing `prop-types` wholesale. Task 05. This task removes only what React 19 forces.
- Routing, RTK slices, deployment.

## Done criteria

1. `react` and `react-dom` are on 19.x with matching types, and `npm ls` reports no unmet or conflicting React peer dependencies.
2. `npm test`, `npm run test:acceptance`, and `npm run build` all pass.
3. TypeScript compiles with no errors.
4. No React deprecation or StrictMode warnings appear in the dev server console or the test output.
5. The E2E QA procedures pass when QA executes them.

## Handoffs

### Specifier

### Coder

### Cleaner

### Architect

### Hardener

### QA
