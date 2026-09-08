# Task 09: Extract the todo API client into a testable module

**Track:** Structural
**Chain:** specifier -> coder -> cleaner -> architect -> hardener -> QA

The specifier's job on this track is narrower than the full brief: write Gherkin only for the behavior being moved into a testable module, so the coder has an acceptance target for the extracted logic. Update the E2E procedures from Task 1 only if a workflow's observable behavior would change. It should not; if it must, stop and ask the project manager.

The hardener is in this chain because the task creates a testable module.

**Status:** in progress

## Goal

Move request construction and response interpretation for the todo backend out of the Redux middleware and the action creators, into a testable module with no network dependency. The network lives behind a thin adapter that translates and decides nothing.

## Context

Today the logic is split across two places and neither is testable without a network.

`src/actions/api.ts` builds five request descriptors. Each returns an `ApiActionMessage` carrying a `types` triple, a `callAPI` tuple of `[url, RequestInit]`, a `payload`, and a `json` flag. Notable details that are behavior, not incident:

- `loadTodos` and `addTodo` hit `api/todos/` with a trailing slash; the per-id calls hit `api/todos/${id}` without one.
- `removeTodo` sets `json: false`, so its response body is never read. Every other call sets `json: true`.
- `completeTodo` throws `Error('Expected completed to be non null')` when `completed` is null.
- `editTodo` PATCHes only `{ text }`. `completeTodo` PATCHes only `{ completed }`. Both send the same action type triple.

`src/middlewares/callapimiddleware.ts` executes them. Its behavior:

- An action without a `types` field passes straight through to `next`.
- A `types` field that is not an array of exactly three strings throws `Error('Expected an array of three string types.')`.
- It dispatches the request action first, merging `payload` with `{ type: requestType }`.
- It calls `fetch`, then reads `response.json()` only when `json` is true, otherwise resolves undefined.
- It dispatches success as `payload` merged with `{ json: body, type: successType }`.
- On rejection it calls `console.error(error)` then dispatches `payload` merged with `{ error, type: failureType }`.
- It never checks `response.ok`. An HTTP 500 with a JSON body takes the success path. This is current behavior. Preserve it, and record it in the specifier's note as a defect for the project manager.

## Scope

- Specifier: Gherkin covering request construction for all five operations and response interpretation for both the read and the no-read cases, plus the failure path and the two throwing guards. Behavior of the extracted module only.
- Coder: create the testable module. It builds requests and interprets responses. It touches no `fetch`, no `console`, and no Redux type. Put the network behind an adapter whose only job is to perform a request and hand back status and body.
- Coder: wire the existing middleware to the new module so behavior is unchanged end to end.
- Coder: the shared definitions require the APS acceptance pipeline here, since this is the first structural task. Add the runner adapter for `gherkin-parser` as part of the acceptance pipeline. If that is impractical in this repository, stop and report to the project manager rather than improvising a substitute.
- Keep generated acceptance tests separate from unit tests.

## Out of scope

- Changing what any request sends or what any response produces. Including the trailing-slash inconsistency, the missing `response.ok` check, and the `json: false` on delete. All preserved.
- Replacing the middleware with Redux Toolkit thunks. That is task 10.
- Changing the action type strings or the shape of dispatched actions.
- Touching components, containers, selectors, or reducers.

## Done criteria

- A testable module owns request construction and response interpretation, with no UI, filesystem, network, framework, or device dependency.
- The network adapter translates only. It re-decides no domain question.
- Unit tests fail a plausible wrong implementation, not just the right one.
- Acceptance tests generated from the Gherkin pass.
- Property tests pass, per the architect's assessment.
- Mutation survivors killed on the new module, per the hardener.
- `npm run lint`, format check, `npm run typecheck`, `npm test`, and `npm run build` pass.
- The regression suite from `qa/procedures/` passes unchanged. If any procedure needed editing, the task stops and asks.

## Handoffs

### Specifier

Wrote the Gherkin for the behavior this task extracts. Nothing else changed: no
source, no unit test, no QA procedure, no config.

**Added**

- `features/todo-api-requests.feature` (5 scenarios): what each of the five
  operations builds. Method, path, Accept and Content-Type headers, body bytes,
  outcome names, outcome fields, and whether the answer is read.
- `features/todo-api-outcomes.feature` (4 scenarios): what the client makes of
  an answer. Read success, no-read success, unreadable body, and a call that
  never completes.
