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

### Coder (repair: runner false kill)

The false kill the cleaner recorded is fixed. `scripts/acceptance/` only; no
`src/`, `qa/` or `features/` file was touched, and no acceptance test's
assertions changed.

**Reproduced first, on the unrepaired adapter**

Driven over the protocol exactly as the mutator drives it - three jobs on
stdin, three responses on stdout:

    id=baseline   outcome=test_success
    id=empty-dir  outcome=test_failure   | No test files found, exiting with code 1
    id=typo-dir   outcome=test_failure   | No test files found, exiting with code 1

`empty-dir` pointed `generated_dir` at an empty directory, `typo-dir` at
`build/acceptance/generatd`. Both reported the outcome that kills a mutation
while running nothing, so a whole run against a mis-spelled directory would
have scored 100%.

Two more ways to reach the same false kill, both found while fixing it and both
of which the mutator can produce on its own:

- an IR mutated down to `"scenarios": []` - valid IR, three generated files
  load, zero tests are declared, Vitest exits 1;
- a generated file that throws while being collected - one file, zero tests,
  exit 1.

**The fix**

Vitest's exit code cannot answer "did a test fail", because 1 covers both a
failing test and no test file at all. So the worker now asks the run what it
ran: it passes `--reporter=default --reporter=json --outputFile.json=<scratch>`
and reads the JSON report back, and `classifyRun(run, report)` classifies on
both. The rule is one sentence - **a kill requires a test that ran and
failed**:

- no readable report, or an exit code that is neither 0 nor 1 -> infrastructure
- `ran === 0` -> infrastructure, whatever the exit code, worded by what
  happened: `no test files matched, so nothing ran` when nothing was collected,
  `N test files matched, but no test ran` when files loaded and declared none
- exit 0 with tests -> `test_success`
- exit 1 with a failing test -> `test_failure`
- exit 1 with no failing test -> infrastructure

`readRunReport(json)` (new, in `runner-protocol.mjs`) reads the reporter's
`numTotalTests`, `numFailedTests` and `testResults` into `{ran, failed, files}`
and returns `undefined` for anything it cannot read whole - a half-read report
is treated as no report, not as a result. The report path is per worker process
and per job, and the file is deleted after it is read, so parallel workers do
not share one and none is left behind.

The split the cleaner made is kept: `runner-protocol.mjs` decides and spawns
nothing, `runner-worker.mjs` is stdin, `spawnSync`, a file read, stdout.

**TDD**

Tests first: eight new assertions in `scripts/acceptance/runner-protocol.spec.mjs`
went red against the old adapter (the false-kill case failed with
`test_failure` where `infrastructure_error` was expected), then the protocol
change turned them green. The spec is 22 tests, up from 14; the existing
success/failure cases now pass a report alongside the exit code, which is the
only change to what they assert.

**Verified, after the last edit**

- The four outcomes the brief asks for, driven over the protocol end to end:
  baseline IR -> `test_success` (3 files, 30 tests); empty `generated_dir` and
  mis-spelled `generated_dir` -> `infrastructure_error`, `no test files
  matched, so nothing ran`; IR with the trailing slash mutated out ->
  `test_failure` (3 of 30 tests failed); `"scenarios": []` ->
  `infrastructure_error`, `3 test files matched, but no test ran`; an
  uncollectable generated file -> `infrastructure_error`, `1 test file
  matched, but no test ran`; a `feature_json` that does not exist ->
  `infrastructure_error`. Nothing but protocol lines on stdout; no scratch
  report left in the temp directory.

  Reproduce the first two with:

      mkdir -p /tmp/empty-gen
      printf '%s\n' \
        '{"id":"empty","feature_json":"build/acceptance/ir/todo-api-requests.json","generated_dir":"/tmp/empty-gen"}' \
        '{"id":"base","feature_json":"build/acceptance/ir/todo-api-requests.json"}' \
        | node scripts/acceptance/runner-worker.mjs

- `npm run lint`, `npm run format:check`, `npm run build`: pass.
- `npm run typecheck`: 0 errors in four projects.
- `npm test`: 15 files / 116 tests, up from 15 / 108. The 8 new tests are all
  in the `scripts` project; `npm run test:unit` is 13 files / 78 tests,
  unchanged, and no acceptance test joined the count.
- `npm run acceptance`: 3 files / 24 executions, unchanged.
- `npm run test:e2e`: 22 passed. `test:e2e:dev`, `test:e2e:preview`: 21 passed,
  1 skipped each.

**The baseline safeguard: the hardener's procedure, not this adapter**

The cleaner's second suggestion - that a run's first job must report
`test_success` against unmutated IR - belongs in the mutation procedure, and I
did not put it in code.

- Not the adapter. It is told one job at a time and is never told which IR is
  the original, so enforcing this would mean holding run-level state and
  guessing which job is the baseline - an adapter re-deciding a question that
  is not its own. The nearest thing it could do instead, comparing each job's
  test count against the first job's, would be wrong: a mutation that drops an
  example row legitimately lowers the count.
- Not a run script, because this repository has none for mutation. The
  hardener drives `gherkin-mutator --runner-worker ...` itself; writing a run
  script now would be writing the hardener's procedure for it, ahead of the
  role that owns it.
- So: the hardener's procedure. It is the role that configures a run, and the
  baseline claim is about a run's configuration. The check is one job over the
  same worker, exactly the `id=base` line in the command above, and it must
  answer `test_success` before any kill count from that run is believed. That
  requirement is now written into the worker's own doc comment, next to the
  protocol it implements, so the next person to drive it reads it there.

**Left for the next roles**

- Hardener: run the baseline job above before the mutation run, and treat any
  `infrastructure_error` in a run's responses as a run to investigate rather
  than a mutant to score. `infrastructure_error` now appears for real
  misconfiguration where a kill used to appear silently, so a first run may
  surface configuration this project has never had to notice.
- One thing I considered and did not do: refusing a job whose `feature_json`
  does not exist before spawning Vitest. It already reports
  `infrastructure_error` (verified above), so this is diagnostics, not
  correctness - the message would name the missing IR instead of saying no test
  ran. Cheap if a later role wants it; out of scope for a repair.
- `scripts/acceptance/aps.mjs`, `run-acceptance.mjs`, `install-aps.mjs` and
  `generate-entrypoints.mjs` are still shells with no spec, as the cleaner left
  them.

### Architect

Reviewed in the brief's order: UI/core separation, dependency rule, information
hiding, then local clarity. Two source changes, one acceptance-pipeline change,
and the two things this pass owed the project: boundary checks and property
tests. Nothing in `features/` or `qa/` was edited; both were run.

**Task 04's finding: the direction is fixed, not moved**

Task 04's architect found that every action creator returned `ApiActionMessage`,
imported from the middleware, whose `callAPI` field was typed
`[RequestInfo, RequestInit]` - DOM `fetch` types - so the transport's shape
reached into policy and the arrow pointed from the creators *to* the adapter. It
judged that the direction, not the duplication, was the real problem.

The extraction fixed the direction. `src/todo-api/client.ts` declares
`TodoApiRequest`, `TodoApiAnswer` and `SendRequest` itself, in its own
vocabulary - a method, a path, a header map, a body string, a status - and
`fetchTransport.ts` imports that interface and implements it. The high-level
module owns the interface; the low-level module points inward at it. The client
imports nothing at all, which is now asserted rather than asserted-in-prose.

Two qualifications, because "fixed" should not be read wider than it is.

1. **The proof the coder cited does not exist.** Its note says an accidental
   import of the transport from a step handler "fails the type gate rather than
   passing quietly", because `acceptance/tsconfig.json` has no DOM lib. I
   checked, and it does not: `@types/node` declares global `fetch`, `Response`
   and `RequestInit`, so importing `src/todo-api/fetchTransport.ts` from
   `acceptance/steps/todo-api.ts` compiles clean, and so does writing
   `fetch(...)`, `console.log(...)` or `process.env` directly inside
   `client.ts`. Only DOM-*only* names such as `document` are caught. Reproduce
   by appending `export const p = () => fetch('x')` to `client.ts` and running
   `npx tsc -p acceptance/tsconfig.json`: exit 0. The boundary was real, the
   mechanism named for it was not. That is what the lint block and the import
   check below are for.

2. **One residue of the old direction is still there, and belongs to task 10.**
   `ApiActionMessage` is gone, but the request itself still travels through
   Redux: `addTodo('Buy milk')` returns a `TodoApiCall` that holds a method, a
   path, headers and a body string, and that object is what the UI dispatches.
   No DOM type reaches policy any more - the finding is answered - but an HTTP
   request shape still rides in an action, because in a middleware design the
   action *is* the command. Task 10 replaces the middleware with thunks and the
   creators stop returning requests at all. I did not pull it forward: doing so
   means changing what is dispatched, which this task's scope forbids twice
   over.

**Changed: the middleware stopped re-deriving what the client knows**

`isApiCall` lived in `callapimiddleware.ts` as `Boolean((action as
Partial<TodoApiCall>).outcomeNames)` - an adapter casting into the policy
module's type to answer a question about that type. It is now
`isTodoApiCall(message)`, exported from `client.ts`, and the middleware asks it.
Behavior is identical, down to the parts that are accidents: an empty
`outcomeNames` array is truthy and is still recognised, then refused by
`executeCall`; `dispatch(null)` still throws a `TypeError` reading the field off
`null`. Both are now unit-tested rather than implied - four tests in
`client.spec.ts` and one in `callapimiddleware.spec.ts`, which is where the
`null` throw is observable. My first draft of that test asserted an empty array
was *not* recognised; it went red, which is the test doing its job on me.

