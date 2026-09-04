# Task 02: Migrate component tests off react-shallow-renderer

**Track:** Tooling
**Chain:** coder -> QA
**Status:** pending

## Goal

Replace every `react-shallow-renderer` assertion with a `@testing-library/react` assertion against rendered output, keeping the same behavior under test. This unblocks both Vitest and React 19, neither of which supports shallow rendering.

## Context

Eight suites use `createRenderer()` from `react-shallow-renderer` and assert on React element trees: `App`, `Footer`, `Header`, `Link`, `MainSection`, `TodoItem`, `TodoList`, `TodoTextInput`. Two suites (`actions/index.spec.ts`, `reducers/todos.spec.ts`) are plain and stay as they are.

`@testing-library/react` 14 and `@testing-library/dom` 10 are already installed.

`react-shallow-renderer` is declared via `src/react-shallow-renderer.d.ts`.

## Scope

- Rewrite the eight shallow-render suites against Testing Library, asserting on rendered DOM.
- Where a shallow suite asserted that a child element's `type` was a particular component (`App.spec.tsx` does this for `Header` and `MainSection`), replace it with an assertion on what that component renders. Connected containers need a `Provider` with a real store.
- Remove `react-shallow-renderer` from dependencies and delete `src/react-shallow-renderer.d.ts`.
- Keep the tests running under the current `react-scripts test`. Do not change the runner in this task.

## Out of scope

- Any change under `src/` other than the `.spec` files and the deleted `.d.ts`. Component and application source stays byte-identical.
- Changing the test runner, the bundler, TypeScript, or React versions.
- Adding tests for behavior the old suites did not cover. Coverage work belongs to later tasks.

## Done criteria

- No reference to `react-shallow-renderer` remains anywhere in the repository, including `package.json` and `package-lock.json`.
- `npx react-scripts test --watchAll=false` passes.
- Every assertion in the old suites has a counterpart asserting the same observable behavior. If an assertion has no meaningful counterpart because it only inspected internals, drop it and list it in the handoff with the reason.
- `npx react-scripts build` compiles.
- No file under `src/` other than `*.spec.tsx` differs from the previous commit.

## Handoffs

### Coder

### QA