- `features/todo-api-refusals.feature` (2 scenarios): the two guards.

`features/` is the APS "common generated paths" location. Generated IR and test
entry points are the coder's to place; APS suggests `build/acceptance/`.

**What the features pin, against the source rather than the task text**

Every claim below was read out of `src/actions/api.ts` and
`src/middlewares/callapimiddleware.ts`, and each matches the Context section.

- `api/todos/` with a trailing slash for load and add; `api/todos/<id>` without
  one for edit, complete and delete. Requests 1-5.
- Load sends no method of its own and no `Content-Type`; on the wire it is a
  GET. The step says "the request method is GET": the effective HTTP method,
  which is what a reader of the descriptor must normalize, since `loadTodos`
  sets no `method` key at all. Writing `method: 'GET'` explicitly sends the
  same request and passes.
- Delete announces `Content-Type: application/json` and sends no body. Kept as
  is, asserted explicitly so nobody tidies it away. Requests 5.
- Edit PATCHes `{"text":...}` only, complete PATCHes `{"completed":...}` only,
  and both carry the `PATCH_TODO_*` triple. Requests 3 and 4.
- Bodies are compared as text, and the add table carries a row whose text needs
  JSON escaping (`He said "hi"`). A concatenating implementation passes the
  other rows and fails that one.
- The started outcome is produced before the call is made, and exactly two
  outcomes are produced per call. That is what "the outcomes are A then B"
  means; the vocabulary comment in the feature says so.
- Outcome fields are the operation's own fields, carried on the started, success
  and failure outcomes alike. Outcomes 1 and 4.
- Delete's answer is never read: neither its status nor its body can change what
  it reports, and its success outcome carries no parsed body. Outcomes 2.
- A read operation whose body will not parse fails. Outcomes 3.
- A call that never completes reports a failure carrying what ended it, and the
  client reports rather than throws. Outcomes 4.
- `completeTodo` refuses a null flag. The source guard is `completed == null`,
  so the examples table has a `null` row and an `undefined` row; both are
  current behavior. Refusals 1.
- Running a call whose outcome names are not three strings refuses with
  `Expected an array of three string types.` and sends nothing. Refusals 2.

**The defect, preserved and specified as it is**

The client never checks `response.ok`. An HTTP 500 whose body parses takes the
success path, and a delete answered 500 succeeds whatever the body says. This is
specified as current behavior in outcomes 1 and 2 (the `status` column carries
200 and 500 rows) and is flagged in a comment above outcomes 1. No fix is
specified. `qa/procedures/21-http-error-status-ignored.md` already characterizes
the user-visible half of it, so no procedure needed editing.

**Deliberate mutation survivors**

Recorded now so the hardener does not read them as gaps. In outcomes 1, 2 and 3
the `status` column, and in outcomes 2 and 3 the `body` column, are not
referenced by any assertion. That is the specification: mutating them must not
change the outcome. They are the only way to say "this input is ignored" in
Gherkin, and removing them would delete the characterization of the defect above
and of the never-read delete body. Every other parameter in all three features
appears in at least one assertion.

**ir-dry-checker**

There is no `ir-dry-checker` in this repository, in `node_modules`, or on the
PATH, and no APS wiring of any kind: no `bb`, no `gherkin-parser`, no
`features/` directory before this task. APS supplies the tool, so I did not
write one and did not improvise a substitute. I cloned
`unclebob/Acceptance-Pipeline-Specification` into my scratch directory, built
its Go fallback commands there (`go build ./cmd/...`; nothing was added to this
repository), and ran the prescribed order per feature: write Gherkin, prune
parameters, `gherkin-parser`, `gherkin-ir-dry-checker`, review.

All three features parse with exit 0. The first dry report drove real edits:

- `the request accepts application/json` and `the request content type is
  application/json` were flagged as possible synonyms. They are different
  headers, so they became `the request accept header is ...` and `the request
  content type header is ...`, with `the request has no content type header`
  for the load.
- `the client reads the response body` and `the client never reads the response
  body` differed by one word while meaning opposite things. The negative is now
  `the client leaves the response body unread`. Same treatment in the outcomes
  feature: `has no json` became `carries no parsed body`.
- A separate literal scenario for JSON escaping was folded into the add outline
  by giving that table a `body` column, which also unified three body
  assertions into one step form.