The middleware is now what its own doc comment claims: discriminate, run, log a
failure, dispatch. It holds no knowledge of how a call is shaped.

**Changed: an import cycle in the acceptance pipeline**

`acceptance/runtime.ts` imported `./steps` to wire `runGeneratedFeature`;
`acceptance/steps/todo-api.ts` imports the runtime's types. Runtime -> steps ->
runtime. It erases at run time, being type-only in one direction, but it is
still a generic engine importing one project's vocabulary, which is the same
direction error as the one above.

`runGeneratedFeature` moved to a new `acceptance/run-feature.ts`, the only
module that knows both, and `generate-entrypoints.mjs` now points generated
entry points at it. The runtime imports `node:fs` and `vitest` and nothing else.
`npm run acceptance` is unchanged at 3 files / 24 executions, and the mutation
path still works: I drove the runner adapter by hand with a baseline job
(`test_success`, 10 tests) and an IR with the trailing slash mutated out
(`test_failure`, 10 of 10) against `build/acceptance-mutation/generated`.

**Boundary checks: which four are worth encoding, and which is not**

The brief named four boundaries this project now holds by convention. My
judgment on each, and where it landed:

- **`client.ts` must not touch the network or the console** - encoded, in
  `eslint.config.js`. `no-restricted-globals` over `fetch`, `console`, `window`,
  `document`, `process`, `Date` and the rest, plus `no-restricted-properties`
  for `globalThis.*` and `Math.random`. Lint is the only tool in this repository
  that can say this: as shown above, the type gate cannot. Verified by planting
  five leaks in one function and getting five errors.
- **`client.ts` must depend on nothing, and `fetchTransport.ts` only on it** -
  encoded, as allowed-dependency lists in `scripts/architecture/boundaries.mjs`.
- **`src/test-support/` must not be reachable from shipped code** - encoded,
  same place. This one was live: `src/test-support/fetch.ts` calls `vi`, which
  does not exist in a bundle, so a shipped module importing it would lint,
  typecheck and build and then fail in the browser.
- **`qa/` and `features/` are owned by other roles** - *not* encoded, and I do
  not think it should be. Ownership is a process rule about who edits a file,
  and no lint rule or import check can express it; a `CODEOWNERS` file that no
  review process reads would be a gate that cannot fail, which is the thing this
  project keeps finding and removing. The task chain is the enforcement. What I
  did encode is the direction that *is* mechanical: `src/**` may not import from
  `qa/`, `acceptance/`, `properties/`, `scripts/`, `build/` or `features/`.

One boundary is not checkable and I want to be plain about it. **"The transport
re-decides no domain question" cannot be mechanically enforced.** The nearest
proxies are the allow-list (it may import only `client.ts`) and the fact that
the acceptance and property suites both measure `fetchTransport.ts` at 0%
coverage while covering `client.ts` fully - the suites reach the policy without
touching the shell. Neither proves it. A reviewer reading `fetchTransport.ts`
for a path, a verb, a header or an outcome name is still the check.

*How it is wired.* `scripts/architecture/imports.mjs` reads a module's import
targets; `scripts/architecture/boundaries.mjs` holds `BOUNDARY_RULES` and
decides, reading no files;
`scripts/architecture/boundaries.spec.mjs` proves the checker can say no, then
runs the real rules over `src/`, `acceptance/`, `properties/` and `scripts/`.
It is a spec in the existing `scripts` project rather than a new command, so
`npm test` runs it and CI runs `npm test`; a new command is a new thing to
forget. Rules are data with a `reason` each: when a later task's correct inward
call changes the graph, widen the list in the same change - that is the point of
keeping intent as data - but do not let the graph change while the list still
claims otherwise.

Verified falsifiable five ways, each planted and then removed: policy importing
`redux`; the transport importing a reducer; a component importing
`test-support`; the property suite importing the transport; and the acceptance
cycle above put back. All five went red, and the cycle case red on the cycle
test specifically.

One trap worth recording, because I fell into it. The first import regex read
`'Counterexample: 37 (shrunk from'` in a test file as an import and invented an
edge. The patterns now require an import or export clause, and the spec asserts
the exact edge list of the modules whose boundaries this task drew - so an
over-reading pattern fails there rather than passing everywhere.

**Property tests: a tiny runner, not a dependency**

No framework was installed and installing one would have decided a question this
project has twice routed elsewhere: the coverage provider and the acceptance
toolchain both went to task 14 as "what does CI install". A property suite that
only runs after an unrecorded `npm install` is a gate nobody can run, so I built
the runner instead. `package-lock.json` is byte-unchanged; `package.json` gained
one script.

`properties/tiny-check.ts` is about 280 lines: a seeded PRNG, `forAll` with
shrinking, and arbitraries for integers, booleans, text, elements, tuples and
arrays. Failures are reproducible - the seed is fixed unless `$PROPERTY_SEED`
says otherwise - and the cost of that, a fixed sample, is stated in its own doc
comment. `properties/tiny-check.property.test.ts` is the runner's own
falsifiability: known-false properties asserted to fail, and the shrinker
asserted to arrive at exactly `37`, `"\""`, `[0,0]` and `[5,true]`. A property
runner that cannot report a counterexample is the most expensive kind of green.

