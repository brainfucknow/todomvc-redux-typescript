# Task 09: Extract the todo API client into a testable module

**Track:** Structural
**Chain:** specifier -> coder -> cleaner -> architect -> hardener -> QA

The specifier's job on this track is narrower than the full brief: write Gherkin only for the behavior being moved into a testable module, so the coder has an acceptance target for the extracted logic. Update the E2E procedures from Task 1 only if a workflow's observable behavior would change. It should not; if it must, stop and ask the project manager.

The hardener is in this chain because the task creates a testable module.

**Status:** pending

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

### Coder

### Cleaner

### Architect

### Hardener

### QA