What remains in the report is one step form per question with different data
per operation, plus opposites that necessarily share words. The checker's own
spec says not to merge on similarity alone; merging any of these would delete a
distinction the source actually makes. No `duplicate-in-scenario` finding was
reported in any feature.

Nothing was hoisted to a `Background`: no scenario in any of the three features
has a setup step, so there is no repeated setup to hoist.

**Naming convention used**

Scenario names are `<feature-slug> <index>`, e.g. `todo-api-requests 3`, and the
name is repeated in a comment immediately above the scenario together with what
it is for. Each file also opens with a comment block naming the feature and
defining its step vocabulary. See the open question below on how literally to
read the convention.

**For the coder**

- The features are neutral about where each behavior lives. In particular the
  outcome-names guard is written as "the client is asked to run a call whose
  outcome names are ...", so it can stay in the middleware or move into the
  module. Put it wherever the module stays free of Redux.
- Three behaviors are deliberately not in the Gherkin because they are not the
  module's, and all three must survive anyway:
  - an action with no `types` field passes straight through to `next`;
  - `console.error(error)` runs before the failure outcome is reported; the
    module must not depend on `console`, so this belongs at the boundary;
  - the success outcome sets `json` to `undefined` for delete rather than
    omitting the key. `toEqual` will not see the difference and
    `toStrictEqual` will.
- Examples cells are strings, per the APS parser spec. In refusals 1 the cells
  `null` and `undefined` mean those JavaScript values, and in refusals 2 the
  `names` cells are JSON. Both conventions are stated in the feature's
  vocabulary comment; step handlers have to honour them.
- Babashka is not installed. Go 1.x is, at `/usr/local/go/bin/go`, and the APS
  Go commands build from the spec repository with `go build ./cmd/...` with no
  network access beyond the clone. That is the shortest route to the runner
  adapter the task asks for.

**Verified**

`gherkin-parser` exit 0 and `gherkin-ir-dry-checker` clean of actionable
findings on all three features; IR spot-checked for parameter and example
fidelity, including the escaped body cell. `npm run format:check` and
`npm run lint` pass with `features/` present (Prettier skips `.feature`, ESLint
does not match it). I did not run `npm test`, `npm run build` or the E2E suite:
no source changed, so there was nothing for them to verify.

**Open questions for the project manager**

None blocking; all three are recorded rather than guessed at silently.

1. The brief says the scenario name is repeated "in a comment immediately before
   the feature". Taken literally that puts scenario names above the `Feature:`
   line, which reads as a table of contents that will drift. I read it as
   "immediately before the scenario" and put the name plus its purpose there.
   Say the word and I will move them.
2. Refusals 1 has an `undefined` row because the source guard is `== null`, not
   `=== null`. It is current behavior, so I specified it. If you would rather
   the spec pin only the documented `null` case and leave `undefined`
   unspecified, that row comes out.
3. The features assume the extracted module reports outcomes under the existing
   `*_REQUEST` / `*_SUCCESS` / `*_FAILURE` names, since the reducers key off
   them and task 10 owns changing that. Nothing here constrains the shape those
   outcomes are delivered in.

**Left for the coder**

The acceptance target is the three feature files. The pipeline itself, the
entrypoint generator, the step handlers and the runner adapter are yours, per
the shared definitions. I built no pipeline and added no runner.

### Coder

Two jobs: the acceptance pipeline, which this repository did not have, and the
extraction. Nothing in `features/` or `qa/` was edited; both were run.

**The acceptance pipeline (APS)**

APS supplies the parser and the mutator and this project ships neither. What it
now ships is the project-specific half the specification names: the entrypoint
generator, the runtime, the step handlers, the runner adapter, and the scripts.

- `scripts/acceptance/aps.mjs` finds the APS commands: `$GHERKIN_PARSER`, then
  `$APS_BIN_DIR`, then `.aps/bin/`, then PATH. It never falls back to a
  substitute; a missing tool is an error that names `npm run acceptance:install`.
- `scripts/acceptance/install-aps.mjs` (`npm run acceptance:install`) builds the
  APS Go commands from a clone of the specification repository into `.aps/bin/`,
  which is gitignored. Babashka is absent here, so this is the documented Go
  fallback route. `$APS_SOURCE` skips the clone; `$GO_BIN` names a Go off PATH.
  Verified both ways: against the specifier's existing checkout, and by cloning
  `unclebob/Acceptance-Pipeline-Specification` fresh over the network.
