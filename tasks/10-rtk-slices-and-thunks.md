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

Replaced `callAPIMiddleware` and the four hand-written switch reducers with
`createSlice` reducers and `createAsyncThunk` operations, and wrote the step
handlers and the second world the new features needed. `npm run acceptance` is
green: 57 passed, the 24 from task 09 and the 33 this task's features generate.
No feature file changed.

**What changed, and why**

- `src/actions/api.ts` is now the seam the middleware was: five
  `createAsyncThunk`s that run the task 09 client and translate its outcome into
  a settled thunk. The transport is the store's `extra` argument, so this module
  performs no request and imports no `fetch`. Each thunk's argument is the
  operation's own fields - the same record `call.fields` holds - so a reducer
  reads `action.meta.arg.id` whichever operation reported.
- `src/store/index.ts` is new: `createTodoStore(send, preloadedState?)`. It is
  the one place that joins a transport to the store, and it takes it as an
  argument rather than defaulting to `sendWithFetch`, so nothing can forget to
  override a default that talks to the network. `src/index.tsx` and
  `src/test-support/store.tsx` pass `sendWithFetch`; the acceptance suite passes
  its own.
- `src/reducers/todos.ts` is one slice with both families: six local edits in
  `reducers`, the four settled operations in `extraReducers`. Same seed, same id
  rule, same toggle-all rule.
- `src/reducers/apis.ts` is two slices, `executing` and `errorMessage`, keeping
  the state keys `exec` and `errorMessage`. The stray `console.log` is gone.
- `src/reducers/visibilityFilter.ts` is a slice. `src/reducers/index.ts` is
  unchanged: same four keys, same names, so no container, component or selector
  moved.
- `src/actions/local.ts` re-exports the slice creators as plain functions of the
  arguments the app has at each call site. That is not decoration - see the trap
  below.
- Deleted: `src/middlewares/` (both files), `src/constants/ActionMessage.ts`,
  `src/constants/ActionTypes.ts`. Nothing imports them.
- `src/containers/FilterLink.ts`: one type annotation, `Dispatch<ActionMessage>`
  to `Dispatch<ReturnType<typeof setVisibilityFilter>>`, because the union type
  it named is gone. No state path moved and no behavior changed; this is the
  only container line this task touched.
- `scripts/architecture/rules.mjs`: the acceptance rule's allow list is widened
  to `src/store`, `src/actions/*`, `src/selectors`, `src/models/*` and
  `src/constants/*`, with the reason saying why and what is still refused. The
  rule keeps its name so `hardening/rules.hardening.test.ts` still holds it, and
  both of its planted violations - `src/todo-api/fetchTransport` and
  `src/reducers/todos` - are still refused under the wider list.
- `scripts/architecture/boundaries.spec.mjs`: the exact-edge assertions now name
  `src/actions/api.ts`, `src/store/index.ts` and `src/index.tsx` instead of the
  deleted middleware.
- `README.md`: the State and Data rows said a middleware runs the calls. They
  now say what does.

**Evidence, not just a passing suite**

I drove the old pipeline and the new one side by side. `git archive HEAD src`
into a scratch tree gives the pre-change modules; both stores were then built in
one Node process over a single `globalThis.fetch` stub, so both go through
`sendWithFetch` and the recorded requests are directly comparable. 15 scripts -
each of the five operations answering, each failing at the transport, a body
that will not parse, a 500 with a parseable body, a delete whose body is never
read, a failure followed by a success, two updates in flight at once, the three
local edits, and an operation left in flight forever. After every step and again
after settlement I compared: the wire requests (url, method, headers, body), the
whole state (`todos`, `visibilityFilter`, `exec`, `errorMessage` reduced to name
and message, and the todos the selector makes visible), and every `console.error`
argument.

All 15 agree exactly. Two further checks are below. The harness lived in
`build/differential/` and is deleted - `build/` is only partly gitignored and I
am not leaving a copy of the old tree in the working tree. It is six minutes to
rebuild from this paragraph if QA wants it.

**Trap 1: the serializability warnings, and what lands in state**

Both go away, and the stored value does change.

Driven with the *default* middleware on both stores, a failed load produced two
`console.error`s matching "non-serializable" from the old store and none from
the new one. That is task 07's finding, gone as a side effect: the raw error is
no longer in the action.

What lands in state changes with it. Before: `state.errorMessage` was the real
`TypeError` instance. After: it is `createAsyncThunk`'s serialized error,
`{name, message, stack}` - same `name`, same `message`, not an `Error`. Nothing
in the UI reads it, the E2E procedures assert the absence of error UI, and the
features assert the message only, so nothing anywhere goes red. It is still a
change in what the store holds and I am reporting it rather than letting the
green suite speak for it.

**Trap 2: floating promises, checked by hand**

Nothing in this project would tell me, so: every call site that discards a
promise is `TodoList`'s mount effect (`loadTodos()`), `TodoItem`'s checkbox and
destroy button, and `Header`'s save. All four discard the value `dispatch`
returns. `createAsyncThunk`'s promise resolves with the rejected action rather
than rejecting - the only way to get a rejection out of it is `.unwrap()`, and
`unwrap` appears nowhere in `src/`, `acceptance/`, `properties/`, `hardening/`
or `qa/`. Inside `src/actions/api.ts`, `runCall` awaits `executeCall`, whose own
chain ends in a `.catch`.

