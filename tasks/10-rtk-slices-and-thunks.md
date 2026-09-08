# Task 10: Replace callAPIMiddleware with RTK slices and thunks

**Track:** Structural
**Chain:** specifier -> coder -> cleaner -> architect -> hardener -> QA

The specifier's job on this track is narrower than the full brief: write Gherkin only for the behavior being moved into a testable module, so the coder has an acceptance target for the extracted logic. Update the E2E procedures from Task 1 only if a workflow's observable behavior would change. It should not; if it must, stop and ask the project manager.

The hardener is in this chain because the task creates and changes testable modules.

**Status:** in progress

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

## Inherited thread: floating promises

Task 06 considered type-aware linting and declined it, on the grounds that it
costs time on every run and largely overlaps the now-genuine typecheck. It named
one place the decision gives up something real: `callapimiddleware.ts` returns a
`fetch` chain and `no-floating-promises` is the rule that would have watched it.

You are replacing that middleware with thunks. If the rewrite leaves promises
whose rejection nobody observes, nothing in this project will tell you. Check by
hand, and say what you found.

## Inherited from task 09: dispatch no longer resolves to the success action

Task 09's QA drove the old and new API pipelines through 91 differential
executions and found the dispatched action sequences identical in every one.
It found exactly one surface change: `dispatch(anApiAction)` used to resolve to
the success action and now resolves to `undefined`.

Nothing in `src/` or `qa/` reads a dispatch result, so no behavior moved. But
you own this surface: `createAsyncThunk` returns a promise carrying the action,
and a component that starts awaiting one would be depending on something that
was accidentally true, then accidentally false, and is about to become true
again for a different reason. Say in your handoff what the dispatch result is
after your change and whether anything reads it.

## Inherited: the serializability warnings you are about to inherit

Task 07's QA collected every console message on the failure paths and found
that, on a faulted request, Redux Toolkit's development middleware emits two
`console.error`s about a non-serializable value: the `SyntaxError` that
`callAPIMiddleware` puts into the action under the `error` key.

That is dev-only and it is pre-existing, so it is not yours to fix by accident.
But you are rewriting exactly that code path into `createAsyncThunk`, whose
`rejected` action carries a serialized error by default rather than the raw
one. Two consequences worth stating in your handoff: whether the warnings go
away as a side effect, and whether anything observable changes about what lands
in state on a failure. The E2E procedures assert the *absence* of error UI, so a
change in the stored error shape can pass the suite while still being a change.

## Out of scope

- Changing what the user sees. Same todos, same filters, same counts, same moment of update.
- Surfacing loading or error state in the UI. The E2E suite asserts the absence of any error UI, so adding one fails procedures 16 to 20 by design. That is a behavior change: stop and ask the project manager, who routes it to the specifier.
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

Wrote the Gherkin for the behavior this task moves into slice reducers and
thunks. Nothing else changed: no source, no unit test, no QA procedure, no
config, no manifest.

**Added**

- `features/todo-state-edits.feature` (9 scenarios, 13 executions): what the
  todo list becomes when the app decides the whole change itself. Seed, id
  allocation, no id reuse after a clear, edit, mark, toggle all, clear, delete.
- `features/todo-state-operations.feature` (8 scenarios, 12 executions): what
  the state does while each of the five backend operations runs and once it
  settles. Started, answered, failed - the lifecycle, written as state
  transitions rather than as action names.
- `features/todo-state-failures.feature` (4 scenarios, 4 executions): the
  recorded failure and how long it lives.
- `features/todo-state-filter.feature` (2 scenarios, 4 executions): which todos
  the app shows.

23 scenarios, 33 executions. They are a second family alongside `todo-api-*`,
and they use a second step vocabulary; the naming says so.

