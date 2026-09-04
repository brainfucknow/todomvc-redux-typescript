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

All eight shallow-render suites now render with `@testing-library/react` and assert on DOM.
`src/react-shallow-renderer.d.ts` is deleted and the dependency is out of `package.json` and
`package-lock.json`.

**Child-component-identity assertions replaced by rendered output**

| Old assertion | Counterpart |
| --- | --- |
| `App`: children `[0].type`/`[1].type` are the `Header`/`MainSection` containers | `header.header` with `h1` "todos" and `input.new-todo`; `section.main` containing `ul.todo-list` |
| `Footer`: `a.type` is `FilterLink`, `a.props.filter` is the i-th filter | link texts in order, plus a test that the link matching the store's `visibilityFilter` is the one with class `selected` |
| `Header`: `input.type` is `TodoTextInput` with `newTodo`, `placeholder` | `input.new-todo` with that placeholder |
| `MainSection`: `footer.type` is `Footer` with `completedCount` 1, `activeCount` 1 | rendered `footer.footer` reads "1 item left" and shows `button.clear-completed` |
| `MainSection`: `visibleTodoList.type` is `VisibleTodoList` | `ul.todo-list` is present |
| `TodoItem`: `input.type` is `TodoTextInput` with `text`, `editing` | `input.edit` with value "Use Redux" |
| `Footer`: `clear` is `false` when nothing completed | no `button.clear-completed` in the DOM |
| `MainSection`: filtering `false` children leaves one entry | `section.main` has exactly one child and it is `ul.todo-list` |

**Assertion dropped**

- `TodoList`: `expect(Number(todo.key)).toBe(filteredTodos[i].id)`. A React key is not observable
  in rendered output. What it protected -- one row per todo, in order, carrying that todo's data --
  is covered by asserting each `li`'s label text and checkbox state against `filteredTodos[i]`.

Everything else maps one-to-one.

**Fixture changes forced by real rendering**

- `TodoList.spec.tsx` adds `loadTodos: jest.fn()` to `actions`. `TodoList` calls it from a
  `useEffect` that shallow rendering never ran; without it the component throws.
- `App.spec.tsx` and `MainSection.spec.tsx` build the real store exactly as `src/index.tsx` does
  (root reducer plus `callAPIMiddleware`) and stub `global.fetch` with a promise that never
  settles. Mounting `VisibleTodoList` dispatches `loadTodos()`, which fetches; leaving the request
  pending keeps the store still under the assertions and avoids updates outside `act`. Jest's jsdom
  environment has no `fetch` of its own.
- `Footer.spec.tsx` builds the same store and dispatches `setVisibilityFilter` to position the
  selected link.

Test count went 54 -> 55: the old `Footer` "should render filters" checked both the titles and the
`filter` prop, and the prop's observable counterpart is a separate test.

**Verified**

- `npx react-scripts test --watchAll=false` -> 10 suites, 55 tests, all pass.
- `npx react-scripts build` -> compiles, 56.9 kB gzipped JS, same as the Task 01 baseline.
- `npm run test:e2e` -> 22 passed.
- `git status` shows only the eight `*.spec.tsx`, the deleted `.d.ts`, `package.json` and
  `package-lock.json`. No other file under `src/` differs.
- Sanity-checked that the new assertions discriminate: temporarily broke `Link`'s `selected` class,
  `MainSection`'s toggle-all `checked`, `Footer`'s singular/plural word, `TodoItem`'s
  `onDoubleClick`, `TodoTextInput`'s `onSave`, `TodoList`'s todo text and `App`'s `MainSection`, and
  confirmed each produced failures in the matching suite. All reverted; the components are
  byte-identical to the previous commit.

**Left for QA**

- No new npm packages. `@testing-library/react` 14 and `@testing-library/dom` 10 were already
  installed.
- `@testing-library/jest-dom` is not in the project, so the specs assert on plain DOM properties
  rather than `toBeInTheDocument()` and friends. A later task can tighten them if it adds the
  package.
- `react-shallow-renderer` still appears as prose in `PLAN.md`, this file, and
  `tasks/07-react-19.md`. Those describe the migration rather than depend on it, so I left them.

No open questions.

### QA
