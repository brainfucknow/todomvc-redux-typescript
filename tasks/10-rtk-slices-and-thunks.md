# Task 10: Replace callAPIMiddleware with RTK slices and thunks

**Track:** Structural
**Chain:** specifier -> coder -> cleaner -> architect -> hardener -> QA

The specifier's job on this track is narrower than the full brief: write Gherkin only for the behavior being moved into a testable module, so the coder has an acceptance target for the extracted logic. Update the E2E procedures from Task 1 only if a workflow's observable behavior would change. It should not; if it must, stop and ask the project manager.

The hardener is in this chain because the task creates and changes testable modules.

**Status:** pending

## Goal

Retire the bespoke `callAPIMiddleware` and the hand-written switch reducers in favour of Redux Toolkit slices and async thunks, calling the client extracted in task 09.

## Context

`@reduxjs/toolkit` is already a dependency and `configureStore` is already used, but no `createSlice` and no `createAsyncThunk` exist. Current state lives in four reducers combined in `src/reducers/index.ts`: `todos`, `visibilityFilter`, `errorMessage`, and `exec`.

Behavior that must survive, in detail:

- `src/reducers/todos.ts` exports two reducers. The default export handles the four API success types; on anything else it delegates to the named `todos` export, which handles the six local types. Both share the same seed state, one todo `{ id: 0, text: 'Use Redux', completed: false }`.
- `LOAD_TODO_SUCCESS` replaces the array with `action.json` wholesale, discarding the seed.
- `ADD_TODO` computes the next id as `max(existing ids, -1) + 1`. There is a test asserting no duplicate ids after `CLEAR_COMPLETED`.
- `COMPLETE_ALL_TODOS` sets every todo to the negation of "are all currently marked".
- `src/reducers/apis.ts` `executing` tracks `isLoadingAll`, `isAdding`, and a per-id `t` map of `{ isUpdating }`. It contains a stray `console.log('action', action)` in the PATCH and DELETE request branch. Remove that; it is output, not behavior.
- `src/reducers/apis.ts` `errorMessage` returns null on `RESET_ERROR_MESSAGE`, returns `action.error` whenever the action carries one, and otherwise passes state through. Nothing dispatches `RESET_ERROR_MESSAGE`.
- Nothing in the UI reads `errorMessage` or `exec`. Their state is computed and discarded. Preserve them as state; do not surface them. Surfacing loading and error to the user is new behavior and is not in this plan.

## Scope

- Specifier: Gherkin for the reducer behavior above and for the thunk lifecycle, pending, fulfilled, and rejected, mapped onto the same observable state transitions the current action triples produce.
- Coder: `createSlice` for todos, visibility filter, and the request-status state. `createAsyncThunk` for the five API operations, calling the task 09 client.
- Coder: delete `callAPIMiddleware` and the `ApiActionMessage` type once nothing dispatches through them.
- Coder: keep the existing unit tests meaningful. `src/reducers/todos.spec.ts` asserts behavior that must still hold; adapt its dispatches to the new action creators without weakening its assertions.
- Architect: the store shape is now inferrable. Note whether `RootState` should be derived from it, for task 12.

## Out of scope

- Changing what the user sees. Same todos, same filters, same counts, same moment of update.
- Surfacing loading or error state in the UI.
- Changing components, containers, or selectors. They keep reading the same state paths. If a state path must move, stop and ask.
- Adding optimistic updates, retries, caching, or RTK Query. Every one of those changes observable timing.

## Done criteria

- No `callAPIMiddleware` and no hand-written switch reducer remains.
- Slice reducers are testable modules with no network, framework-IO, or UI dependency.
- Unit tests fail a plausible wrong implementation. The id-allocation and toggle-all invariants keep dedicated tests.
- Acceptance tests generated from the Gherkin pass.
- Property tests pass, per the architect's assessment.
- Mutation survivors killed on the new and changed modules, per the hardener.
- `npm run lint`, format check, `npm run typecheck`, `npm test`, and `npm run build` pass.
- The regression suite from `qa/procedures/` passes unchanged.
- The `console.log` in `apis.ts` is gone.

## Handoffs

### Specifier

### Coder

### Cleaner

### Architect

### Hardener

### QA