**The acceptance run is red on purpose.** `npm run acceptance` now reports
`Test Files 4 failed | 3 passed`, `Tests 33 failed | 24 passed`, and every one
of the 33 failures is `Error: Unsupported step`. The 24 from task 09 still pass.
That is the acceptance target: it goes green when the coder has slices, thunks
and the step handlers for them, and not before. Nothing in CI runs `npm run
acceptance` (`.github/workflows/nodejs.yml` deliberately leaves it out, per task
14 item 2), so no gate is red in the meantime.

**What the features pin, read out of the source rather than the task text**

Verified against `src/reducers/todos.ts`, `src/reducers/apis.ts`,
`src/reducers/visibilityFilter.ts`, `src/reducers/index.ts`,
`src/middlewares/callapimiddleware.ts` and `src/todo-api/client.ts`.

- The seed is exactly one todo, `{id:0,text:"Use Redux",completed:false}`, and
  both reducers in `todos.ts` share it. edits 1.
- `ADD_TODO` allocates `max(existing ids, -1) + 1`. edits 2 has three rows; the
  third holds ids 5 and 2 in that order, so one-past-the-highest and
  one-past-the-length give different answers and only the first passes. edits 3
  walks the exact sequence `todos.spec.ts` walks - complete 0, clear, add - and
  expects id 2. **This is one of the two invariants the brief named.**
- `COMPLETE_ALL_TODOS` writes the negation of "are all currently marked" to
  every todo. edits 7 is the three-row truth table: all active, all complete,
  mixed. The mixed row is the one that fails a `some`-based or first-todo-based
  implementation. **The second named invariant.**
- `COMPLETE_TODO` writes the flag it is given rather than toggling. edits 6
  marks an already-complete todo complete and expects it unchanged; that
  scenario exists only to fail a toggle.
- `EDIT_TODO` changes text and keeps the completed flag. edits 4.
- `CLEAR_COMPLETED` keeps the todos that are not complete, with their ids.
  edits 8. `DELETE_TODO` removes by id. edits 9.
- The request triples, as state: `LOAD_TODO_REQUEST` sets loading and the list
  does not move until `LOAD_TODO_SUCCESS` replaces it wholesale (operations 2);
  `POST_TODO_SUCCESS` appends `action.json`, not what was asked for, so the
  answer in operations 3 differs from the request in both text and flag;
  `PATCH_TODO_SUCCESS` replaces the whole todo, so the answer in operations 4
  contradicts the stored completed flag and wins; `DELETE_TODO_SUCCESS` removes
  it, and not before the answer arrives (operations 5).
- Nothing is optimistic. Every operation scenario reads the list while the call
  is in flight and finds it unmoved. That is the "same moment of update" the
  Out of scope section is protecting.
- The per-id progress map is a map: operations 8 starts two updates at once and
  finds both recorded. A single "which id is updating" field passes every other
  scenario and fails that one.
- `errorMessage` records `action.error` and nothing clears it. failures 2 and 3;
  3 lands a real success after the failure and finds the record still there.
- `RESET_ERROR_MESSAGE` returns null. failures 4, with the comment saying the
  branch has no caller, that this task neither removes it nor adds one.
- `visibilityFilter` defaults to show-all and records the chosen filter.
  filter 1 and 2.

**What is deliberately not specified**

- Action type strings. The features name operations and states, never
  `POST_TODO_REQUEST`. `createSlice` and `createAsyncThunk` generate their own
  names and nothing observable depends on the old ones - but see the question
  about `src/actions/index.spec.ts` below.
- The shape of the request-status state. The features say what it must say
  ("the update of todo 2 is in flight"), not that it is `exec.t["2"].isUpdating`.
  Nothing in `src/`, `qa/` or the E2E suite reads that state, so the coder has
  room; the architect should note whether the shape they pick is the one
  `RootState` should derive in task 12.
- The shape of the recorded failure. The features assert its *message* only, in
  as many words. That is on purpose: `callAPIMiddleware` stores the raw `Error`
  and `createAsyncThunk`'s `rejected` stores a serialized one, and both answer
  "the message is `Failed to fetch`". If the coder makes that swap, no scenario
  moves - which is exactly the finding the serializability thread asks them to
  report rather than a licence to skip reporting it.
