# Task 01: Characterize current behavior

**Track:** Characterization (runs before every other task)
**Chain:** specifier -> QA
**Status:** in progress

## Goal

Produce an executable regression suite that pins every user-visible workflow of the app as it behaves today, on the unmodified repository. This suite is the bar every later task must clear.

## Context the roles need

The app is a TodoMVC client over a REST backend. Every add, edit, delete, and per-todo toggle round-trips to `api/todos/`; the CRA dev server proxies that to `http://localhost:4000` (the `proxy` field in `package.json`), where `todo-backend-express` normally runs. Three actions are local only and never touch the network: toggle-all, clear-completed, and changing the visibility filter.

The store seeds `todos` with one hardcoded entry, `{ id: 0, text: 'Use Redux', completed: false }`. A successful `LOAD_TODO_SUCCESS` replaces that array wholesale.

Baseline commands verified green on this commit:

- `npx react-scripts test --watchAll=false` -> 10 suites, 54 tests
- `npx react-scripts build` -> compiles
- `npx react-scripts start` -> dev server on port 3000

## Scope

- Walk the running app and record every user-visible workflow: initial load, adding a todo, editing a todo by double-click, deleting a todo, toggling one todo, toggling all, clearing completed, each of the three filters, the item-count text and its singular/plural form, and what the user observes when a backend call fails.
- Write the E2E QA procedures under `qa/procedures/`. Observable behavior only. No Gherkin in this task; there is no new behavior to specify.
- Build a stub backend under `qa/` implementing the todo-backend contract this client actually uses: `GET api/todos/`, `POST api/todos/`, `PATCH api/todos/:id`, `DELETE api/todos/:id`. It must be startable by the test command, deterministic, resettable between tests, and able to be told to fail a request so failure procedures are executable.
- Convert every procedure into an executable browser test driving the real UI. Playwright is the expected driver; if you choose otherwise, say why in your handoff.
- Confirm the whole suite passes against the unmodified repository. If a procedure cannot be made to pass, the procedure is wrong or the behavior is not what it looked like. Fix the procedure, do not change the app.
- Add the command that runs the suite to `package.json` and name it in the handoff.

## Out of scope

- Any change to `src/`. Not one line. This task characterizes; it does not modify.
- Changing build tooling, dependencies used by the app, or the existing unit tests.
- Specifying behavior the app does not have today. If something looks like a bug, record it as observed behavior and note it. Do not fix it.
- Gherkin.

## Done criteria

- `qa/procedures/` contains one procedure per user-visible workflow, each stating workflow, inputs, outputs, and observable states verifiable without internals.
- Every procedure has a corresponding executable test.
- The suite passes against the unmodified repository, twice in a row, with no flake.
- The suite runs unattended, with no Docker and no manually started backend.
- `git status` shows no modification under `src/`.
- The handoff lists every procedure and the exact command that runs the suite.

## Handoffs

### Specifier

**Changed.** Added `qa/procedures/`: a `README.md` and 21 numbered procedure
files. Nothing else. `src/` is untouched.

- `README.md` — how to read a procedure, environment assumptions, element
  vocabulary, the backend fixture contract, the named fixtures, the fault kinds,
  the rule for asserting that nothing happened, and the index.
- `01-initial-load.md` — a successful load replaces the seed row with the backend's todos.
- `02-empty-list-state.md` — no todos: no footer, no filters, no toggle-all; adding one brings them back.
- `03-add-todo.md` — Enter appends a todo through a round trip.
- `04-add-todo-text-rules.md` — Enter trims; blank input adds nothing but still clears the field; Escape does nothing.
- `05-edit-todo.md` — double-click opens the edit field, Enter saves, Escape does not cancel.
- `06-edit-todo-blur-commit.md` — clicking away saves, and saves untrimmed.
- `07-edit-todo-to-empty-deletes.md` — committing an empty edit deletes the todo.
- `08-delete-todo.md` — the destroy button, hidden until the row is hovered.
- `09-toggle-todo.md` — one todo's checkbox, both directions, no optimistic flip.
- `10-toggle-all.md` — marks all, unmarks all, and is lost on reload.
- `11-clear-completed.md` — removes complete rows locally, and is lost on reload.
- `12-filter-all.md`, `13-filter-active.md`, `14-filter-completed.md` — one per filter, including the empty-under-filter screen.
- `15-item-count.md` — "2 items left", "1 item left", "No items left".
- `16-load-failure.md` — a failed load leaves the hardcoded "Use Redux" row on screen, silently.
- `17-add-failure.md` — the typed text is gone and no row appears.
- `18-edit-failure.md` — edit mode closes and the text snaps back.
- `19-toggle-failure.md` — the checkbox never moves.
- `20-delete-failure.md` — the row stays.
- `21-http-error-status-ignored.md` — a 500 is applied as success: a deleted-looking row that is still on the server, and a 500 body rendered as the todo list.