Checked rather than reasoned as well: with `process.on('unhandledRejection')`
armed, all five operations were dispatched into a failing transport with every
result discarded. Nothing was reported unhandled, and the failure still reached
`state.errorMessage`. The acceptance steps await settlement at
`the backend answers` / `the call fails`; the two scenarios that leave an
operation running leave a pending promise, never a rejected one.

**Trap 3: the dispatch result**

`dispatch(anApiAction)` now resolves to the settled action - `{type:
'todos/load/fulfilled', payload: [...]}` on a success, the `rejected` action on
a failure. It never rejects. Verified differentially: the old pipeline resolved
to `undefined` for the same load, the new one to the fulfilled action.

Nothing reads it. `src/` discards it at all four call sites above, `qa/` has no
access to it, and no step in `features/` reads it. So the value has gone from
accidentally meaningful, to accidentally `undefined`, to deliberately meaningful,
with no reader at any point. If a component ever starts awaiting one, that is
behavior and wants a scenario before it wants code.

**The four uncalled branches**

`addTodo`, `deleteTodo`, `editTodo` and `completeTodo` are all still in the
todos slice's `reducers`, still allocating ids by `max(ids, -1) + 1`, still
reachable only from tests and the acceptance suite. `src/actions/index.ts` still
maps those four names to the backend operations, so they still have no caller in
the app. The slice's docstring says so, so does `src/actions/local.ts`. I did not
delete them and I did not give them a caller; that question is the architect's.

**The second world**

`acceptance/steps/index.ts` is now a merge. It declares `ProjectWorld` as
`{api, state}`, creates both per execution, and lifts each family's definitions
into it with a small `inWorld` helper, so neither family can read the other's
world. Routing stays the runtime's job, by pattern. `acceptance/steps/todo-api.ts`
changed by one word: its world interface is exported.

`acceptance/steps/todo-state.ts` is the new vocabulary, all 24 forms. Its world
holds a store whose transport hands each request back to the scenario as a
deferred, which is what makes `the app starts ...` and `the backend answers ...`
two steps rather than one: the operation is genuinely in flight in between. The
client sends synchronously before it yields, so a started operation can be paired
with its request without waiting for anything.

The specifier's warning about `(.+) is in flight` versus
`no operation is left in flight` holds: the negative does not end in
" is in flight", so the greedy pattern cannot reach it. No step in either family
was reported ambiguous by the runtime across all 57 executions.

**Unit tests, added and dropped**

Added:

- `src/actions/api.spec.ts` - the boundary spec `callapimiddleware.spec.ts` was.
  What reaches Redux and in what order, that a delete's success carries no
  parsed body, that the error is logged *between* the two dispatches, that the
  recorded failure is a serialized error keeping the message, and what a dispatch
  resolves to.
- `src/reducers/apis.spec.ts` - the two pieces of state nothing reads. Includes
  the per-id map with two updates running at once, which a single "which id is
  updating" field fails.
- `src/reducers/visibilityFilter.spec.ts` - three cases; there was no spec here
  before.
- `src/reducers/todos.spec.ts` gained the operation branches, which had no unit
  test at all before: load replaces wholesale, add appends the answer rather than
  the request, a patch replaces the whole todo, an answer for a todo the list
  does not hold changes nothing, a delete removes by its argument, and a pending
  operation moves nothing. It also gained explicit tests for the two invariants:
  one past the highest id rather than one past the length, and toggle-all from a
  mixed list.

Rewritten:

- `src/actions/index.spec.ts` asserted the literal objects six hand-written
  creators returned. Under `createSlice` those objects are generated code, so per
  the project manager's ruling that part is gone. What replaced it is the one
  thing `src/actions/index.ts` actually decides and the reason four branches have
  no caller: each of the five API names sends its request, and each of the three
  local names sends none. It is driven through a store with a recording
  transport, so it is behavior rather than shape.

Dropped:

- `src/middlewares/callapimiddleware.spec.ts`, with the module. Four of its five
  tests moved into `src/actions/api.spec.ts` above. The fifth -
  "throws on a dispatched null before anything of this task runs" - has no
  counterpart: it pinned the behavior of a middleware sitting in the dispatch
  chain reading `.outcomeNames` off whatever went past. There is no middleware in
  the chain now, so there is nothing to throw. `src/todo-api/client.spec.ts` and
  `features/todo-api-refusals.feature` still hold `isTodoApiCall`'s own answer.

`npm test` is 18 files / 165 tests, up from 16 / 139.

**Two small behavior notes**

- `src/actions/local.ts` exports plain functions rather than the slice action
  creators themselves. That is load-bearing, not style: `MainSection` passes
  `actions.completeAllTodos` straight to an `onClick` and `Footer` does the same
  with `onClearCompleted`. A `createSlice` creator called with a React event puts
  that event in `action.payload` - a non-serializable payload, and a new warning
  on every toggle-all. The wrappers take no arguments, so the event is dropped
  where it always was. No component changed.