- `scripts/acceptance/generate-entrypoints.mjs` is the APS
  `acceptance-entrypoint-generator`: exactly two positional arguments, exit 0/1/2,
  one thin Vitest entry point per feature plus
  `metadata/<feature-metadata-name>.json` with `schema_version`, `feature_path`,
  `ir_path`, `hash_scope: generated_files` and an `implementation_hash` computed
  over the generated file alone. The IR does not record which feature it came
  from, so `feature_path` is derived as `features/<ir-basename>.feature`;
  `$ACCEPTANCE_FEATURE_PATH` overrides.
- `acceptance/runtime.ts` expands IR into scenario executions - one per example
  row, one for a scenario with no examples, background prepended, fresh world
  each - resolves placeholders, and routes each step to exactly one handler.
  Unsupported step text, ambiguous step text and a placeholder the row has no
  value for each fail the execution.
- `acceptance/steps/todo-api.ts` is the step vocabulary of the three features,
  bound to `src/todo-api/client.ts` through a stand-in transport. Handlers match
  the unexpanded step text and capture, so one handler serves every row of an
  outline. They honour the two conventions the features declare: a `completed`
  cell reading `null` or `undefined` is that JavaScript value, and an
  outcome-names cell is JSON.
- `scripts/acceptance/run-acceptance.mjs` (`npm run acceptance`) is parse ->
  generate -> execute, rebuilding `build/acceptance/ir/` and
  `build/acceptance/generated/` from scratch each run so a deleted feature
  cannot leave a passing entry point behind.
- `scripts/acceptance/runner-worker.mjs` is the runner adapter the mutator
  drives: newline-delimited JSON jobs in, one response line out,
  `test_success` / `test_failure` / `infrastructure_error`, stdout reserved for
  the protocol. It runs the already-generated entry points against the IR the
  job names via `$ACCEPTANCE_IR`; nothing is regenerated per mutation.

Generated acceptance tests are separate from the unit tests by construction:
they live under `build/acceptance/generated/` (gitignored), run through
`vitest.acceptance.config.mts`, and are matched by neither Vitest project in
`vite.config.mts`. `npm test` gained no acceptance file.

**The extraction**

- `src/todo-api/client.ts` is the testable module: it builds the five requests
  and interprets the answers. No fetch, no console, no Redux, no DOM. A call is
  `{ outcomeNames, fields, request, readsResponseBody }`; an outcome is
  `{ kind, name, fields, carried }`, where `carried` is `{}`, `{ json }` or
  `{ error }`. `executeCall(call, send, report)` reports started, sends, and
  reports what became of it.
- `src/todo-api/fetchTransport.ts` is the adapter and the only `fetch`. It
  translates a request into `fetch` arguments and an answer into a status and,
  when the call asked for it, the body as text. It re-decides nothing: whether
  the body is read is the call's decision, and what it means is the client's.
- `src/middlewares/callapimiddleware.ts` is now the seam only: it discriminates
  API calls, runs them, logs a failure to the console, and dispatches
  `{ ...fields, ...carried, type: name }`.
- `src/actions/api.ts` is now five one-line creators over the module.
  `ApiActionMessage` is the call, so the action creators and the middleware no
  longer each hold half the request.

Every defect the task names is preserved and specified, not fixed: the trailing
slash on load and add against no slash per id, `json: false` on delete,
`Expected completed to be non null` on a loose `== null`, both PATCHes sharing
one triple, and `response.ok` never checked - the status now reaches the client
on every answer and nothing reads it, so a 500 whose body parses still succeeds.

The three behaviors the specifier flagged as outside the Gherkin all survive and
now have unit tests of their own in `src/middlewares/callapimiddleware.spec.ts`:
an action with no call passes to `next`, `console.error` runs before the failure
action is dispatched, and a delete's success action still carries a `json` key
set to `undefined` (asserted with `toStrictEqual`).

One shape change worth naming: the discriminator moved from `types` to
`outcomeNames`, because the message is now the call. Behavior is unchanged -
anything that is not an API call still passes through - and nothing outside
`src/actions/api.ts` and the middleware ever read `ApiActionMessage`.

**Verified**