- Anything a user can see about loading or failure. Still none. No UI surface is
  specified and none should appear.
- The result of `dispatch`. No step reads it, so the features neither pin the
  old accident nor the new one. If anything ever awaits a dispatch, that becomes
  behavior and wants a scenario first.
- That toggle-all and clear-completed reach no backend. That claim is
  `qa/procedures/10` and `11` and stays there; these features are about state,
  and their world has no backend to observe for a local edit.

**A finding the coder needs before starting**

Four of the six local reducer branches have no caller. `src/actions/index.ts`
maps `addTodo`, `deleteTodo`, `editTodo` and `completeTodo` to the API calls in
`src/actions/api.ts`, so `ADD_TODO`, `DELETE_TODO`, `EDIT_TODO` and
`COMPLETE_TODO` are dispatched by nothing in the app; only `COMPLETE_ALL_TODOS`,
`CLEAR_COMPLETED` and `SET_VISIBILITY_FILTER` reach the store from a container.
They are still live branches with tests, and the id-allocation invariant lives
in one of them, so they are specified and must survive. The edits feature says
this in its header comment so nobody deletes them as dead code. It also means a
slice for the todos list needs both families of reducer cases even though the
UI only reaches one.

**Step vocabulary the coder implements**

24 forms. Setup: `a fresh state`; `the state starts with the todo list <json>`.
Local edits: `a todo <text> is added locally`; `todo <id> is deleted locally`;
`todo <id> is edited locally to <text>`; `todo <id> is marked completed <flag>
locally`; `every todo is toggled`; `the completed todos are cleared`.
Operations: `the app starts <operation>` (one definition, five phrasings, listed
in the operations vocabulary block); `the backend answers with <json>`; `the
backend answers`; `the call fails with error <message>`; `the recorded failure
is forgotten`. Filter: `the <filter> filter is chosen`. Assertions: `the todo
list is <json>`; `the todo list has not changed`; `the todo list holds <n>
todos`; `the last todo is <json>`; `every todo in the list reads <state>`, whose
cells are `complete` and `active`; `<subject> is in flight`; `no operation is
left in flight`; `no failure is recorded`; `the recorded failure message is
<message>`; `the visible todos are <json>`.

Four things about them:

- `<subject> is in flight` is one definition matching `^(.+) is in flight$`. The
  negative is worded `no operation is left in flight` precisely so that pattern
  cannot match it and the runtime cannot call the step ambiguous. Do not rename
  either half without re-checking the other.
- I checked all 55 step texts against the 32 patterns in
  `acceptance/steps/todo-api.ts`: no step in this family matches any existing
  pattern, so merging the two suites produces no ambiguity today.
- `acceptance/steps/index.ts` currently *is* `todoApiSteps`, one suite with one
  world. This family needs a second world, so `projectSteps` becomes a merge -
  which the comment in that file already anticipates. How the two worlds
  coexist is yours.
- `the backend answers ...` must let the operation settle before the next step
  runs, and `the app starts ...` must not. Both are stated in the vocabulary
  blocks. Whatever seam the thunks get for the transport (extra argument,
  injected `SendRequest`, whatever), the steps need it: they never touch the
  network.

**Deliberate mutation survivors, declared**

Recorded now so the hardener reads them as declared rather than as gaps, in the
practice `todo-api-requests` already uses.

- operations 8, `error` column: the message the call fails with is the message
  the record is expected to hold. Free by the same argument the project already
  accepted for the `id` column in `todo-api-requests` 3-5; it varies across rows
  to say the message is carried rather than fixed. The `operation` and
  `progress` columns in the same table are *not* free - they are two independent
  statements about one row, and mutating either alone goes red.
- Every other column in every table is the answer to its row's question:
  edits 2's `id` and `count` are computed from `todos`, edits 7's `state` from
  `todos`, filter 2's `visible` from `filter`.

