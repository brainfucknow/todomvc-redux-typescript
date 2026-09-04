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

### QA