- `npm run lint`, `npm run format:check`, `npm run build`: pass.
- `npm run typecheck`: 0 errors in four projects. `acceptance/tsconfig.json` is
  new and is now in `scripts/typecheck.mjs`; proved falsifiable by planting a
  type error in `acceptance/steps/todo-api.ts` and watching the gate go red.
- `npm test`: 14 files / 94 tests, up from 11 / 71. All 23 new tests are unit
  tests, in the `unit` project: 15 for the client, 4 for the transport, 4 for
  the middleware. No acceptance test joined this count.
- `scripts/typecheck-gate.spec.mjs` had one test asserting the gate's exact
  project list. Adding the fourth project turned it red, as it was written to;
  the expected line was updated and its comment with it. That file is the
  tooling's own test, not a QA procedure.
- `npm run acceptance`: 3 files / 24 executions, matching the features
  (10 + 8 + 6). Proved falsifiable four ways: a mutated example cell in the IR,
  an unsupported step, a placeholder with no value, and two deliberate breaks in
  `src/todo-api/client.ts` (dropping the trailing slash; never parsing a body),
  each of which failed the run. The module was restored and re-verified.
- Runner adapter: driven by hand over its protocol with three jobs - base IR,
  mutated IR, malformed line - returning `test_success`, `test_failure` and
  `infrastructure_error`, with nothing but protocol lines on stdout.
- Generator: deterministic (two runs, identical bytes), and exits 2 on wrong
  argument counts, 1 on a missing or non-IR input.
- `npm run test:e2e`: 22 passed, before and after, unchanged. `test:e2e:dev` and
  `test:e2e:preview`: 21 passed, 1 skipped each. No procedure was edited or
  needed editing.

**Left for the next roles**

- Cleaner: `src/actions/api.ts` is now a thin naming layer over the client. It
  is kept because task 10 owns the action-creator surface and deleting it would
  move imports for every container; collapse it only if that stays true.
- Architect: the new module boundary is `src/todo-api/` - `client.ts` (no
  environment) and `fetchTransport.ts` (the only `fetch`). `acceptance/` imports
  `client.ts` only, and its tsconfig has no DOM lib, so an accidental import of
  the transport from a step handler fails the type gate rather than passing
  quietly.
- Hardener: for Gherkin mutation, generate into the mutation work tree first,
  then run the mutator against it, so a job runs only the feature under
  mutation:

      node scripts/acceptance/generate-entrypoints.mjs \
        build/acceptance/ir/todo-api-requests.json \
        build/acceptance-mutation/generated
      .aps/bin/gherkin-mutator --feature features/todo-api-requests.feature \
        --generated-dir build/acceptance-mutation/generated \
        --runner-worker "node scripts/acceptance/runner-worker.mjs"

  Give the worker the `node` command directly, never `npm run`: npm writes a
  banner to stdout and that would corrupt the protocol. Two things to expect
  before reading them as gaps. The specifier's declared survivors (the `status`
  columns, and the `body` columns of outcomes 2 and 3) are the specification of
  an ignored input and must survive. Separately, in outcomes 4 the `id`, `text`
  and `error` columns each feed both the When and the Then, so mutating one
  changes the input and the expectation together; that scenario may have no
  killable cell as written, which is a question for the specifier and the
  project manager, not something to fix in a step handler.
- QA: `npm run acceptance` needs `npm run acceptance:install` once first, and
  that needs Go plus network. Nothing else in the repository depends on it.

**Open questions for the project manager**

1. Acceptance is not a CI step. `.github/workflows/nodejs.yml`'s own comment
   argues a gate nobody runs automatically barely exists, and I agree, but
   adding it means installing Go and cloning the APS repository on every CI run
   - a third-party fetch inside the gate. That is a call about this project's
   supply chain rather than about this task, so I left CI alone and recorded it
   here.
2. `npm test` is now 14 files / 94 tests. The pin I was given covers acceptance
   tests staying out of that count, which they do; the growth is entirely new
   unit tests for new code. Say the word if the number itself was meant to hold.

### Cleaner

Behavior-preserving cleanup of what the coder left. Four source edits and one
split in the acceptance scripts. Nothing in `features/` or `qa/` was touched;
both were run.

**Changed**

- `src/actions/api.ts` was five one-line functions that renamed five client
  functions and annotated them with a type imported back out of the middleware.
  It is now five renamed re-exports of the same five functions. The module and
  every exported name stay exactly where they were, so nothing outside it
  moved, but the parameter chains are gone, and so is the detour through
  `../middlewares/callapimiddleware` to name a type that lives in
  `../todo-api/client`. Coverage found the same thing from the other side: two
  of those wrappers (`editTodo`, `completeTodo`) were never called by any unit
  test, and the file read 60% covered. There is nothing left to cover.