**ir-dry-checker**

The APS commands are already installed in this repository, at `.aps/bin/`, from
task 09's `npm run acceptance:install`. I used those - `gherkin-parser` and
`gherkin-ir-dry-checker` - rather than building my own copy, and reimplemented
nothing. Per feature, in the prescribed order: wrote the Gherkin, pruned the
parameters, parsed, dry-checked, reviewed, hoisted, wrote the note.

All four parse with exit 0 and the IR round-trips faithfully: placeholders,
example cells and the JSON payloads survive verbatim, and `When/Then/When/Then`
in one scenario is preserved as an ordered step list, which the two-phase
lifecycle scenarios need.

The report drove two real edits:

- `todo-state-failures` originally had one scenario that failed a load, checked
  the record, loaded again successfully and checked the record again. Two
  `duplicate-in-scenario` findings, both high confidence, and both fair: the
  repeated steps were a sequence I had crammed into one scenario. It is now four
  scenarios, one claim each - nothing recorded, a failure recorded, a later
  success does not clear it, forgetting clears it - and scenario 3 uses an add
  for its success so the repetition is gone rather than hidden. No
  `duplicate-in-scenario` finding remains in any feature.
- `todo-state-operations` gained scenario 1, "a state that has started nothing
  shows nothing as running". Every other scenario reads progress *after*
  starting something, so a wrong initial value for the request-status state had
  no scenario that could see it. The rest of the file renumbered; the handles
  were less than an hour old and nothing depends on them yet.

What the reports still hold is `possible-synonym` and `near-duplicate` findings
between steps that are one form with different data - `the todo list is [...]`
against `the todo list is [...]` scores high because the JSON dominates the
similarity - plus `<progress> is in flight` against `the load is in flight`,
which is the outline and its literal siblings and is what one step form looks
like. The checker's own guidance is not to merge on similarity alone. Nothing
there is drift.

**Background**

Hoisted where the meaning survives:

- `todo-state-operations`: all eight scenarios start from the same two-todo
  list. Hoisted.
- `todo-state-filter`: both scenarios, same list. Hoisted.
- `todo-state-failures`: all four start from `a fresh state`. Hoisted - the dry
  checker with `--include-exact` is what pointed at it.

Not hoisted in `todo-state-edits`, deliberately. Five of its nine scenarios
share a Given and four do not: scenario 1 is about the state nobody has set, and
2, 3 and 7 set their own lists. A Background that four scenarios immediately
contradict reads worse than five explicit Givens, so the exact-duplicate finding
there stands and is what the checker calls a vocabulary reuse audit rather than
a defect.

**QA procedures**

None changed, as the task predicted. Everything specified here is state the UI
either already shows the same way or never shows at all, and I added no user
surface. `qa/procedures/16` to `20` still assert the absence of error UI and the
features give nobody a reason to add one.

**Inherited threads, from where I sit**

- *Floating promises.* My step vocabulary awaits the operation at
  `the backend answers` / `the call fails`, so the acceptance suite observes
  settlement rather than ignoring it. Worth knowing while you check by hand:
  `createAsyncThunk`'s dispatch returns a promise that resolves with the
  rejected action rather than rejecting, unless something calls `.unwrap()`. A
  rewrite that keeps it that way has no unobserved rejection to leak; one that
  unwraps does.
- *Dispatch result.* Unspecified here, on purpose, and nothing in `src/` or
  `qa/` reads one. Report what it becomes.
- *Serializability warnings.* The features are message-only about the recorded
  failure precisely so the serialized-error swap is legal. It is still a change
  in what lands in state, and the task asks you to say so.
- *The `console.log` in `apis.ts`.* Output, not behavior, so no scenario mentions
  it. It is in the done criteria; delete it.

**Verified**

