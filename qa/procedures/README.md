# E2E QA procedures: current behavior of the TodoMVC client

These procedures characterize the app **as it behaves today**, on the unmodified
repository. They are written by the specifier and executed by QA. Every step is a
user action in the browser and every expected result is something a user can see
on screen. No procedure reads Redux state, calls `api/todos/` to drive the app,
or inspects module internals.

Where a procedure records behavior that looks wrong, it says so under **Notes**
and still specifies the behavior as it is. Nothing here asks for a fix.

## How to read a procedure

Each file is one workflow and has the same sections:

| Section | Meaning |
| --- | --- |
| Workflow | The user goal being characterized. |
| Preconditions | Backend fixture, faults armed, and where the browser starts. |
| Inputs | What the operator types or clicks. |
| Steps | Numbered UI actions. |
| Expected observable results | What must be true on screen afterwards. |
| Notes | Recorded quirks, defects, and things deliberately not asserted. |

"Wait for X" means poll until X holds, failing after 5 seconds. Never assert
after a fixed delay: every mutation in this app is a network round trip and a
fixed sleep is the only way to make this suite flake.

## Environment assumptions

1. The app is served **at the site root** (`/`). The client fetches the relative
   URL `api/todos/`, which resolves against the document URL; serving the app
   under a sub-path would change the request URL and invalidate every procedure.
2. `api/todos/` on the same origin reaches the stub backend.
3. The suite starts the app and the stub itself. No Docker, no manually started
   backend.
4. Before each procedure the harness resets the stub: fixture data restored to
   the one the procedure names, all faults cleared.

The app may be served from the dev server or from a production build; the
procedures do not depend on which. One difference to be aware of: under the dev
server the app runs inside `React.StrictMode`, which mounts the list twice, so
**the initial `GET api/todos/` is issued twice**. The stub must answer both
identically, and faults must be armed per method-and-path rather than "the next
request" (see Faults below).

## Element vocabulary

Names used in the steps, and how a user recognizes them. Selectors are given for
convenience; they are the app's public UI surface (TodoMVC's standard markup),
not internals.

| Name | What the user sees | Selector |
| --- | --- | --- |
| New-todo field | Text box with placeholder "What needs to be done?" | `.new-todo` |
| Todo list | The list of rows | `.todo-list` |
| Row | One todo | `.todo-list li` |
| Row label | The todo's text | `.todo-list li label` |
| Row checkbox | The round check control at the left of a row | `.todo-list li input.toggle` |
| Destroy button | The red x at the right of a row; **hidden until the row is hovered** | `.todo-list li button.destroy` |
| Edit field | The text box that replaces a row while editing | `.todo-list li.editing input.edit` |
| Toggle-all control | The chevron to the left of the new-todo field | `.toggle-all + label` |
| Toggle-all state | Whether the chevron is dark (all complete) or grey | `input.toggle-all` checked |
| Count | "N items left" line in the footer | `.todo-count` |
| Filter links | "All", "Active", "Completed"; the current one is highlighted | `.filters a`, current has class `selected` |
| Clear-completed button | Button reading "Clear completed" | `.clear-completed` |
| Footer | The bar holding count, filters and clear-completed | `.footer` |
| Header heading | The large "todos" title; used as a neutral click-away target | `.header h1` |

A row is "shown complete" when its checkbox reads checked and its label is
struck through.

## Backend fixture contract

Observed from what the client sends and how it renders what comes back. The stub
must satisfy all of it or the procedures are not reproducible.

| Request | Body sent | Response the client needs |
| --- | --- | --- |
| `GET api/todos/` | none | `200`, JSON array of `{id:number, text:string, completed:boolean}`. The app renders the rows in array order. |
| `POST api/todos/` | `{"text":"..."}` | `200`, JSON of the created todo, **complete object** with a fresh id. |
| `PATCH api/todos/<id>` | `{"text":"..."}` or `{"completed":true|false}` | `200`, JSON of the **complete updated todo**. The app replaces its copy of the row with this object wholesale, so a partial response blanks the fields it omits. |
| `DELETE api/todos/<id>` | none | `200`. The body is never read. |