**Verified.** By reading `src/` and `node_modules/todomvc-app-css/index.css` at
`66d36ad`, not by running the app: there is no stub backend and no browser driver
in the tree yet, so nothing was executable. Every expected result traces to code I
read. Specifically confirmed there: the seed row survives a failed load; the client
checks neither `response.ok` nor the status code, and never reads a delete
response body at all; Enter trims and click-away does not; Escape has no handler;
toggle-all, clear-completed and the filters dispatch no request; the count text is
`activeCount || 'No'` with the noun singular only at 1; the destroy button is
`display:none` until `li:hover`; the toggle-all chevron is the `label` next to the
hidden checkbox, and the `h1` sits 140px above the app box so it is a safe
click-away target that the chevron does not overlap.

**Left for QA.**

- The procedures assume two fault kinds, not one: `transport(method, path)`, the
  only kind the client recognizes as failure, and `status(method, path, code,
  body)`, needed for procedure 21. The stub also has to report how many matching
  requests it has faulted, because the failure procedures assert absences and the
  UI shows nothing to wait for; that report is synchronization only and must not
  decide pass or fail.
- Faults are armed per method-and-path and stay armed until reset, not "the next
  request": under the dev server StrictMode mounts the list twice and the initial
  `GET api/todos/` is issued twice.
- `PATCH` must return the complete updated todo. The app replaces its row with the
  response wholesale, so a partial response blanks the fields it omits.
- The app must be served at the site root. The client fetches the relative URL
  `api/todos/`, which resolves against the document URL.
- Playwright is not installed. QA adds the driver, the stub, the tests, and the
  suite command.
- Procedures 16 to 21 characterize defects the task told me to record rather than
  fix: the silent failures, the surviving seed row, the lost text on a failed add,
  the ignored HTTP status, and toggle-all and clear-completed never reaching the
  backend. If one of them cannot be made to pass, the procedure is wrong; fix the
  procedure.

**Open questions.** None that block QA. One judgment call to flag rather than
ask: the task lists eleven workflows and I wrote 21 procedures, splitting the
input rules of the new-todo field, the two ways an edit commits, and each
failure mode into their own files so each maps to one test. If the project
manager wants one file per listed workflow instead, the split is easy to fold
back.

### QA

**Changed.** Added the driver, the stub backend, and one executable test per
procedure. No procedure needed changing: all 21 pass exactly as the specifier
wrote them. `src/` is untouched (`git status -- src` is empty).

- `qa/stub/` — the stub backend, plain CommonJS so `node qa/stub/main.js` runs it
  with no build step. `fixtures.js` (the four named fixtures), `todo-store.js`
  (the todo collection and next-free-id), `faults.js` (the fault registry),
  `todo-api.js` (`api/todos/` routes to store operations), `control-api.js` (the
  `/__qa/` control channel), `static-files.js` (serves the built app at the site
  root), `http-io.js`, `server.js` (routing), `main.js` (entry).
- `qa/tests/` — 21 spec files, one per procedure, plus `support/` (`screen.ts`
  holds the README's element vocabulary, `stub-control.ts` the control-channel
  client and the faulted-request wait, `app-test.ts` the fixtures).
- `qa/playwright.config.ts` — Playwright, as expected. `workers: 1` and
  `fullyParallel: false` because one stub serves the whole suite; `retries: 0`
  because a retry would hide the flake this suite exists to rule out;
  `expect.timeout` 5000 to match the README's "wait for X, fail after 5 seconds".
- `package.json` — `@playwright/test` devDependency and the suite command.
- `.gitignore` — `qa/.artifacts/` (Playwright report and traces).

**The command.** `npm run test:e2e`. It builds the app, starts the stub, runs all
22 test cases, and stops the stub. No Docker, no manually started backend, no
`playwright install`. Passes with `CI=1` too.

**How the app is served.** The stub serves the production build at the site root
and answers `api/todos/` on the same origin, so the relative URL the client
fetches resolves correctly and no CRA dev-server proxy is involved. The
procedures allow either the dev server or a build; the build was chosen because
it removes the StrictMode double mount and the HMR socket as sources of noise.
The stub still meets the specifier's constraint anyway: faults are armed per
method-and-path and stay armed until reset, so a suite run against the dev server
would behave the same. `main.js` serves `build/`, falling back to `dist/`, and
honours `QA_APP_DIR`; after the Vite task the command needs no change.

