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
**Verified**

- `CI=true npx react-scripts test --watchAll=false` -> 10 suites, 55 tests, 0 failures. The 54 -> 55
  delta is the Footer split described below, and nothing else.
- `npx react-scripts build` -> compiles. `build/static/js/main.1875e386.js`, 56.9 kB gzipped: the
  same chunk hash as the Task 01 baseline, so the shipped bundle is unchanged.
- `npm run test:e2e` -> 22 passed, matching Task 01. `qa/procedures/` holds 21 procedures plus a
  README, `qa/tests/` holds 21 spec files carrying 22 cases (`21-http-error-status-ignored` has
  two). No procedure changed: no observable behavior changed, so there was nothing to convert or
  re-word.
- Diff against `2a0194e`: only the eight `*.spec.tsx`, the deleted `src/react-shallow-renderer.d.ts`,
  `package.json`, `package-lock.json`, and this file. No component or application source differs.
- `react-shallow-renderer` is absent from `package.json`, from both the `packages` and the legacy
  `dependencies` maps in `package-lock.json`, from `node_modules`, and from every file under `src/`.
  The surviving hits are prose in `PLAN.md`, this file and `tasks/07-react-19.md`, as the coder said.
  `npm ci --dry-run` exits 0 against the trimmed lock, so CI's `npm ci` still resolves.

**Old-vs-new assertion audit**

Read each old suite out of `git show 2a0194e:src/components/<name>.spec.tsx` against its replacement.
The coder's mapping table holds; every old assertion has a counterpart asserting the same observable
behavior, with the one dropped assertion below.

I did not take the mapping on trust. Eight mutations to component sources, each aimed at an
assertion whose *shape* changed in the rewrite, run against the rewritten suites and then reverted:

| Mutation | Result |
| --- | --- |
| `App`: drop `<Header />` | killed, `App.spec` |
| `App`: drop `<MainSection />` | killed, `App.spec` |
| `Footer`: every `FilterLink` gets `filter={SHOW_ALL}`, titles untouched | killed, `Footer.spec` selected-link test |
| `Header`: drop the `newTodo` prop | killed, `Header.spec` |
| `MainSection`: pass `activeCount={todosCount}` to `Footer` | killed, `MainSection.spec` |
| `TodoList`: render rows in reverse order | killed, `TodoList.spec` |
| `TodoList`: strip each row's `completed` flag | killed, `TodoList.spec` |
| `TodoItem`: seed the edit input with the wrong text | killed, `TodoItem.spec` |

The tree is byte-identical after the run; no `.bak` files remain.

Judgment on the two items the coder flagged:

- **Dropped `TodoList` key assertion: accepted.** A React key is not observable in the DOM, so it
  falls under "only inspected internals". Worth recording that the old assertion was weaker than it
  looked: the fixture's ids are `0` and `1`, equal to their array indices, so
  `expect(Number(todo.key)).toBe(filteredTodos[i].id)` would also have passed a `key={index}`
  regression. Nothing it actually discriminated has been lost, and the order and per-row-data
  mutations above confirm the replacement covers what it protected. Residual, for the record: no
  unit test now pins reconciliation identity, whose failure mode is stale edit state when rows
  reorder. This app never reorders rows and the old suite did not cover that either.
- **Footer test split: accepted.** The old "should render filters" asserted both the link titles and
  each child's `filter` prop. The prop's only observable consequence is which link carries
  `selected`, and that needs a store, so it cannot share the propless render. Splitting is the honest
  shape. The mutation above shows the new test discriminates on exactly that prop.

Two places where the rewrite asserts slightly more than the original, both inside the same behavior
and neither adding new coverage of its own: `Header` now checks `addTodo` is called *with* the text
and drives it through `TodoTextInput` rather than invoking `onSave` by hand, and `TodoItem` now
checks the row checkbox's `type`. Recorded, not objected to.

One structural loosening, not a defect: `MainSection`'s toggle-all is now found by class anywhere in
the container rather than positionally as the span's first child. The `completeAllTodos` test still
pins `section.main > span > label`, so the wrapper is not unasserted.

**Absences confirmed rather than invented**

- No Gherkin, no `.feature` files, no APS wiring anywhere in the repository. The only mentions are
  forward-looking prose in `tasks/09` through `tasks/13`. This is a Tooling task with no acceptance
  pipeline to run, so nothing was skipped.
- No property tests and no property-testing library in the dependency tree.
- Release checks with no command in this repository yet: there is no `lint` script, no `typecheck`
  script and no `preview` script. Those arrive in tasks 04, 05 and 06. They were not run because
  they do not exist, not because they were skipped. `.github/workflows/nodejs.yml` runs `npm ci`,
  `npm run build` and `npm test` and nothing else; all three pass here.

**CRAP gate and DRY**

- CRAP on the eight changed files: every function is a test body or a setup helper. Highest
  cyclomatic complexity is 3 (`TodoItem.spec`'s `setup` with its `if (editing)`, and `Footer.spec`'s
  two `forEach` callbacks). Each runs on every suite execution, so coverage is 1 and CRAP equals
  complexity. Maximum 3, gate is 10. No `cond`/`case` construct anywhere, so the exception clause
  does not arise.
- Mixed-job scan: each spec exercises one component and each helper does one job. Nothing to split.
  `TodoItem.spec`'s `setup(editing)` takes a boolean the caller already knows, which is a mild flag
  smell; it is inherited verbatim from the old suite and keeping it makes the old/new comparison
  legible, so I left it.
- DRY findings, recorded and deliberately not fixed: the `configureStore` block wiring the root
  reducer to `callAPIMiddleware` is duplicated across `App.spec`, `Footer.spec` and
  `MainSection.spec`; `pressReturn` is
  duplicated across `Header.spec`, `TodoItem.spec` and `TodoTextInput.spec`; the never-settling
  `fetch` stub is duplicated across `App.spec` and `MainSection.spec`. Removing any of these needs a
  shared helper module under `src/`, and this task's done criteria say no file under `src/` other
  than `*.spec.tsx` may differ from the previous commit. A `.spec.tsx` cannot host the helper either,
  since importing one spec from another would run its suite twice. I judged roughly fifteen lines of
  test-setup duplication as below the bar for breaking an explicit done criterion. Task 03 rewrites
  these same imports for Vitest and is the natural place to fold them together.

**Process note**

While this review was in progress the coder's working-tree changes were committed as `464387c`
("Assert on rendered DOM instead of shallow element trees"). I did not create that commit. Its
contents are exactly the tree I audited (same file list, same diffstat), so the verification stands;
all history comparisons above are against `2a0194e`, the commit before it. My own only change is
this note, left uncommitted as instructed. `**Status:** pending` at the top of this file and the
task 02 row in `PLAN.md` are untouched: flipping them is the project manager's call, as it was for
task 01.

**Result**

All verification passes. No fix is owed by any role.

**Open question for the project manager**

Should the test-setup duplication listed above be fixed inside this task by adding a shared helper
under `src/` (which contradicts the "no file under `src/` other than `*.spec.tsx` differs" done
criterion), or deferred to task 03? Deferred by default.
