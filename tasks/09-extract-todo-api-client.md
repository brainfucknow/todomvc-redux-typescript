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