`PATCH` and `DELETE` URLs carry no trailing slash; `GET` and `POST` do.

### Fixtures

Named fixtures used by the procedures. Ids are fixed so `PATCH`/`DELETE` URLs are
predictable.

- **EMPTY**: `[]`
- **ONE_ACTIVE**: `[{id:1, text:"Buy milk", completed:false}]`
- **TWO_COMPLETED**: `[{id:1, text:"Buy milk", completed:true}, {id:2, text:"Write tests", completed:true}]`
- **THREE_MIXED**:
  `[{id:1, text:"Buy milk", completed:false},`
  ` {id:2, text:"Write tests", completed:true},`
  ` {id:3, text:"Ship it", completed:false}]`

A `POST` against any fixture creates the next free id.

### Faults

Two kinds, armed per method-and-path, staying armed until the harness resets.
"The next request" is not a usable unit here because the initial `GET` happens
twice under StrictMode.

- **transport(method, path)**: matching requests get no valid HTTP response (the
  connection is closed). This is the only fault the client recognizes as failure.
- **status(method, path, code, body)**: matching requests get that HTTP status and
  body. The client never checks the status; see `21-http-error-status-ignored.md`.

The stub must also be able to report how many matching requests it has faulted.
The failure procedures need it, for the reason below.

Arming a fault, seeding a fixture, and asking whether a faulted request has
arrived all happen through the stub's own control channel, which is test
scaffolding, not the app under test. It is used for setup and synchronization
only: no procedure decides pass or fail from it, and no procedure drives the app
by calling `api/todos/` directly.

## Asserting that nothing happened

The failure procedures assert absences: no new row, no changed text, no error.
An absence is only meaningful once the request has actually failed, and the app
shows nothing at that moment to wait for. So those procedures wait on the stub
having faulted the request, then assert on screen. That wait is synchronization,
never the assertion. Do not substitute a fixed sleep: it either flakes or hides
a real regression behind a slow machine.

## What the app never shows

Recorded once here because it shapes the expected results of every failure
procedure: **the app has no loading indicator and no error message**. A failed
request leaves the screen exactly as it was, apart from whatever the user's own
action already changed locally. Failures are visible only as an absence of the
change the user asked for.

## Local-only actions

Three actions never reach the backend: toggle-all, clear-completed, and changing
the filter. Their effects are lost on reload. The procedures for the first two
assert that.

## Index

| # | Procedure | Workflow |
| --- | --- | --- |
| 01 | `01-initial-load.md` | Loading the app populates the list from the backend |
| 02 | `02-empty-list-state.md` | What the screen shows with no todos |
| 03 | `03-add-todo.md` | Adding a todo |
| 04 | `04-add-todo-text-rules.md` | What the new-todo field accepts and how it clears |
| 05 | `05-edit-todo.md` | Editing a todo by double-click, committed with Enter |
| 06 | `06-edit-todo-blur-commit.md` | Editing committed by clicking away |
| 07 | `07-edit-todo-to-empty-deletes.md` | Clearing a todo's text deletes it |
| 08 | `08-delete-todo.md` | Deleting a todo |
| 09 | `09-toggle-todo.md` | Completing and reactivating one todo |
| 10 | `10-toggle-all.md` | Toggling every todo at once |
| 11 | `11-clear-completed.md` | Clearing completed todos |
| 12 | `12-filter-all.md` | The All filter |
| 13 | `13-filter-active.md` | The Active filter |
| 14 | `14-filter-completed.md` | The Completed filter |
| 15 | `15-item-count.md` | The count text and its singular, plural and zero forms |
| 16 | `16-load-failure.md` | What the user sees when the initial load fails |
| 17 | `17-add-failure.md` | What the user sees when adding fails |
| 18 | `18-edit-failure.md` | What the user sees when an edit fails |
| 19 | `19-toggle-failure.md` | What the user sees when a toggle fails |
| 20 | `20-delete-failure.md` | What the user sees when a delete fails |
| 21 | `21-http-error-status-ignored.md` | HTTP error statuses are treated as success |