`properties/todo-api-client.property.test.ts` covers the categories the brief
lists: round trips (a body parses back to the text it was given, for every
text), input ranges (every status 100-599; every unusable outcome-names array),
conservation (the call's fields ride unchanged on both outcomes), idempotence
(building twice gives the same call), ordering (exactly two outcomes, started
first), invariants (`readsResponseBody` iff not DELETE; a body iff POST or
PATCH; `Accept` always JSON), and parse/format stability.

Falsifiable against a plausible wrong implementation, not just the right one.
Planting a concatenating body builder failed the round trip and shrank to
`"\n"` - a case no table in `features/` has, since the feature's escaping row
uses a quote. Planting the `response.ok` check failed four properties and shrank
the status to exactly `400`.

*Where they run.* `npm run properties`, its own Vitest config, its own tsconfig
project (the typecheck gate is now five projects, and
`scripts/typecheck-gate.spec.mjs` went red on its project-list assertion exactly
as written, as it did in the coder's pass). No property test joined `npm test`.

*Coverage assessment beyond this module.* The strongest remaining candidate is
`src/reducers/todos.ts`: "ADD_TODO allocates an id no todo holds" is an
invariant that task 10's done criteria already singles out, and a property over
it would be a real net for that rewrite. I did not write it. This task's scope
says reducers are out of scope, and a property suite reaching into a module task
10 is about to replace would be written against the wrong side of that change. I
would give it to task 10's architect, with this runner already in place.

**The `response.ok` defect: louder, and deliberately so**

More visible than before, in three ways, and none of them fixed. The status is
now a named field on `TodoApiAnswer` that arrives on every answer and is read by
nothing, so a reader sees it go nowhere. The property named "the status never
decides success or failure" says so over the whole range, which is a stronger
statement of the defect than the 200/500 rows in `features/todo-api-outcomes`.
And planting the fix is now a one-line experiment whose failure output names
`400`.

That is the right level of visibility and it is a trap for the next role: the
one-line `if` is more tempting than it has ever been. It stays. Fixing it
changes what `qa/procedures/21` records, which by `PLAN.md`'s rule means the
specifier rewrites the procedure first and the task stops and asks. The property
that pins it says this in a comment above itself, and deleting that property is
part of any future fix rather than a tidy-up.

The other preserved defects are untouched and now pinned harder too: the
trailing slash is asserted for every id and every text, `json: false` on delete
is asserted at every status and every body, and the loose `== null` guard is
asserted for `null` and `undefined` at every id.

**Not mine to change, recorded**

1. `src/selectors/index.ts` imports `RootState` from `src/containers/index.ts` -
   the domain asking the UI adapter layer for the shape of state. This is task
   04's architect's finding, `PLAN.md` records the defect it causes, and task 12
   owns it. My boundary rules deliberately do not cover `src/containers/**` or
   `src/selectors/**`; writing a rule that the next three tasks must violate on
   their way to fixing it would be noise. Task 12's architect should add the
   rule once the arrow is turned.
2. The outcome names are written twice. `client.ts` holds all twelve;
   `src/constants/ActionTypes.ts` holds four of them and `src/reducers/apis.ts`
   holds the other eight as bare literals in a switch. The client owns those
   names - it produces them - so the reducers should ask it. I did not do it:
   the only way to remove the duplication is to make the constants module import
   from the client, which needs literal types in `OutcomeNames` and touches
   reducers, and task 10 rewrites both sides.
3. `TodoApiOutcome.carried` names its key `json`, which is a legacy DTO name for
   "the parsed body". Preserved, since the reducers key off it. Task 10.
4. `scripts/acceptance/aps.mjs`, `run-acceptance.mjs`, `install-aps.mjs` and
   `generate-entrypoints.mjs` are still shells with no spec, as the cleaner and
   the repair coder left them. None is over the CRAP gate.

**Verified, after the last edit**

- `npm run lint`, `npm run format:check`, `npm run build`: pass.
- `npm run typecheck`: 0 errors in five projects.
- `npm test`: 16 files / 139 tests, up from 15 / 116. `test:unit` 13 files / 83
  tests (up from 78: four for `isTodoApiCall`, one for the `null` throw);
  `scripts` 3 files / 56 tests (up from 42: 14 for the boundary checker). No
  acceptance test and no property test joined the count.
- `npm run acceptance`: 3 files / 24 executions, unchanged.
- `npm run properties`: 2 files / 26 tests. New command.
- Runner adapter after the generator change: baseline job -> `test_success`
  (10 tests), trailing-slash-mutated IR -> `test_failure` (10 of 10).
- `npm run test:e2e`: 22 passed. `test:e2e:dev`, `test:e2e:preview`: 21 passed,
  1 skipped each. No procedure was edited or needed editing.
- Coverage, measured with the provider that is already in `node_modules` as a
  vitest optional peer (`package.json` and `package-lock.json` unchanged, checked
  after): `scripts/architecture/` 100% statements, 100% functions, 87.5%
  branches. The property suite alone reaches `src/todo-api/client.ts` at 96%
  and `fetchTransport.ts` at 0%, which is the adapter working as intended.

**Left for the hardener**

- The mutation procedure is unchanged; only the generated entry points' import
  specifier moved, from `acceptance/runtime.ts` to `acceptance/run-feature.ts`.
  The command in the coder's note still applies verbatim. Run the baseline job
  first, as the repair coder's note requires.
- `npm run properties` is a second suite that can kill a Gherkin mutant nobody
  intended - it is not wired into the mutator and should not be. If a mutation
  survives the acceptance run but a property already covers it, that is worth
  saying in your note rather than treating as a gap in `features/`.
- `scripts/architecture/boundaries.spec.mjs` is unit tests in the `scripts`
  project, in scope for mutation like the rest of that project. Its own
  falsifiability is proved by five planted violations, above.

**Left for QA**

- One new release check: `npm run properties`. It needs no Go, no clone and no
  network - only what `npm ci` already installs - so it is not in the same
  position as `npm run acceptance`.
- `npm test` is now 16 files / 139 tests and covers the boundary checker, so a
  red `scripts` project may now mean an architecture violation rather than a
  tooling bug. The failure names the rule and its reason.

**Open questions for the project manager**

1. **Should `npm run properties` go into CI?** I did not touch
   `.github/workflows/nodejs.yml`. The argument that kept `npm run acceptance`
   out - installing Go and cloning a third-party repository inside the gate -
   does not apply here: the runner is in-repository and the command needs
   nothing `npm ci` does not already install. Against it: one more job step, and
   CI content has consistently been your call rather than a structural task's.
   My recommendation is to add it, and I have left it out rather than assume.
2. **`npm test` moved again, to 16 files / 139 tests.** Read against your
   standing ruling the shape is right - no acceptance test and no property test
   in the count, and the growth is 5 unit tests plus 14 tooling tests - but it is
   the third task in a row to move that number and the third role to name it.
3. **The reducer property tests, above.** I judged them task 10's, not mine, on
   scope. If you would rather have them now as a net *before* the rewrite rather
   than after, say so and they are a short addition to `properties/` - the
   runner is already there. Note this cuts against the out-of-scope line in this
   task's own file, which is why I am asking rather than doing.

### Hardener

Mutation hardening. Six modules mutated one at a time, then the three features
through `gherkin-mutator --level soft`, then CRAP and DRY. Nothing in `qa/` was
touched; `features/` was run, not edited, but the mutator writes a manifest into
it - see the open question below. Every command in the release list was re-run
after the last edit.

**How mutation was run at all, since this repository has no mutant tester**

`@stryker-mutator/core@10.0.0`, installed into `node_modules` only with
`npm install --no-save`, driven through its `command` runner so it needs no
Vitest plugin. `package.json` and `package-lock.json` are unchanged (lockfile
md5 `29184ac9...` before and after; `package.json`'s only diff is the
`hardening` script below). This is the route the cleaner took for the coverage
provider and for the same reason: mutation is a measurement a role takes, not a
gate CI runs, and "what does CI install" is task 14's question. Reproduce with

    npm install --no-save @stryker-mutator/core@10.0.0
    npx stryker run <config>            # configs are in the hardener's scratch

One caution if you repeat it. `npm install --no-save --no-package-lock` re-resolves
the tree and prunes optional peers - it removed `@vitest/coverage-v8` from
`node_modules`. Plain `--no-save` is enough and leaves the lockfile alone; `npm ci`
puts everything back either way, and I finished with one.

**Language mutation, before and after**

One file at a time, each against the tests that guard it plus the new hardening
suite. Scores are Stryker's, over every mutant it generates for the file.

| module | mutants | before | after | survivors left |
| --- | --- | --- | --- | --- |
| `src/todo-api/client.ts` | 91 | 98.90% | **100%** | 0 |
| `scripts/architecture/imports.mjs` | 48 | 77.08% | **100%** | 0 |
| `scripts/architecture/rules.mjs` (new, split out) | 71 | - | 98.59% | 1 |
| `scripts/acceptance/runner-protocol.mjs` | 110 | 89.19% | 98.18% | 2 |
| `scripts/architecture/boundaries.mjs` | 95 | 62.09% | 89.47% | 10 |
| `properties/tiny-check.ts` | 199 | 63.82% | 73.37% | 53 |

`boundaries.mjs`'s "before" is the whole file including the rule data that is now
`rules.mjs`; the two rows after the split are what that 62% was hiding.

The headline is the first row. **The module this task exists to create kills
every mutant Stryker can make of it**, and it did so at 90 of 91 before I touched
anything - the unit tests the coder and architect wrote are strong. The one
survivor was a real hole and a small one: four of the five request specs in
`client.spec.ts` assert `readsResponseBody` and the fifth, `completeTodoCall`,
does not, so flipping that one call to `false` cost nothing. Whether an answer is
read is what decides whether a body is parsed, and delete is the only operation
that says no, so `hardening/todo-api-client.hardening.test.ts` now states it once
for all five.

**Not mutated, and why**

- `src/todo-api/fetchTransport.ts` and `src/middlewares/callapimiddleware.ts` are
  adapters; `src/actions/api.ts` is five re-exports with nothing to mutate.
- `acceptance/runtime.ts`, `acceptance/run-feature.ts` and
  `acceptance/steps/todo-api.ts` are the acceptance harness - `node:fs` and
  `vitest` - so not testable modules, and they are what the Gherkin stage drives
  rather than what it measures.
- `scripts/acceptance/runner-worker.mjs`, `aps.mjs`, `run-acceptance.mjs`,
  `install-aps.mjs`, `generate-entrypoints.mjs`: process shells.

**The mixed-job hint: `boundaries.mjs` was two jobs and the count said so**

58 of its 153 mutants survived, and almost every one was a mutation of the rule
*data*: `BOUNDARY_RULES` emptied entirely, any rule's `files` blanked, any
pattern in any `deny` list replaced with `""` - all green. The deciding half
killed 95. That is two jobs with two falsifiability stories in one file, and the
module's own doc comment already claimed to be "deciding only" while holding
every path in the repository.

So `scripts/architecture/rules.mjs` now holds `BOUNDARY_RULES` and nothing else,
and `boundaries.mjs` holds `violationsOf`, `cyclesOf` and their helpers and knows
no paths. `boundaries.spec.mjs` imports the rules from their new home; nothing
else moved and no assertion changed.

The reason the data survived is worth stating plainly, because it is the fifth
false green this project has found and the same shape as the others: **the only
thing driving the real rules was a repository that obeys them, and a repository
that obeys every rule says exactly what a repository with no rules says.** The
architect proved each rule could fail by planting five violations by hand and
removing them again; nothing automated held that afterwards.
`hardening/rules.hardening.test.ts` is that half - every rule broken on purpose
and asserted to be caught by name, every rule obeyed on purpose and asserted to
be let through, and a last test asserting the table names every rule there is, so
a rule added later without a planted violation turns the file red.

**What I changed**

Source, three files:

- `scripts/architecture/rules.mjs` - new; the rule data, moved out of
  `boundaries.mjs` unchanged apart from one added rule (below) and a doc comment
  saying what the split was for.
- `scripts/architecture/boundaries.mjs` - the deciding half, and its doc comment
  no longer claims something the file contradicted.
- `scripts/acceptance/runner-protocol.mjs` - `{ms:1,s:1000,m:60000}[match[2] ?? 's'] ?? 1000`
  became a named `SCALES` constant with no second default. The cleaner recorded
  that `?? 1000` as unreachable and left it; mutation showed it was not free.
  With it in place, `match[2] ?? 's'` and `match[2] ?? ''` produce the same
  answer, so which unit a bare `"45"` is read as was unpinned. Removing it made
  the existing `timeoutMilliseconds('45') === 45000` test do that work. It needed
  no type assertion; the typecheck gate is still clean.

One rule added to `rules.mjs`: `hardening/**` may reach the policy module, the
property runner, the repository's tooling and its own files, and may not reach
`src/todo-api/fetchTransport.ts` or anything else in `src/`. Hardening tests
exist to break whichever module is under mutation, so unlike acceptance and
properties they legitimately reach `scripts/`; what they still may not do is
reach the network shell, because a mutation killed by the network would be
measuring the network. `boundaries.spec.mjs`'s repository scan now includes
`hardening/`.

Tests, all new and all in one place:

- `hardening/`, six files, 50 tests, run by `npm run hardening` through
  `vitest.hardening.config.mts`. One file per module that had survivors, each
  headed by what survived and why the test kills it.
- A sixth tsconfig project, `hardening/tsconfig.json`, wired into
  `scripts/typecheck.mjs`. `scripts/typecheck-gate.spec.mjs` went red on its
  project-list assertion exactly as written, as it did for the coder and the
  architect; the expected line and the comment above it were updated.
- `eslint.config.js` gained `hardening/**/*.ts` to the block acceptance and
  properties already share, and one stale reference to `boundaries.mjs` holding
  the rules now points at `rules.mjs`.

Hardening tests are a separate command for the reason acceptance and properties
are: **`npm test` is 16 files / 139 tests, unchanged.** No hardening test joined
that count, `test:unit` is still 13/83 and `scripts` still 3/56.

**Survivor triage, file by file**

Every remaining survivor was read, not just counted.

`scripts/acceptance/runner-protocol.mjs`, 2 left, both equivalent:

1. `catch { return undefined }` reduced to `catch {}`. Falling through leaves
   `report` undefined and `report?.numTotalTests` then returns undefined anyway.
   Same answer by a different route.
2. `timeout ?? ''` with the empty string replaced by any other non-matching
   string. Every string that fails the regex produces `undefined`, so no default
   that is not itself a duration can be told from any other.

The eight that died were all real: a report that parses to `null` used to throw
instead of being refused; a missing failure count and a non-list `testResults`
were both accepted; the singular "1 test file matched, but no test ran" - the
wording a mutated feature actually produces - was asserted nowhere; and the
duration regex accepted a leading `x` and rejected `1.25s`.

`scripts/architecture/rules.mjs`, 1 left: the client rule's `allow: []` replaced
by a one-element list holding a string no module imports. It forbids exactly what
the empty list forbids. The seven `reason` prose mutants died to a test asserting
each rule's reason says more than its name repeats, which is the property that
matters - a gate that says only "no" is a gate people switch off - without
pinning documentation into an assertion.

`scripts/architecture/boundaries.mjs`, 10 left, all equivalent or unreachable,
and the branch coverage report agrees (100% statements, 86.36% branches, the
uncovered branches being lines 89, 109 and 165):

- Four sentinel-value mutants (`[]` replaced by `["Stryker was here"]` in the
  initial walk stack, the else branch of `internalEdges`, `rule.except ?? []`,
  `rule.deny ?? []`). Each is only observable if a module path or a rule pattern
  is literally that string.
- `edges.get(path) ?? []`: unreachable. `internalEdges` maps every module and
  `walk` is only ever called with a module path.
- `settled.has(path)` and `settled.add(path)` removed: the memo changes cost, not
  the answer, because `distinct` deduplicates what a re-walk would find twice.
  Killing them would mean a timing test.
- `.sort()` and `.join(' ')` in the cycle key, and `if (!byMembers.has(key))`:
  all three only matter when the same loop is found twice in different rotations,
  which `settled` prevents. Defensive, and I left them defensive.

Nine others there did die, and they were worth having: a cycle reached from
outside it reported the way in as part of the loop; a module that imports itself
was a cycle; two loops in one graph were reported as one; a dotted filename lost
the wrong extension; a non-index module got a truncated directory alias; and a
rule with two file globs or two deny patterns only honoured the first of each.

`properties/tiny-check.ts`, 53 left of 199, and this is the one number I am not
going to dress up. The breakdown:

- 19 are the `CHARACTERS` alphabet that `text()` draws from - one string literal
  per entry. It is data chosen so a JSON body has something to survive, and the
  only way to kill those mutants is to assert the alphabet, which asserts data.
- 30 are inside the generators and shrinkers: the PRNG's mixing arithmetic, and
  the shrink candidate lists of `integer`, `text`, `elementOf` and `arrayOf`.
  A shrinker has several routes to the same minimum on purpose, so removing one
  candidate still arrives at `37`, `"\""`, `[0,0]` and `[5,true]` - the four the
  existing property test pins. Killing these means pinning the route rather than
  the destination, and a shrinker whose route is pinned cannot be improved.
- 2 are the `typeof value === 'string'` fast path in `show`. `JSON.stringify` of
  a string is byte-identical with and without the replacer, so the branch is a
  shortcut, not a decision.
- The rest of the file went from 63.82% to 73.37% on the parts that are
  decisions: `show` rendered `undefined` as nothing at all, dropped an undefined
  a JSON body would swallow, and returned nothing for a circular value; the
  failure report claimed "(shrunk from ...)" when nothing had shrunk and would
  have collapsed to one line; `runs` and `shrinks` budgets were unpinned; and
  `$PROPERTY_SEED` - this runner's entire reproducibility story - was driven by
  nothing at all, so the guard reading it could be inverted or deleted and every
  property still passed.

**Gherkin mutation, and the baseline proved first**

The baseline requirement from the repair coder's note is a procedure, so here it
is as a procedure. Before each of the three runs, one job over the same worker
against unmutated IR:

    rm -rf build/acceptance-mutation && mkdir -p build/acceptance-mutation/generated
    node scripts/acceptance/generate-entrypoints.mjs \
      build/acceptance/ir/<feature>.json build/acceptance-mutation/generated
    printf '%s\n' '{"id":"base","feature_json":"build/acceptance/ir/<feature>.json","generated_dir":"build/acceptance-mutation/generated"}' \
      | node scripts/acceptance/runner-worker.mjs

All three answered `test_success` - 10, 8 and 6 tests respectively - and all
three mutation runs reported `Errors: 0`, so no result below comes from a run
that was not running anything. The repaired adapter behaved: no `infrastructure_error`
appeared anywhere, which is what a correctly configured run looks like now.

**One footgun the coder's command does not mention, and it bit me.** A generated
entry point does not bind to the IR it was generated from - it reads
`process.env.ACCEPTANCE_IR` and falls back. So if the mutation work tree holds
all three entry points, every job runs the mutated IR through all three of them:
my first baseline reported 30 tests for a 10-scenario feature. Generate **only**
the feature under mutation into the work tree, one directory per feature, as the
coder's note says and as the commands above do. It is not merely a speed
question; with three entry points loaded, the mutator's per-scenario accounting
is measuring a feature three times.

Then, per feature:

    .aps/bin/gherkin-mutator -feature features/<feature>.feature \
      -generated-dir build/acceptance-mutation/generated \
      -work-dir build/acceptance-mutation \
      -runner-worker "node scripts/acceptance/runner-worker.mjs" \
      -level soft -json

`node ...` directly, never `npm run`, as the coder warned: npm's banner would
corrupt the NDJSON.

| feature | mutants | killed | survived |
| --- | --- | --- | --- |
| todo-api-requests | 20 | 14 | 6 |
| todo-api-outcomes | 20 | 2 | 18 |
| todo-api-refusals | 6 | 2 | 4 |

28 survivors, in four classes, and **I edited no feature file**:

*A. Declared deliberate, 10.* The `status` column in outcomes 1, 2 and 3, and the
`body` column in outcomes 2. The specifier recorded these in advance and they
must survive: "this input is ignored" is the specification, `qa/procedures/21`
depends on it, and the client never reads `response.ok`. They survived. Nothing
was hardened against them and the defect is untouched.

*B. Cause-shaped, 2.* The `body` column of outcomes 3, where the point is that a
body which will not parse fails the call. Character-level mutation of `boom` or
`Internal Server Error` produces another string that will not parse, so the
outcome is unchanged. The scenario is right and the mutation cannot reach it.

*C. Identity-shaped, 12.* A cell that feeds both the When and the Then, so
mutating it moves the input and the expectation together. `id` in requests 3, 4
and 5; `text` in outcomes 1; `id`, `text` and `error` in outcomes 4.

*D. Shape-immune, 4.* The `names` column of refusals 2. What that scenario
specifies is arity and type - not three strings - and a character mutation
preserves both, so all four rows stay refused. Correct as written; `--level soft`
cannot express the mutation that would test it.

**The coder's open question about outcomes 4, answered.** It is right: outcomes 4
has no killable cell as written, and I do not think it should be given one. What
it specifies is a conservation identity - the operation's own fields ride onto
both outcomes unchanged, and the error that ended the call is the error reported.
No mutation of an example cell can falsify an identity, because mutating both
sides preserves it. Adding a column that restates the input verbatim is the
"example column that only asserts the no-op" my brief tells me to prefer deleting.
The right tool for an identity is a property, and the architect already wrote it:
`properties/todo-api-client.property.test.ts` asserts the call's fields on both
outcomes over the whole generated range, which is a stronger statement than any
two example rows. My recommendation is to leave outcomes 4 exactly as it is and
record that the property covers it.

**Requests 3, 4 and 5 are a different case, and this one is for the specifier.**
`<id>` feeds `the request path is api/todos/<id>`, so the path is derived from
the id by concatenation - the very thing the specifier guarded against for the
add body, and for the same reason ("a concatenating implementation passes the
other rows and fails that one"). The remedy already exists in the same file: the
`body` column of requests 2, 3 and 4 is an independent literal, and every `body`
mutant died. A `path` column carrying `api/todos/42` would kill the six `id`
survivors and would catch a client that percent-encoded, zero-padded or otherwise
transformed the id on its way into the URL. That is a change to `features/`,
which is not mine, so I am reporting it rather than making it.

**CRAP gate**

Under 10 everywhere on the changed files, and with coverage where it is the gate
reduces to complexity almost everywhere.

- `src/todo-api/client.ts`: 100% statements, branches and functions under the
  unit suite (unchanged from the cleaner's measurement; `src` totals are still
  87.87% / 93.1%), and now 100% mutation score. Its most branching function is
  `outcomeNamesOf` at 4.
- `scripts/architecture/boundaries.mjs`: 100% statements, 86.36% branches, the
  three uncovered branches being the unreachable defaults triaged above. Highest
  complexity is `walk` at 5, so CRAP is about 5.0.
- `scripts/acceptance/runner-protocol.mjs`: 100% lines and 100% functions from
  its own spec alone; the two lines the spec misses are covered by the hardening
  suite. `classifyRun` is the highest at about 9. It is one `cond` answering one
  question - what does this finished run mean - which is the exception the
  shared definitions name, and it is under the gate regardless. I did not split
  it, and splitting it into helpers taking booleans the caller already computed
  is exactly what the definition forbids.
- `scripts/architecture/rules.mjs` is data: complexity 1.
- The hardening tests are straight-line; the one helper with branches,
  `withSeedEnvironment`, is 5.

Coverage was measured with `@vitest/coverage-v8@5.0.0` installed `--no-save`, as
the cleaner did, and not persisted; `npm ci` removes it. Note for whoever reads
the architect's note next: that provider was **not** in the lockfile, it was the
cleaner's un-saved copy still sitting in `node_modules`. My `npm ci` removed it,
which is the correct behavior and confirms it has to be re-installed each time
anyone wants a coverage number. That is another argument for task 14.

**DRY**

Two duplications in my own new tests, both removed: `rules.hardening.test.ts` had
a `clean` helper that was `judged` without the mapping, and
`tiny-check.hardening.test.ts` had the same failing property written out three
times where one `failsAt` helper serves. I re-ran mutation afterwards to prove
the refactor kept every kill - `rules.mjs` still 98.59%, and the `tiny-check.ts`
lines those tests target still 42 of 45 with only the two equivalent `show`
mutants left.

Three duplications I left, deliberately:

- The one-line `module(path, ...targets)` record builder appears in
  `boundaries.spec.mjs` and in two hardening files. Hoisting it would make three
  files depend on a fourth to construct a two-field object, which is the trade
  the cleaner already refused for `acceptance/steps/todo-api.ts`.
- `hardening/todo-api-client.hardening.test.ts` asserts `readsResponseBody` for
  all five operations, and `client.spec.ts` asserts it for four of them. That is
  the same fact in two places on purpose: the unit spec describes each operation
  whole, the hardening file states the rule across all five, and if the fact
  changed both would go red, which is the right outcome.
- The five request builders in `client.ts` still repeat their shape, for the
  reason the cleaner gave.

**Verified, after the last edit, from a clean `npm ci` tree**

- `npm run lint`, `npm run format:check`, `npm run build`: pass.
- `npm run typecheck`: 0 errors in six projects.
- `npm test`: 16 files / 139 tests, **unchanged**. `test:unit` 13 / 83,
  `test:scripts` 3 / 56, both unchanged.
- `npm run acceptance`: 3 files / 24 executions, unchanged - the mutator's
  manifest comments do not reach the IR.
- `npm run properties`: 2 files / 26 tests, unchanged.
- `npm run hardening`: 6 files / 50 tests. New command.
- `npm run test:e2e`: 22 passed. `test:e2e:dev` and `test:e2e:preview`: 21
  passed, 1 skipped each. No procedure was edited or needed editing.
- `package-lock.json` byte-unchanged (md5 checked before and after every install
  and after `npm ci`). `package.json`'s only change is the `hardening` script.

**Left for QA**

- One new release check, `npm run hardening`. It needs nothing `npm ci` does not
  already install - no Go, no clone, no network - so it is in the same position
  as `npm run properties`, not `npm run acceptance`.
- `npm test` still covers the boundary checker, and it now also covers the rule
  data indirectly: a red `scripts` project can mean an architecture violation,
  and the failure names the rule and its reason.
- Nothing in the mutation tooling is wired into any command. Repeating this
  hardening pass needs the two `--no-save` installs above; nothing QA runs
  depends on them.

**Open questions for the project manager**

1. **`gherkin-mutator` writes its manifest into `features/*.feature`.** All three
   feature files carry a new `# acceptance-mutation-manifest-begin ... end`
   comment block at the top, recording which scenarios were fully killed and
   when. That is the tool's own output - the thing that makes `--level soft`
   differential on the next run - and my brief says to preserve mutation
   manifests and never hand-edit them, so I kept them. But `features/` is the
   specifier's, and no earlier role hit this because nobody had run the mutator.
   Two things follow and both are yours to rule on: whether a machine-written
   block in a specifier-owned file is acceptable, and if it is, that the
   specifier must leave it alone rather than tidying it away. The blocks are
   removable with three `sed` deletions and cost only a full re-run.
   Worth knowing before you decide: `outcomes` recorded no scenarios at all,
   because every scenario in it has at least one survivor, and all of those
   survivors are the deliberate ones. So the manifest as it stands says
   "requests 2 and refusals 1 are done", which is true.
2. **Should the mutant tester be persisted?** Same shape as the coverage
   provider, same answer from me: not in a structural task. `@stryker-mutator/core`
   is one devDependency and a config file, and tasks 10 to 13 each get a
   hardener who will install it by hand exactly as I did. If you would rather the
   repository carry it, task 14 is where it belongs, next to the coverage
   provider and the acceptance toolchain - all three are "what does CI install".
3. **`npm run hardening` is now the third command outside CI**, after acceptance
   and properties. You have already ruled properties should go in and acceptance
   should not; hardening is in properties' position, not acceptance's. My
   recommendation is that it goes in with properties, and I have left CI alone.
4. **The `id` column in requests 3, 4 and 5**, above. A specifier question, and
   the remedy is a pattern already in that file.
5. **`npm test` did not move this time.** 16 files / 139 tests, exactly as the
   architect left it. Recording it because three roles in a row have had to name
   the number; the hardening tests went into their own command precisely so this
   one stayed put.

### QA

Final verification. Nothing in the repository changed: `git status` is clean and
the branch is where I found it, `370ff60`. Every experiment below was planted,
measured and reverted, and the working tree was checked clean after each.

**Every release check, from a clean `npm ci` tree, after the last commit**

| command | result |
| --- | --- |
| `npm run lint` | 0 |
| `npm run format:check` | 0 |
| `npm run typecheck` | 0 errors across six projects |
| `npm run properties` | 2 files / 26 tests |
| `npm run hardening` | 6 files / 50 tests |
| `npm test` | 16 files / 139 tests (13 unit + 3 scripts; no acceptance, property or hardening file in the count) |
| `npm run build` | 0 |
| `npm run acceptance` | 3 files / 24 executions |
| `npm run test:e2e` | 22 passed |
| `npm run test:e2e:dev` | 21 passed, 1 skipped |
| `npm run test:e2e:preview` | 21 passed, 1 skipped |

Every baseline holds. `.aps/bin/` was already built, so `acceptance:install` did
not have to run; `@stryker-mutator` and `@vitest/coverage-v8` are both absent
from the tree these numbers come from, and nothing above needs them.

**Behavior preservation, decided by execution rather than by reading**

The built artifact is where the earlier tasks put their evidence, and it still
carries half the answer here, but a source diff that moves logic between modules
cannot be settled by a byte comparison alone. So I did both.

*The artifact.* I built `5d09b12` - the last commit before any source moved -
and `HEAD`, unminified, and split each bundle by its rolldown region markers.
`dist/index.html` and the CSS are identical. **Everything shipped outside the
API pipeline is byte-identical**, with one exception: the five aliases in
`src/actions/index.ts` now name `addTodoCall` where they named `addTodo$1`. No
component, container, reducer or selector moved a byte. Inside the pipeline the
distinct string literals are the same set - the counts fall (`application/json`
9 to 2, `Content-Type` 4 to 1) because four header literals and two PATCH
triples became shared constants - plus `"GET"`, which is now written down.
`api/todos/` and `api/todos/${id}` both survive as distinct literals.

*The execution.* A byte comparison cannot tell you that a moved `.then` still
runs in the same order, so I drove both pipelines through the same scenarios and
compared everything observable. Old `api.ts` and old `callapimiddleware.ts` from
`5d09b12`, new ones from `HEAD`, one fake `fetch` and one recording store each;
9 operations (including a text needing JSON escaping, an empty text and id 0)
against 9 answers (200/404/500, parseable/unparseable/empty body, transport
rejection), plus the two refusals, a plain action, an unrelated action,
`dispatch(null)` and four unusable outcome-name shapes. 91 executions, recording
the request on the wire, every dispatched action with its exact keys and key
order, every `console.error`, everything passed to `next`, anything thrown, what
the returned promise resolved to, and **all of it interleaved in one ordered log
so ordering between kinds counts**.

The dispatched action sequences are identical in all 91, down to key order, down
to `json` being present-and-undefined on a delete success, down to
`console.error` running before the failure action.

Three differences exist, and I checked each rather than waving at it:

1. The load descriptor now spells out `method: 'GET'` where it used to omit the
   key. Same request on the wire; an absent method is a GET. Specified.
2. A reading call now takes `response.text()` and parses it, where it used to
   call `response.json()`. Same parse, same `SyntaxError`, same failure action,
   same console output - asserted, not assumed. One theoretical gap:
   `response.json()` always decodes UTF-8 while `response.text()` honours a
   `charset` in the Content-Type. Against this backend, both sides are UTF-8
   JSON, so nothing observable turns on it. Recorded, not fixed.
3. **`dispatch(anApiAction)` used to return a promise resolving to the success
   action; it now resolves to `undefined`.** This is the one real API change in
   the task. The old middleware `return`ed `api.dispatch(...)` from inside its
   `.then`; `executeCall`'s `.then` returns nothing. Nothing reads it: there is
   no `await` or `.then` on a dispatch anywhere in `src/` or `qa/`, every call
   site goes through `connect()`'s object shorthand, and `TodoItem`, `Header`
   and `TodoList` all declare these props `void`. The failure path resolved to
   `undefined` before and still does. It belongs in front of task 10, which owns
   the dispatch surface and where a thunk's return value starts mattering.

I confirmed the harness could fail before believing it: six planted defects,
five caught immediately, and the sixth - moving `console.error` after the
failure dispatch - caught only after I added the interleaved log, which is why
it is there.

**The three preserved defects are all still present**

- **`response.ok` is never checked.** The status now reaches `TodoApiAnswer` on
  every answer and nothing reads it: `grep` finds `status` only in the transport
  that produces it and in a doc comment. Planting the check in `client.ts` turns
  four properties red with a counterexample; planting it in `fetchTransport.ts`
  turns the unit suite and the differential red and leaves acceptance and
  properties green, which is correct - the acceptance and property suites drive
  the policy, not the shell. E2E procedure 21 passes, both cases, in all three
  server variants.
- **`removeTodo` never reads its response body.** `readsResponseBody: false`.
  Planting `true` turns unit, acceptance, properties *and* hardening red - the
  most-guarded single fact in the task.
- **The trailing slash differs.** `api/todos/` for load and add, `api/todos/<id>`
  per id, visible as two distinct literals in the shipped bundle. Planting the
  slash away turns unit, acceptance, properties and the differential red.

None of the three has been quietly tidied, and each is now harder to tidy by
accident than it was before the task.

**Falsifiability matrix: eleven planted defects against five gates**

Each defect planted alone in `src/`, every gate run, then reverted.

| planted defect | unit | acceptance | properties | hardening | differential |
| --- | --- | --- | --- | --- | --- |
| trailing slash removed | red | red | red | green | red |
| delete reads its body | red | red | red | **red** | red |
| transport checks `response.ok` | red | green | green | green | red |
| complete gets its own triple | red | red | green | green | red |
| `console.error` after dispatch | red | green | green | green | red |
| started reported after the send | red | green | green | green | red |
| load drops its Accept header | red | red | red | green | red |
| `== null` tightened to `===` | red | red | red | green | red |
| delete drops its content type | red | red | green | green | red |
| edit PATCHes `{id,text}` | red | red | red | green | red |
| an unparseable body stops failing | red | red | red | green | red |

Every gate caught something no other gate caught, and no gate was silent on
everything. The three the acceptance suite misses are all outside what the
features specify - a transport decision, a console call, and ordering against
the send rather than between outcomes - so they are boundaries, not holes.

**The verification code, given six false greens of history**

I treated every new gate as guilty until it went red. All of them can:

- **The runner adapter.** Eight jobs over the protocol by hand: baseline
  `test_success`; trailing-slash-mutated IR `test_failure`; an empty
  `generated_dir` and a mis-spelled one both `infrastructure_error`, `no test
  files matched, so nothing ran`; `"scenarios": []` and a missing IR both
  `infrastructure_error`, `1 test file matched, but no test ran`; an unreadable
  line and a job with no `feature_json` both refused. Nothing on stderr, nothing
  but protocol lines on stdout. The false kill is gone.
- **The rule data.** This is the one worth repeating. With `BOUNDARY_RULES`
  emptied to `[]`, **`npm test` stays green** and `npm run hardening` goes red
  with 8 failures. Adding a rule with no planted violation turns hardening red on
  the completeness test; blanking a rule's reason turns it red too. The false
  green the hardener found is real and is closed, and hardening is the only thing
  that closes it - which is a good argument for it having landed in CI.
- **The property runner.** A `forAll` that checks nothing turns 9 of its
  self-tests red; one that runs a single case turns 4 red. And ignoring
  `$PROPERTY_SEED` leaves `npm run properties` **green** while turning hardening
  red - the second place hardening is the only net.
- **The typecheck gate.** A type error planted in each project in turn: all six
  report and all six fail the gate. Three false greens' worth of history, and the
  gate now sees every project it claims.
- **The lint boundary.** Six environment leaks in one function in `client.ts`
  produce 7 lint errors where the type gate produces none. The architect's
  correction of the coder's proof holds, and the replacement works.
- **The acceptance pipeline.** A stray test file planted in the generated
  directory is deleted by the next run rather than counted; an unsupported step
  fails the run by name. `npm run format:check` and `npm run build` also fail
  when given something to fail on.

I read every step handler for vacuity. `no request is built`, `no call is made`,
`no outcome is produced` and `the client refuses with M` all fail when the
client stops refusing - `messageOf(undefined)` is `"undefined"`, which matches
no expected message. `carries no parsed body` uses `toStrictEqual({json:
undefined})`, which is the one assertion that can tell the delete's key-present
case from an omitted key. The stand-in transport withholds the body exactly when
the call says not to read it, which is what makes the declared `body` survivor a
survivor and what makes plant 2 above fail. **I found no seventh false green.**

**The two refusals: both correct**

*The repair coder declining a baseline check inside the runner adapter.* Right,
and for the reason given. The adapter is handed one job at a time and is never
told which is the original, so the check would need run-level state and a guess;
the alternative it names - comparing test counts between jobs - would be wrong,
because a mutation that drops an example row lowers the count legitimately. The
repair also removed the reason the check was urgent: the misconfigurations that
used to report a kill now report `infrastructure_error`, verified above. The
procedure still earns its place, and for a reason nobody wrote down: it is what
catches the `ACCEPTANCE_IR` footgun. I confirmed the worker sets
`ACCEPTANCE_IR` for the whole spawned run, so every entry point in the work tree
reads the mutated IR, and a baseline reporting 30 tests instead of 10 is the
only visible symptom. That is the hardener's footgun and the coder's procedure
meeting; both notes are right and neither says they are the same thing.

*The specifier declining the `id` column change.* Right, and the argument is
sound where the hardener's was not. The hardener's stated benefit - catching a
client that pads or encodes the id - is already delivered by the placeholder
form: for a row `| 42 |` the harness asserts `api/todos/42` either way, so a
client producing `api/todos/042` fails either way. For any transformation `T`,
the two forms fail on exactly the same set of implementations. The literal adds
sensitivity to mutation of the example data and nothing else, and the specifier
is also right that the `body` analogy does not carry: JSON encoding has an
escaping case and the third row *is* that case, while a whole number in a path
has none. The ten comment lines added are the right resolution and are in the
practice the file already follows.

**The E2E procedures: none edited, none needed editing**

`git diff 374f629..HEAD -- qa/` is empty and no commit in the task touched
`qa/`. 21 procedures, 21 spec files, one-to-one, 22 tests. All three server
variants pass. I looked for a procedure that *should* have changed and found
none: the only differences the extraction introduced are the three above, and
none of them reaches the screen. Procedures 16 to 20 record the failure path as
silent, which is exactly the property that makes the `text()`-versus-`json()`
change invisible; procedure 21 depends on the missing `ok` check, which is
intact.

**The commands, and what is outside CI**

Each one runs what it claims and each one can fail; the matrix and the probes
above are where each was made to. `npm run acceptance` runs the three features
through the real APS parser and this project's runtime, rebuilding both derived
directories each run. `npm run properties` and `npm run hardening` are ordinary
Vitest runs over their own configs and need nothing `npm ci` does not install -
I confirmed that from a tree with neither Stryker nor a coverage provider in it.
`npm run acceptance:install` is an installer, not a gate.

The CI list is accurate. Exactly three verification commands sit outside
`.github/workflows/nodejs.yml`: `npm run acceptance` (Go plus an unpinned
clone), the Stryker runs (an unpersisted dependency, and not an npm script at
all), and `test:e2e:dev` / `test:e2e:preview` (task 08's deliberate call).
Nothing else fell out: lint, format:check, typecheck, properties, hardening,
`npm test`, build, the propTypes grep and `test:e2e` are all steps, and
`test:unit` and `test:scripts` reach CI inside `npm test`.

**CRAP and DRY on the changed files**

Measured with `@vitest/coverage-v8@5.0.0` installed `--no-save` and then removed
by `npm ci`; `package.json` and `package-lock.json` md5-checked before and
after, unchanged. `src/` is 87.87% statements / 93.1% functions, reproducing the
cleaner's and hardener's numbers exactly. Every file this task created or
rewrote under `src/` is at 100%, so CRAP reduces to complexity: the highest is
`outcomeNamesOf` at 4. `scripts/architecture/boundaries.mjs` is 100% statements
/ 86.36% branches with the uncovered branches at lines 89, 109 and 165 - the
same three the hardener triaged - and `walk` at 5. `runner-protocol.mjs` is 100%
lines under its own spec plus the hardening suite; `classifyRun` is about 9, one
`cond` answering one question, which is the exception the definitions name and
under the gate regardless. Nothing is over 10.

On DRY I agree with what the cleaner and hardener left standing, having checked
each: the five request builders repeating their shape (a `jsonCall(...)` helper
would hide the trailing slash and the missing delete body behind a parameter
list), the header literals written out at each assertion, and
`readsResponseBody` asserted in both `client.spec.ts` and the hardening file. I
found nothing new to remove and nothing new to extract.

**One defect found, and it is not in the code**

**The README is stale in four places, and it is the document that tells the next
role which gates exist.**

1. Line 13 says the type gate has "four projects" and names four. There are six.
2. Line 67 says "Type-checks all four TypeScript projects" and names the same
   four. `npm run typecheck` prints six.
3. `npm run properties` and `npm run hardening` have no section, though every
   other verification command in the repository has one.
4. The "Continuous integration" section lists the CI steps without them, and
   then says "Every step is one of the commands above" - which is now false in
   two ways at once.

The drift is mechanical: the coder updated the README for the fourth project,
the architect added the fifth and a command, the hardener added the sixth and a
command, and the coder who wired both into CI changed only the workflow. No
single role skipped anything it was told to do. **Owner: a coder.** It is four
edits with no behavioral content and no test to change.

Related, and the project manager's rather than a coder's: `PLAN.md`'s "Task 09
added three more" paragraph lists "whether `npm run properties`" belongs in CI
as an open task-14 question. The fifth-round ruling closed it and a coder
implemented it, so task 14 no longer owns it. The paragraph also says the same
thing twice ("Acceptance needs Go and a pinned third-party clone inside the gate
first." then "Running it there means installing Go and cloning a third-party
repository inside the gate..."), and it never mentions hardening or persisting
Stryker, which is what task 14 actually still owns.

Neither is a gate that cannot fail and neither blocks the task; I am not editing
`README.md` or `PLAN.md` because neither is mine.

**One observation, no action asked**

`scripts/architecture/imports.mjs` reads text, not a syntax tree, and its own
doc comment says so and says the over-reporting direction is the safe one. It
is: I planted an `import ... from '...'` inside a string literal in `client.ts`
and the checker invented two edges and a cycle that do not exist - a loud false
red, never a false green. There is already one live instance:
`generate-entrypoints.mjs` writes an import line into the file it generates, so
its edge list contains a phantom `${runtime}` and a phantom `node:url`. No rule
denies either, so nothing is affected today. Worth knowing before someone writes
a rule that a phantom could trip.

**Verdict**

The task's done criteria are met. The module owns request construction and
response interpretation with no environment; the adapter translates and decides
nothing that I can find; unit tests fail all eleven plausible wrong
implementations I could construct; the generated acceptance tests, the property
tests and the hardening tests pass and each can fail; the mutation survivors are
the declared ones; and the regression suite from `qa/procedures/` passes
unchanged, with no procedure edited and none that needed editing. Behavior is
preserved: identical actions, identical requests, identical console, identical
throws, in 91 executions and in the shipped bundle, with the single unread
promise-resolution change recorded above.

**Open questions for the project manager**

1. **The dispatch return value.** `dispatch(anApiAction)` no longer resolves to
   the success action. Unobservable here and I am recording it rather than
   treating it as a regression, but task 10 changes exactly this surface and
   should know it has already moved once.
2. **The README, above.** Four inaccuracies, a coder's to fix; I have not
   touched it. If you would rather it wait for task 14 alongside the other
   "what does CI install" items, it should at least not keep claiming the
   project count.
3. **`PLAN.md`'s task-14 paragraph**, above: it names a question you have
   already ruled on and repeats itself.

### Coder (CI: properties and hardening)

`npm run properties` and `npm run hardening` are now steps in
`.github/workflows/nodejs.yml`. It is the only file this role changed apart
from this one; `git diff --name-only` lists the two of them.

**Where they sit.** After `npm run typecheck`, before `npm test`. Timed on this
machine: properties 1.3s, hardening 1.3s, against typecheck at 9.0s and
`npm test` at 24.3s, so a broken invariant now surfaces a suite earlier than it
otherwise would and the file's cheapest-first ordering still holds. They are
placed below the typecheck step's `working-directory:` warning rather than
between that warning and the step it warns about.

**Both steps can fail.** Two plants, each reverted:

- `COLLECTION_PATH` from `'api/todos/'` to `'api/todos'` in
  `src/todo-api/client.ts`: properties exit 1, 1 of 26 failed. `npm test` also
  exit 1; `npm run hardening` exit 0.
- the delete call's `readsResponseBody` from `false` to `true`: hardening exit
  1, 1 of 50 failed. `npm run properties` and `npm test` also exit 1.

The first plant is the interesting one: hardening is green under it, so these
are two gates and not one gate run twice. Every exit code above was read from
`$?` after a redirect to a file, never after a pipeline, because a pipeline
would have reported `grep`'s or `tail`'s status instead. After reverting, the
working tree holds no change outside the workflow file.

**Clean room.** Reconstructed a fresh checkout in a scratch directory from
`git ls-files` plus `git ls-files --others --exclude-standard`, which is empty
right now, so 162 files, and diffed the copied tree against that manifest: it
matches. Then `npm ci` from the committed lockfile, and every `run:` step of the
workflow in file order. With `/usr/local/go/bin` stripped from `PATH`:
lint 0, format:check 0, typecheck 0 errors across the six projects, properties
2 files / 26 tests, hardening 6 files / 50 tests, `npm test` 16 files / 139
tests, build 0, the propTypes grep 0. Then, with Go back on `PATH` but
irrelevant, `npm run test:e2e` 22 passed. Every baseline holds.

**`npm ci` alone is enough for both new steps**, so no install step was added.
`@stryker-mutator` is absent from the clean room's `node_modules` and hardening
passes anyway: Stryker generates mutants, it does not run the tests that
resulted from them. The property generator is `properties/tiny-check.ts`, this
repository's own; the property suite imports nothing but it, the client and
Vitest. Neither command touched Go, and neither clones anything.

**What I could not verify.** GitHub Actions cannot run here. I parsed the
workflow with a YAML parser and confirmed the step list and its order, and ran
each `run:` command by hand in the clean room, but nothing proves the job as
GitHub assembles it: `actions/checkout@v5`, `actions/setup-node@v5` with
`cache: npm`, the `npx playwright install --with-deps chromium` step, which I
was told never to run because this machine has a browser pre-installed, and the
`if: failure()` artifact upload are all unexercised. The two new steps are plain
`run:` lines with no `with:`, `env:` or `working-directory:` key, which is the
narrowest thing they could be.

**Left alone.** `npm run acceptance` stays out of CI, per the fifth-round
ruling: Go plus an unpinned third-party clone inside the gate. Nothing in
`src/`, `qa/` or `features/` was touched, no test's assertions changed, no
dependency was persisted, and the workflow's triggers are as they were. Task 14
still owns persisting Stryker and the coverage provider.

**Open question for the project manager.** Three verification commands now sit
outside CI rather than the file's stated three: acceptance, the Stryker runs
themselves, and the dev and preview E2E variants. That matches the fifth-round
note exactly, so nothing needs saying unless the count moves again.

### Specifier (correction: id column)

Routed to me by the fifth-round ruling: the `id` column in
`todo-api-requests` 3, 4 and 5, six surviving `--level soft` mutants, with the
hardener's proposed remedy being a literal `path` column per row. I judged it
and **declined**. No scenario, step or examples table changed. What I added is
one comment block in `features/todo-api-requests.feature` recording why those
cells have no killable mutant, in the same place and for the same reason the
outcomes feature already records its deliberate survivors inline.

**Why the remedy buys nothing.** The hardener's stated benefit is that a
literal path "would catch a client that percent-encoded, zero-padded or
otherwise transformed the id on its way into the URL". It would not catch
anything the current form misses, because the expected path is expanded from
the same example cell the `When` used. Today, for a row `| 42 |`, the harness
builds the call with `42` and asserts the path equals `api/todos/42`; a client
that zero-padded would produce `api/todos/042` and go red. Written out as a
literal, the assertion is the identical string. For any transformation `T`, the
placeholder form fails exactly when `api/todos/T(id) != api/todos/id`, which is
exactly when the literal form fails. The two are equally strong against every
implementation defect, always. The only thing the literal adds is sensitivity to
mutation of the example data - a class of defect the delivered system cannot
have.

**Why the analogy to the `body` column does not hold.** The hardener reads
requests 2's literal `body` as a general anti-concatenation pattern, quoting my
predecessor's "a concatenating implementation passes the other rows and fails
that one". That sentence is about the *implementation* concatenating instead of
JSON-encoding: `'{"text":"' + text + '"}'` survives `Buy milk` and dies on
`He said "hi"`. The `body` column earns its place because JSON encoding is a
real transformation with a real escaping case, and the third row *is* that
case; killing the `text` mutants is a side effect of that row existing, not its
purpose. A path has no analogous case here. `src/todo-api/client.ts` types the
id as `number` (`todoPath = (id: number) => \`api/todos/${id}\``), and a whole
number's decimal form needs no escaping - `encodeURIComponent(42)` is `"42"`.
There is no row I could add that would distinguish an encoding client from a
pasting one, so the column would be a verbatim restatement of the input with a
fixed prefix.

**And that shape is the one the hardener itself rejected.** For outcomes 4 it
wrote: "Adding a column that restates the input verbatim is the 'example column
that only asserts the no-op' my brief tells me to prefer deleting." A `path`
column is that column. The distinction drawn between them - identity versus
concatenation - does not survive contact with the fact that the concatenation's
literal half (`api/todos/`) is already spelled out in the step text and already
pinned. Nothing about the placement is unspecified.

**Small costs it would also have.** Each row would carry the id twice, so a
typo (`| 42 | api/todos/4 |`) turns the suite red with no behavioral meaning.
And it would collapse three distinct step texts into one `the request path is
<path>`, changing what `gherkin-ir-dry-checker` reports about a file whose dry
report my predecessor deliberately tuned.

**What I did change.** Ten comment lines in the header block of
`features/todo-api-requests.feature`, between the "One user-level operation"
paragraph and `Vocabulary`, saying that the `id` column is a free input, that
mutating it moves question and answer together, that a literal path would
assert nothing more, and why scenario 2's `body` is a literal for a different
reason. This is the practice the file already follows - outcomes 1 and 2 carry
the same kind of note above them - and it exists so the next hardener reads
these six survivors as declared rather than as a gap. If the project manager
would rather the justification live only in this task file, deleting those ten
lines is the whole revert.

**Verified.**

- `npm run acceptance`: 3 files / 24 executions, unchanged.
- `npm run lint` and `npm run format:check`: pass.
- `.aps/bin/gherkin-parser` exit 0, and the emitted IR is **byte-identical** to
  the IR parsed from `HEAD`'s copy of the file. Comments do not reach the IR, so
  nothing downstream of the parser can have moved. `gherkin-ir-dry-checker` exit
  0 with the same 36 findings as before, all previously reviewed.
- No `src/`, `qa/`, `acceptance/` or script file was touched, and no E2E
  procedure needed editing.

**Left for the next role.** The manifest block in
`features/todo-api-requests.feature` is untouched and, because the IR did not
move, is not stale - its `scenario_hash` for requests 2 still matches. The six
`id` survivors will still be reported as survivors on the next
`gherkin-mutator` run; that is the intended state, and the feature file now says
so. Class A (the ten deliberate `status`/`body` survivors) is likewise
untouched. Nothing is open for me.

### Coder (correction: README)

`README.md` only, plus this note. `git status` lists those two files and
nothing else; the branch is where I found it, `1c37550`, and I have committed
nothing.

**QA's four findings, each checked against the repository rather than the
report.** All four hold, and the count of six is right: `npm run typecheck`
prints `0 error(s) in tsconfig.json, qa/tsconfig.json, acceptance/tsconfig.json,
properties/tsconfig.json, hardening/tsconfig.json, tsconfig.tools.json`, which
is the same six `scripts/typecheck.mjs` lists. `package.json` has `properties`
and `hardening` as scripts and the workflow runs both, between `typecheck` and
`npm test`. Fixed: the stack table's `Types` row and the `npm run typecheck`
section now name six projects one per line; `npm run properties` and
`npm run hardening` have sections of their own; the CI paragraph lists both
steps.

**Three more staleness items I found while reading the rest of the file, none of
them QA's to catch.**

1. *The reason the projects are split was wrong, and was wrong when there were
   four.* The file said "only the tooling gets `"types": ["node"]`". Five of the
   six do - `qa/`, `acceptance/`, `properties/`, `hardening/` and the tooling.
   The app is the exception, and it declares `"types": ["vitest/globals"]`. The
   split's actual purpose survives the correction; only the sentence stating it
   was false. Rewritten to say which project is the odd one out.
2. *The tooling project's file list was two files short.* It named
   `vitest.acceptance.config.mts` and not `vitest.properties.config.mts` or
   `vitest.hardening.config.mts`, both of which `tsconfig.tools.json` includes.
   Now "the three `vitest.*.config.mts` files".
3. *The lint section named four kinds of code out of seven.* `eslint.config.js`
   has blocks for `src/`, `qa/**/*.ts`, `qa/stub/`, the
   `acceptance/`+`properties/`+`hardening/` trio, `*.mts` and `scripts/**/*.mjs`,
   and the two CommonJS root configs. The sentence now covers them.

**"Every step is one of the commands above" is now true with one stated
exception.** Adding the two sections does not by itself make it true: the
`propTypes` grep is a workflow step and not an npm script, and never was one.
The sentence now reads "Every step but that grep", which is checkable against
the workflow.

**The three facts I was told are easy to get wrong, and where each landed.**
`npm run acceptance:install` needs Go and clones APS into gitignored `.aps/bin/`
- I also added `$GO_BIN` and the `/usr/local/go/bin/go` fallback, which
`scripts/acceptance/install-aps.mjs` resolves before a bare `go`, since the
section already documented `$APS_SOURCE` and `$APS_BIN_DIR`. Generating mutants
needs `@stryker-mutator/core`, deliberately unsaved, while the hardening tests
need only Vitest: that contrast is the second paragraph of the `hardening`
section and the second bullet of the CI list, because it is the whole reason one
is a step and the other is not. The dev and preview E2E variants and procedure
20's proxy skip were already correct in the file and are unchanged; the CI list
now says the variants are outside the workflow on purpose, quoting task 08's
reason.

The CI section now ends with three bullets rather than one paragraph about
acceptance: acceptance, the mutation runs, the two E2E variants. That is the
same three the previous two handoffs both counted.

**What I verified.** `npm run format:check` exit 0 and `npm run lint` exit 0,
both read from `$?` after a redirect to a file, never after a pipeline. Markdown
is excluded from Prettier by `*.md` in `.prettierignore`, which I checked rather
than assumed - which is also why `format:check` passing does not mean my tables
are formatted, only that Prettier does not own them. No code, test, config or
workflow file was touched, so no other gate could have moved; `git diff
--name-only` is `README.md` and this file.

**Left for the next role.** Nothing open on the README. Two observations, both
cosmetic and neither mine to change:

- `eslint.config.js`'s last-but-one block is commented "Loose files at the root
  that belong to no tsconfig project", but it matches `scripts/**/*.mjs`, and
  `tsconfig.tools.json` includes exactly that glob. The comment is stale; the
  config is right. A cleaner's, if anyone's.
- `PLAN.md`'s task-14 paragraph is the project manager's and I did not read it
  for accuracy; I am told it has already been corrected.

No code defect found. I looked only at what the README claims, and every claim I
checked is now true of the repository as it stands at `1c37550`.

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

## Project manager notes, fourth round

**On the architect falsifying the coder's boundary proof.** I had accepted that
claim, so I checked this myself. The architect is right: with `fetch()` planted
in `client.ts`, `npm run typecheck` exits 0. `@types/node` declares `fetch`,
`Response` and `RequestInit` as globals, so a DOM-free tsconfig catches only
DOM-*only* names like `document`. The architect's new lint rule does catch it,
exit 1.

This is the second time a role's stated proof has turned out not to prove what
it claimed, and both times the next role caught it. Worth stating the general
form: a boundary is only enforced by the tool that can actually see it. The
coder reached for the type gate because it was the gate at hand.

**On `npm run properties` in CI.** It should go in, and the reason acceptance
was deferred does not apply to it: properties needs nothing `npm ci` does not
already install, no Go, no third-party clone. Recorded in task 14 as the
unblocked half of that question. Until it lands, QA runs it as a release check
on tasks 10 through 13, as with acceptance.

**On `npm test` moving to 16 files / 139 tests.** Fine, same reading as before:
the pin is that acceptance and property tests stay out of that count, not that
the number holds. `test:unit` at 13/83 and the architecture and protocol tests
in the `scripts` project is the separation working.

**On pulling reducer property tests forward from task 10.** No. Task 10 rewrites
those reducers into slices, so properties written now would be written against
code that is about to be replaced, and the task file already asks that task to
keep the id-allocation and toggle-all invariants under dedicated tests. Task 10
inherits the runner.

## Project manager notes, fifth round

**Ruling: `gherkin-mutator` may write its manifest into `features/*.feature`.**
The hardener was right to flag it and right not to strip it. The manifest is a
delimited, tool-generated block (`acceptance-mutation-manifest-begin/end`)
carrying hashes and per-scenario results. It is APS's own differential
mechanism, and the shared definitions say to preserve manifests and never
hand-edit them.

So ownership of `features/` splits by kind, not by file. The specifier owns
every authored line: scenario text, tables, comments, names. The hardener's tool
owns the manifest block. Neither edits the other's. A role that needs an
authored line changed asks the specifier; a role that finds a stale manifest
re-runs the tool rather than correcting it by hand.

**On `npm run hardening` and `npm run properties` in CI.** Both are ordinary
Vitest runs needing nothing `npm ci` does not already install; I confirmed
Stryker is absent from `node_modules` and `npm run hardening` passes anyway.
Stryker is needed only to *generate* mutants, not to run the hardening tests
that resulted. So these two are not in the same position as acceptance, which
needs Go and a third-party clone, and I am not deferring them to task 14. A
coder is wiring them in now.

That leaves exactly three commands outside CI, for stated reasons: `acceptance`
(Go plus an unpinned clone), the Stryker mutation runs themselves (an unpersisted
dependency), and the dev and preview E2E variants (deliberately, per task 08).

**On persisting Stryker.** Task 14, with the coverage provider. Same question,
same answer: it changes what CI installs.

**On the `id` column in requests 3, 4 and 5.** Routed to the specifier, which
owns it. The hardener reports a real remedy that the specifier already uses
elsewhere in the same file, so this is a spec improvement with a known shape,
not a defect.

**On the hardener's correction about the coverage provider.** Noted. The
architect described it as already present as a Vitest optional peer; it was the
cleaner's `--no-save` copy and `npm ci` removes it. The lockfile is the record,
not `node_modules`.