- `src/middlewares/callapimiddleware.ts` lost the `ApiActionMessage` alias.
  After the change above nothing outside the file used it, and inside the file
  it was a second name for `TodoApiCall`. The two casts became one named
  question, `isApiCall(action)`; the `// Normal action: pass it on` comment
  went, because the line under it says that. The predicate is deliberately a
  truthiness test on `outcomeNames` and nothing more, so what reaches `next`
  and what does not is unchanged, down to `dispatch(null)` still throwing a
  TypeError as it did before.
- `src/todo-api/client.ts`: `LOAD`/`POST`/`PATCH`/`DELETE` became
  `LOAD_OUTCOMES`/`POST_OUTCOMES`/`PATCH_OUTCOMES`/`DELETE_OUTCOMES`, because
  `outcomeNames: POST` next to `method: 'POST'` reads as an HTTP method and is
  not one. `ACCEPTS_AND_SENDS_JSON` became `ACCEPTS_AND_ANNOUNCES_JSON`: the
  delete uses it and sends no body, so the old name was false exactly where the
  behavior is a defect, and "announces" is the word the module's own doc
  comment and `todo-api-requests 5` already use. One doc comment added, on
  `parsedBody`, saying that its throw is what turns an unreadable body into a
  failure outcome - the only non-obvious control flow in the module.
- `scripts/acceptance/runner-worker.mjs` split. Its decisions - read a job
  line, classify a finished run, read an APS duration - moved into
  `scripts/acceptance/runner-protocol.mjs`, which spawns nothing and touches no
  process; the worker is now stdin, `spawnSync`, stdout. This is the split the
  repository already uses for `typecheck.mjs` and `typecheck-gate.mjs`, and the
  reason is the same one: the mutator scores a mutation by the outcome this
  adapter reports, so confusing one outcome for another is a way to report a
  mutation score nobody measured. `scripts/acceptance/runner-protocol.spec.mjs`
  pins the mapping in both directions (14 tests, in the existing `scripts`
  project). Behavior is byte-identical; see Verified.

**Defects preserved, and one of them louder**

The trailing slash on load and add against no slash per id, `json: false` on
delete, the loose `== null` guard, the two PATCHes sharing one triple, and
`response.ok` never checked, are all exactly as the coder left them. None of
them is any more tempting after this pass except one: renaming the header
constant to `ACCEPTS_AND_ANNOUNCES_JSON` makes it more obvious that the delete
announces a content type for a body it never sends. That is deliberate - the
name now says what the code does - and the defect itself is untouched.

**Coverage: run, with a provider installed but not persisted**

No coverage provider is in `package.json`, so I installed one into
`node_modules` only, with `npm install --no-save @vitest/coverage-v8@5.0.0`.
`package.json` and `package-lock.json` are unchanged (md5-checked before and
after), and `npm ci` will remove it. Reproduce with:

    npx vitest run --project unit --coverage.enabled --coverage.provider=v8 \
      --coverage.reporter=text --coverage.include='src/**'

I did not persist the dependency. Adding one to `package.json` changes what CI
installs and what the release checks carry, and this project has consistently
routed that kind of decision to a numbered tooling task rather than smuggling
it into a structural one - the acceptance-in-CI question went to 14 for the
same reason. Recommendation, not a decision I took: if later cleaners are
expected to measure CRAP honestly, the provider and a `coverage` script belong
in task 14 alongside it.

What it said. Before this pass, `src/` was 87.28% statements / 91.2% functions,
with every file this task created at 100% and `src/actions/api.ts` at 60%.
After: 87.87% / 93.1%, and `src/actions` no longer appears in the report at
all. The acceptance run measures its own side - `acceptance/runtime.ts` 88.6%,
`acceptance/steps/todo-api.ts` 93.9%, `src/todo-api/client.ts` 100%,
`src/todo-api/fetchTransport.ts` 0%, which is the point of the adapter: the
acceptance suite never touches the network shell, and the unit suite covers it
at 100%.

    npm run acceptance -- --coverage.enabled --coverage.provider=v8 \
      --coverage.reporter=text --coverage.include='acceptance/**' \
      --coverage.include='src/todo-api/**'