**The control channel.** `POST /__qa/reset {fixture}` (seeds a fixture and clears
faults), `POST /__qa/faults {kind, method, path, code, body}` (arms
`transport` or `status`), `DELETE /__qa/faults`, `GET /__qa/faults` (reports each
armed fault's `matched` count). Every test resets before navigating. The
failure tests wait on `matched > 0` for synchronization only, then assert on
screen; no test decides pass or fail from the channel and no test drives the app
through `api/todos/`.

**Verified.**

- 22 test cases (21 procedures; procedure 21 has two cases) pass against the
  unmodified repository. Run twice in a row green, and once more at
  `--repeat-each=3` (66 passes) to look for flake. None seen.
- The harness fails when the app does: a deliberately wrong expectation in
  procedure 01's count was confirmed to fail before being reverted.
- Faults genuinely change what the app does, so procedures 16 to 21 are not
  vacuous: the seed row appears only under a faulted load, and the 500 body of
  case B renders as the list.
- Baseline still green: `npx react-scripts test --watchAll=false` -> 10 suites,
  54 tests; `npx react-scripts build` -> compiles (also under `CI=1`, so no
  warnings).
- `git status -- src` shows nothing.

Procedures and their tests:

| Procedure | Test |
| --- | --- |
| `01-initial-load.md` | `qa/tests/01-initial-load.spec.ts` |
| `02-empty-list-state.md` | `qa/tests/02-empty-list-state.spec.ts` |
| `03-add-todo.md` | `qa/tests/03-add-todo.spec.ts` |
| `04-add-todo-text-rules.md` | `qa/tests/04-add-todo-text-rules.spec.ts` |
| `05-edit-todo.md` | `qa/tests/05-edit-todo.spec.ts` |
| `06-edit-todo-blur-commit.md` | `qa/tests/06-edit-todo-blur-commit.spec.ts` |
| `07-edit-todo-to-empty-deletes.md` | `qa/tests/07-edit-todo-to-empty-deletes.spec.ts` |
| `08-delete-todo.md` | `qa/tests/08-delete-todo.spec.ts` |
| `09-toggle-todo.md` | `qa/tests/09-toggle-todo.spec.ts` |
| `10-toggle-all.md` | `qa/tests/10-toggle-all.spec.ts` |
| `11-clear-completed.md` | `qa/tests/11-clear-completed.spec.ts` |
| `12-filter-all.md` | `qa/tests/12-filter-all.spec.ts` |
| `13-filter-active.md` | `qa/tests/13-filter-active.spec.ts` |
| `14-filter-completed.md` | `qa/tests/14-filter-completed.spec.ts` |
| `15-item-count.md` | `qa/tests/15-item-count.spec.ts` |
| `16-load-failure.md` | `qa/tests/16-load-failure.spec.ts` |
| `17-add-failure.md` | `qa/tests/17-add-failure.spec.ts` |
| `18-edit-failure.md` | `qa/tests/18-edit-failure.spec.ts` |
| `19-toggle-failure.md` | `qa/tests/19-toggle-failure.spec.ts` |
| `20-delete-failure.md` | `qa/tests/20-delete-failure.spec.ts` |
| `21-http-error-status-ignored.md` | `qa/tests/21-http-error-status-ignored.spec.ts` (two cases) |

**Left for the next role.**

- Run `npm run test:e2e` on every later task. A procedure and its test change
  together; nobody but QA writes, runs, or maintains them.
- The Vite task changes the build output directory. The stub already falls back
  from `build/` to `dist/` and honours `QA_APP_DIR`, so the suite command should
  survive, but confirm it rather than assume it.
- The React 19 task removes `react-shallow-renderer` and `propTypes`. Neither is
  observable through the UI, so nothing here should move.
- `qa/` is deliberately outside `tsconfig.json`'s `include`: TypeScript 3.9
  cannot parse the Playwright type definitions, and Playwright transpiles the
  specs without typechecking them. When the TypeScript 5 task lands, adding a
  `qa/` typecheck becomes possible and worth doing.
- Two behaviours the procedures record but no test can pin any tighter, because
  the app renders nothing at the moment they happen: that toggle-all and
  clear-completed issue no request at all (the tests observe only that a reload
  discards them), and that a failed request produces no UI at all (the tests
  observe only the absence of change). If a later task adds a loading or error
  indicator, procedures 16 to 20 and the `expectNoErrorUi` helper must be
  rewritten by the specifier first; that is a behaviour change, not a
  refactoring.

**Open questions.** None. On the specifier's flagged judgment call: the 21-file
split is kept, one test per procedure. It maps cleanly and each failure names one
workflow, so folding it back would cost information for no gain. If the project
manager still wants one file per listed workflow, say so and it can be merged.