`gherkin-parser` exit 0 on all seven feature files. `gherkin-ir-dry-checker`
clean of actionable findings on all four new ones, with and without
`--include-exact`. `npm run acceptance`: 24 passed (task 09's), 33 failed, all
`Unsupported step`. `npm run format:check` and `npm run lint` pass with the four
files present. I did not run `npm test`, `npm run build`, `npm run properties`,
`npm run hardening` or the E2E suites: no source changed, so there was nothing
for them to verify. Branch `claude/react-modernization-plan-u7dgen` at 4ced438,
unmoved; working tree holds four new untracked files and nothing else.

**Open questions for the project manager**

None blocking. Three recorded rather than guessed at silently.

1. `todo-state-filter` reads the filter through `getVisibleTodos`, the selector
   the app already uses, rather than through the token the reducer stores. That
   is behavior rather than implementation, and it pins the "containers and
   selectors keep reading the same state paths" requirement in the acceptance
   suite instead of only in review. It does mean one selector is inside the
   acceptance surface of a task that is not allowed to change selectors. I judged
   that a feature, not a leak; task 13's specifier should know it is there.
2. `src/actions/index.spec.ts` asserts the literal action objects the local
   creators return - `{type:'ADD_TODO',text}` and five more. Under `createSlice`
   those names become slice-scoped unless the coder pins them, and nothing
   observable depends on them, so that spec is about naming rather than
   behavior. The task tells the coder to keep `todos.spec.ts` meaningful and says
   nothing about this one. My reading is that adapting it to the new creators is
   fine and weakening it to `expect.anything()` is not; say if you disagree.
3. The three features from task 09 use `the call fails with error E` for the
   client's own failure; this family reuses the exact wording for the operation's
   failure, one layer up. Deliberate - it is the same event seen from two places
   - and the patterns do not collide, but it does mean one sentence appears in
   two vocabularies. Rename either side if you would rather they were distinct.

**Left for the coder**

The acceptance target is the four feature files and the 33 executions they
generate. The slices, the thunks, the step handlers, the second world in
`acceptance/steps/` and the transport seam those steps need are all yours. I
wrote no source, no handler and no manifest.

### Coder

### Cleaner

### Architect

### Hardener

### QA

## Project manager notes

**On the specifier's three questions, all answered so none blocks the coder.**

*The selector inside the filter feature's acceptance surface.* Keep it.
"Which todos are shown" is a behavioral question, and `getVisibleTodos` is the
domain function that answers it. Specifying it through the selector rather than
through the stored filter token is asking the domain rather than re-deriving,
which is the direction task 13 exists to push everything else in. It is not an
implementation detail leaking into the spec.

*What to do with `src/actions/index.spec.ts` under `createSlice`.* Its job is to
assert observable behavior, not the shape of generated code. Where a test only
pins the literal object a hand-written creator returned, it has no counterpart
worth keeping once `createSlice` generates the creator, and it may go. Where a
test pins something the system must still do, it stays and is adapted. The
id-allocation and toggle-all invariants keep dedicated tests either way; the
task file already requires that. List anything dropped, with the reason, so QA
can judge rather than discover.

*Reusing "the call fails with error E" across both vocabularies.* Fine. The two
families are separate suites with separate worlds, and the specifier verified
all 55 step texts against the 32 existing patterns with no ambiguity. Identical
wording for the identical question is the brief's own preference: one handler
for shapes differing only by example values.

**On acceptance being red.** 33 failures, every one `Unsupported step`, with
task 09's 24 still passing. That is the intended state at this point in the
chain: the spec exists and the implementation does not. No CI gate runs
acceptance, so nothing is broken by it standing red between roles. The coder's
job is to turn it green without touching a feature file.

**On the four uncalled reducer branches.** `ADD_TODO`, `DELETE_TODO`,
`EDIT_TODO` and `COMPLETE_TODO` have no caller, because `src/actions/index.ts`
maps those names to the API operations. They still carry the id-allocation
invariant and they are specified. Preserve them. The architect's brief has a
line about policy reachable only by tests while an adapter reimplements it; that
question belongs to the architect on this task, not to the coder, and not by
deletion in passing.