Every remaining uncovered line in `src/` is code this task is forbidden to
touch: `index.tsx`, `containers/FilterLink.ts`, `reducers/`, `selectors/`,
`components/TodoTextInput.tsx`. Tasks 10 to 13 own them. I left them alone.

**CRAP and the mixed-job hint**

With coverage measured, CRAP on this task's files reduces to complexity almost
everywhere: the client, the transport and the middleware are fully covered, and
their most branching function is `outcomeNamesOf` at 4, so nothing in `src/` is
near the gate.

One file was over it. `runner-worker.mjs`'s `respond` carried seven decisions
and had no automated test at all - CRAP 72 - and `milliseconds` another four at
zero coverage. Both are now in `runner-protocol.mjs` under test. What is left
in the worker is a shell: read a line, spawn, write a line. Adapter shells stay
out of the test tooling, per the brief.

Two things I did not split, deliberately.

- `src/todo-api/client.ts` builds requests and interprets answers, which can be
  read as two jobs. The task's own done criteria names one module owning both,
  and where that boundary should sit is the architect's question, not mine.
- `acceptance/steps/todo-api.ts` is 340 lines but one job: bind the features'
  vocabulary to the client. Splitting the world and the stand-in transport out
  of the definition table would export ten helpers across a seam to save a
  scroll, which trades cohesion for cross-module knowledge in the wrong
  direction.

**DRY**

The five request builders in the client repeat a shape, and I left them
repeating it. A `jsonCall(...)` helper taking five arguments would hide the
trailing-slash difference and the delete's missing body behind a parameter
list, which is precisely what this task is not allowed to do. Same answer for
the four repeated header literals in `client.spec.ts`: an expectation written
out at the assertion is what makes each test independently falsifiable.

**Not mine to change, recorded**

1. **The runner adapter reports a false kill when no test file matches.**
   Vitest exits 1 when it finds no test files, and the adapter reads exit 1 as
   `test_failure`, which the mutator counts as a killed mutation. So a mutation
   run pointed at an empty or mis-spelled `--generated-dir` reports every
   mutant killed and looks like a perfect score. Verified: an
   `ACCEPTANCE_GENERATED_DIR` with no files exits 1. This is current behavior
   and changing it is an error-handling policy change, so I did not; the
   hardener should check that the first job of a run reports `test_success`
   against unmutated IR before trusting any kill count.
2. `dispatch(null)` throws a TypeError in the middleware's discriminator,
   before any of this task's code runs. Preserved exactly; noted because
   `isApiCall` is now the obvious place someone would "fix" it.
3. `timeoutMilliseconds`'s `?? 1000` cannot be reached - the regex admits only
   `ms`, `s`, `m` or nothing, and the table covers all four. Left as written:
   removing it buys nothing and costs a type assertion.

**Verified**

Every command below was run after the last edit, from a clean working tree
apart from these changes.

- `npm run lint`, `npm run format:check`, `npm run build`: pass.
- `npm run typecheck`: 0 errors in four projects.
- `npm test`: 15 files / 108 tests, up from 14 / 94. The 14 new tests are the
  runner-protocol spec, in the `scripts` project. No acceptance test joined the
  count; `npm run test:unit` is 13 files / 78 tests, unchanged.
- `npm run acceptance`: 3 files / 24 executions, unchanged.
- Runner adapter, driven by hand over its protocol exactly as the coder did it,
  after the split: base IR -> `test_success`, an IR with the trailing slash
  mutated out -> `test_failure`, an unreadable line -> `infrastructure_error`
  with `unreadable job: ...`, a job with no `feature_json` ->
  `infrastructure_error` keeping its id. Four responses, nothing on stderr,
  nothing but protocol lines on stdout.
- `npm run test:e2e`: 22 passed. `test:e2e:dev` and `test:e2e:preview`: 21
  passed, 1 skipped each. No procedure was edited or needed editing.

**Left for the architect**

- The module boundary is unchanged: `src/todo-api/client.ts` (no environment),
  `src/todo-api/fetchTransport.ts` (the only `fetch`). What did change is that
  `src/actions/api.ts` no longer imports from `src/middlewares/`, so the
  dependency arrows now run one way: actions and middleware both point at
  `todo-api/`, and nothing points back.
- Whether request construction and answer interpretation want to be two modules
  is the open boundary question, stated above.
