# Task 07: React 18 to 19 and remove prop-types

**Track:** Tooling
**Chain:** coder -> QA
**Status:** pending

## Goal

Move the app to React 19 and drop the `prop-types` runtime checks that React 19 no longer honours.

## Context

React and react-dom are at 18.3.1. `src/index.tsx` already uses `createRoot` and `StrictMode`, so the React 18 root API migration is done.

React 19 ignores `propTypes`. Three components declare them, duplicating their TypeScript prop interfaces: `Footer`, `TodoItem`, `TodoTextInput`.

Task 02 removed `react-shallow-renderer`, which has no React 19 build. That is why this task comes after it.

`@testing-library/react` 14 predates React 19 and will need a bump.

## Scope

- Bump `react`, `react-dom`, `@types/react`, `@types/react-dom` to 19.
- Bump `@testing-library/react` to a version that supports React 19.
- Delete every `propTypes` declaration and remove the `prop-types` dependency. The TypeScript interfaces already state the same contracts.
- Fix whatever the bump breaks: type changes in `@types/react` 19, any removed API the code touches, any test that asserted on React 18 behavior.

## Out of scope

- Adopting React 19 features. No `use`, no Actions, no `useOptimistic`, no compiler. This task changes the version, not the idioms.
- Converting class components to functions. `TodoItem` and `TodoTextInput` stay classes here; that is task 11.
- Changing state management, data fetching, or component structure.

## Done criteria

- `npm test` passes with the same test count.
- `npm run typecheck`, `npm run lint`, and `npm run build` all pass.
- The regression suite from `qa/procedures/` passes, and the app behaves identically in the browser.
- No `prop-types` import and no `propTypes` assignment remains, and the dependency is gone.
- No console warnings in the browser that were not there on React 18. If any remain, list them in the handoff.

## Handoffs

### Coder

### QA