- `completeTodoCall(id, completed)` refuses a null flag. It used to throw
  synchronously at the dispatch site, because the action creator built the call;
  it now rejects the thunk, because the payload creator builds it. TypeScript
  types the argument `boolean` and `TodoItem` always passes one, so nothing in
  the app can reach it. The client's own refusal is unchanged and
  `features/todo-api-refusals.feature` still drives it directly.

**Verified**

`npm run acceptance` 57 passed / 7 files, 0 failures. `npm test` 165 passed / 18
files. `npm run lint`, `npm run format:check`, `npm run typecheck` (six projects,
0 errors), `npm run build`, `npm run properties` (26), `npm run hardening` (50)
all pass. `npm run test:e2e` 22 passed; `test:e2e:dev` and `test:e2e:preview` 21
passed / 1 skipped each - unchanged, and no QA file touched. Branch
`claude/react-modernization-plan-u7dgen` at a268541, unmoved; nothing committed.

**Left for the next roles**

- *Cleaner*: `src/actions/api.ts` exports each operation twice - the thunk
  (`loadTodosOperation`) for the reducers to match on and the wrapper
  (`loadTodos`) for the UI to call. Both earn their place today (see the
  `onClick` note), but whether the module wants that shape is a judgement.
- *Architect*: the store shape is now inferrable, as the task predicted -
  `createTodoStore` returns a typed store and `src/containers/index.ts` still
  declares `RootState` by hand with two of the four keys. That is task 12's
  question. Also yours: the four callerless branches, and whether
  `createTodoStore`'s `preloadedState` parameter is production surface or a test
  seam - it is used by the acceptance suite only.
- *Hardener*: the new and changed modules are `src/actions/api.ts`,
  `src/reducers/todos.ts`, `src/reducers/apis.ts`,
  `src/reducers/visibilityFilter.ts`, `src/store/index.ts` and
  `acceptance/steps/todo-state.ts`. One thing to know before scanning
  `src/actions/api.ts`: `reported[reported.length - 1]` is the settled outcome
  because `executeCall` reports exactly one after the started one - a mutant that
  reads `reported[0]` is killed by every success test, but the shape is worth
  seeing. Two smaller notes: your `rules.hardening.test.ts` uses
  `src/constants/ActionTypes` as a stand-in import target and that file no longer
  exists (harmless - it is a string, not a resolved path); and the widened
  acceptance allow list has no planted violation proving the newly allowed
  entries are the only ones, if you want one.
- *QA*: the regression suite passes unchanged and I changed nothing under `qa/`.
  The differential method above is the thing worth re-running independently; the
  two findings I would most want a second opinion on are the serialized error in
  `state.errorMessage` and the claim that nothing reads a dispatch result.

**Open questions**

None blocking. One recorded:

1. I edited `scripts/architecture/rules.mjs` and
   `scripts/architecture/boundaries.spec.mjs` because the module graph moved
   under them and they assert it exactly. Neither belongs to a role in this
   chain by name. If tooling under `scripts/architecture/` is meant to be the
   hardener's or the architect's rather than whoever moves the graph, say so and
   I will note it for the next structural task.

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

## Project manager notes, second round

**On `state.errorMessage` changing shape.** Accepted, and this is the trap the
task file warned about being found rather than slipping through. It was a real
`TypeError`; it is now `{name, message, stack}` with the same name and message.
Nothing reads it, the E2E procedures assert the absence of error UI, and no gate
went red — so the only reason this is on the record is that the coder went
looking for it and reported it.

Accepted on the merits, not merely because nothing broke. Non-serializable
values in Redux state are a documented anti-pattern that RTK's own development
middleware warns about, and the old store emitted two such warnings on a failed
load where the new one emits none. This is the rewrite removing a defect that
was never in scope to remove, in a place no user can see. If a later task ever
surfaces the error to the user, it now has a serializable value to render.

**On `src/actions/local.ts` keeping plain wrappers rather than slice creators.**
Right call, and worth recording because it is a trap with no gate behind it.
`MainSection` and `Footer` pass two of these straight to an `onClick`, and a
`createSlice` action creator invoked with a React event puts that event object
into `action.payload`. The wrappers keep the components unchanged and keep a DOM
event out of the store. Note this is the same class of problem as the item
above, arriving from the opposite direction.

**On who owns `scripts/architecture/`.** The architect owns the rules; a coder
may widen an allow list when the correct call changes the graph, provided it
records the reason and keeps the rule's identity so the hardener's tests still
hold it. That is what happened here and it is the intended model. The architect
brief says as much: allowed-dependency lists encode intent, and when the correct
inward call changes the graph, the list is updated rather than the call bent
around it. The architect on this task should confirm the widening was correct,
not merely that it was recorded.

**On the four uncalled reducer branches.** Still present, still callerless,
invariant intact, now documented in two places. The architect owns the decision
and has a brief line aimed squarely at it: policy used only by tests while an
adapter reimplements it gets wired or deleted. Note these are not quite that
case, since no adapter reimplements them; they are specified behavior with no
caller. Decide deliberately and say why.
