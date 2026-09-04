# Task 12: Replace connect() containers with react-redux hooks

**Track:** Structural
**Chain:** specifier -> coder -> cleaner -> architect -> hardener -> QA

The specifier's job on this track is narrower than the full brief: write Gherkin only for the behavior being moved into a testable module, so the coder has an acceptance target for the extracted logic. Update the E2E procedures from Task 1 only if a workflow's observable behavior would change. It should not; if it must, stop and ask the project manager.

The hardener is in this chain because the task changes the selectors' input type, which is a testable module.

**Status:** pending

## Goal

Remove the `connect()` HOC layer. Components read state with `useSelector` and dispatch with `useDispatch`. `RootState` is derived from the store instead of hand-declared.

## Context

Four containers exist under `src/containers/`:

- `FilterLink.ts` maps `active: ownProps.filter === state.visibilityFilter` and a `setFilter` dispatcher.
- `Header.ts` binds `addTodo` with the object shorthand.
- `MainSection.ts` maps `todosCount: state.todos.length` and `completedCount` from the selector, and binds all of `TodoActions`.
- `VisibleTodoList.ts` maps `filteredTodos` from `getVisibleTodos` and binds all of `TodoActions`.

`src/containers/index.ts` is not a container. It hand-declares `RootState` with only `todos` and `visibilityFilter`, while the root reducer also combines `errorMessage` and `exec`. Both the selectors and the middleware import `RootState` from it, so this file is a boundary in the wrong place.

`src/components/TodoList.tsx` types its `actions` prop as `any` and calls `actions.loadTodos()` inside a `useEffect` keyed on that function's identity. Whether that effect fires once depends on `bindActionCreators` returning a stable reference. Preserve the observable outcome: the todo list loads once on mount and does not re-fetch on unrelated state changes.

## Scope

- Specifier: Gherkin for the load-on-mount behavior, since it is the one piece of logic in this task that is easy to break invisibly. The rest is wiring.
- Coder: replace each container with hooks used directly in its component. Delete `src/containers/`.
- Coder: derive `RootState` from the configured store's `getState`, and export it alongside the store. Add the typed `useAppSelector` and `useAppDispatch` hooks Redux Toolkit recommends.
- Coder: remove the `any` on `TodoList`'s actions prop.
- Architect: the dependency direction changes here. Selectors currently depend on a type declared in a container barrel; after this task they should depend on the state shape the store owns. Fix the direction and add a check that prevents it regressing.

## Out of scope

- Changing when the todo list loads, how many times it fetches, or what the user sees at any point.
- Changing which observables the components compute. Moving derivation into selectors is task 13.
- Changing the state shape itself.
- Adding memoization that changes render counts in a way tests can observe, unless required to preserve the single-fetch behavior.

## Done criteria

- `src/containers/` no longer exists and nothing imports from it.
- `RootState` is derived from the store and includes every combined reducer's state.
- No `connect`, no `mapStateToProps`, no `bindActionCreators` remains.
- No `any` remains in the touched component props.
- The list still loads exactly once on mount, proven by a test that counts requests.
- Acceptance tests generated from the Gherkin pass.
- Property tests pass, per the architect's assessment.
- Mutation survivors killed on the changed testable modules, per the hardener.
- `npm run lint`, format check, `npm run typecheck`, `npm test`, and `npm run build` pass.
- The regression suite from `qa/procedures/` passes unchanged.

## Handoffs

### Specifier

### Coder

### Cleaner

### Architect

### Hardener

### QA