- `scripts/acceptance/` now has the same shape as `scripts/typecheck*.mjs`: a
  decision module with a spec, and a process shell around it. `aps.mjs`,
  `run-acceptance.mjs`, `install-aps.mjs` and `generate-entrypoints.mjs` are
  still shells with no spec; none of them is over the CRAP gate, and I did not
  invent tests for them.

**Open questions for the project manager**

1. The coverage provider, above: measured with, not persisted. If you would
   rather the repository carry it, it is one devDependency and a script, and
   task 14 is where I would put it.
2. `npm test` is 15 files / 108 tests. Read against your second-round note the
   growth is fine - the new tests are unit tests of tooling, in the `scripts`
   project, and no acceptance test joined the count - but it is the second task
   in a row to move that number, so I am naming it rather than assuming.

### Architect

### Hardener

### QA

## Project manager notes

**On the specifier's open question about `undefined`.** Keep the row. The guard
is `completed == null`, a loose equality, so it catches `undefined` as well as
`null`. Specifying both is a faithful description of what the code does, and
dropping the row would leave half the guard unspecified. If a later task ever
tightens that to `===`, the row is what makes the change visible.

**On `ir-dry-checker`.** The specifier could not find it in this repository, in
`node_modules`, or on the PATH, and did not invent one. It cloned the APS
repository into its scratch directory, built the Go fallback commands there
without adding anything to this project, and ran the real parser and dry checker
against each feature. That is the right handling of a tool named in a brief that
the project does not have, and its first report drove real edits rather than
being run for form.

The same route is available to the coder for the runner adapter this task
requires: Babashka is absent, but Go is at `/usr/local/go/bin/go` and the APS
commands build with `go build ./cmd/...`.

## Project manager notes, second round

**On the "11 files / 71 tests" pin.** It was the principle, not the number. What
had to hold is that generated acceptance tests stay out of `npm test`, so the
unit suite keeps meaning what it meant. 14 files / 94 tests is a good outcome:
23 new unit tests, no acceptance test in the count. Later roles should read the
pin the same way. Adding unit tests is welcome; moving acceptance tests into
`npm test` is not.

**On whether acceptance belongs in CI.** Not now, and recorded rather than
dropped. Running it there means installing Go and cloning a third-party
repository inside the gate, which is both a fragility and a supply-chain surface
that the rest of this project's CI does not have. Pinning the APS clone to a
commit would be the minimum before it could be considered.

I am aware this sits badly with a line I have used repeatedly: a gate nobody
runs automatically is close to one that cannot fail. So it does not rest on
nothing. **Every QA role on tasks 10 through 13 runs `npm run acceptance` as part
of its release checks**, and their briefs already name generated acceptance
tests. It is added to task 14's scope so the CI question is numbered rather than
forgotten.

**On outcome 4 possibly having no killable cell.** Noted for the hardener. Its
brief already says to prefer deleting a step that exposes a no-op over adding
example columns that only assert the no-op. If it turns out the scenario cannot
be mutated as written, that is a specifier question and I will route it, not the
hardener's to fix by editing `features/`.

**On the typecheck-gate spec expectation.** Updating it was right. That file is
tooling's own test and its project-list assertion was written to go red exactly
when a project is added or dropped, which is what it did. That is the test
working, not the test being in the way.

## Project manager notes, third round

**On the false kill in the runner adapter.** This is the fifth false green found
in this project and the first inside the mutation infrastructure, which makes it
the worst placed of them: an adapter that reports every mutant killed when no
test ran would not merely miss a defect, it would certify the hardener's entire
run as sound. The cleaner was right to verify it, right to leave it (changing it
is an error-handling policy change its brief forbids), and right to tell the
next role rather than absorbing it.

Routed to a fresh coder now, ahead of the architect, because the hardener runs
after the architect and its results are worthless until this is fixed.

**On persisting the coverage provider.** Not now, and the cleaner was right to
install it with `--no-save` and verify `package.json` and the lockfile were
untouched. Added to task 14 with the acceptance-in-CI question, since both are
"what does CI install" decisions and belong together.

**On `npm test` moving to 15 files / 108 tests.** Fine, and the right shape. The
pin was always that acceptance tests stay out of that count, not that the number
holds. `test:unit` at 13 files / 78 tests and the new protocol tests in the
`scripts` project is exactly the separation the two projects exist for.
