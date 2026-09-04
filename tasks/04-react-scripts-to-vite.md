# Task 04: Replace react-scripts with Vite

**Track:** Tooling
**Chain:** coder -> architect -> QA

The architect is in this chain because Vite forces file moves and import-path changes. The architect's job here is narrowed: review only the moves and boundary changes the tooling forced, and record extraction candidates in the note rather than acting on them.

**Status:** in progress

## Goal

Build, serve, and preview the app with Vite. Remove `react-scripts` from the repository.

## Context

Create React App is archived. `react-scripts` 5.0.1 pins a webpack 5 / Babel 7 stack whose transitive dependencies no longer receive fixes.

Vite config already exists from task 03 and carries the Vitest settings. This task extends it to build the app.

Things `react-scripts` does today that must keep working:

- Serves `public/index.html` with the bundle injected, on port 3000.
- Proxies unmatched requests to `http://localhost:4000`, configured by the `proxy` field in `package.json`. The app fetches relative paths like `api/todos/`, so this proxy is load-bearing in development.
- Provides ambient types via `/// <reference types="react-scripts" />` in `src/react-app-env.d.ts`.
- Serves `todomvc-app-css/index.css`, imported from `src/index.tsx`.
- Reads `REACT_APP_`-prefixed env variables. Nothing in `src/` reads any today; confirm that before deciding what to migrate.

## Scope

- Move `public/index.html` to the project root and add the module script tag pointing at `src/index.tsx`. Keep the `<div class="todoapp" id="root">` element and the page title exactly as they are.
- Replace `src/react-app-env.d.ts` with a Vite equivalent.
- Move the dev proxy from the `package.json` `proxy` field into the Vite server proxy config, preserving the same target and the same set of proxied paths.
- Note that `npm start` does not currently run in this container at all: `react-scripts` fails with `options.allowedHosts[0] should be a non-empty string` before it compiles. That is pre-existing and environmental, a CRA 5 quirk with the `proxy` field and no LAN address, confirmed by task 03's QA against an earlier commit. It is not a regression you introduced, and moving off `react-scripts` is expected to resolve it. Confirm that the Vite dev server does start.
- Add `npm run build`, `npm start` or `npm run dev`, and `npm run preview` scripts.
- Add `npm run typecheck`, since Vite does not typecheck during build and `react-scripts` did. It cannot be a bare `tsc --noEmit` that exits zero: TypeScript 3.9 cannot parse the `.d.ts` files its modern dependencies ship, so `npx tsc --noEmit` currently reports around 1800 parse errors, every one of them inside `node_modules` and none under `src/`. Task 05 clears that by bumping the compiler; you cannot, because `react-scripts` 5.0.1 declares a `typescript` peer of `^3.2.1 || ^4` and would refuse to install TypeScript 5 while it is still here. So make the script gate on what is meaningful today and achievable: no error in the project's own sources. Say plainly in your handoff how you scoped it and what it currently reports.
- Remove `react-scripts` and any dependency that only existed to serve it.
- Update `.gitignore` for Vite's output directory if it differs from `build/`.
- Confirm `npm run test:e2e` still runs. The E2E stub serves the built app from `build/`, falling back to `dist/`, and honours a `QA_APP_DIR` override, so the command is expected to survive the output-directory change. Confirm that; do not assume it. The stub and the tests belong to QA: if the command needs a change, QA makes it, not the coder.
- Update `README.md` where it documents CRA commands and `npm run eject`.
- Decide `"type": "module"` in `package.json`. Vite 8 prints a deprecation warning on every run because `vite.config.ts` is ESM loaded as CJS. Task 03 left this alone deliberately: setting it changes how `react-scripts` and `qa/playwright.config.ts` load, and `react-scripts` is still present there. It is gone by the time you run, so settle it here. If setting it breaks `qa/playwright.config.ts`, that file is QA's; stop and report rather than editing it.

## Out of scope

- Changing any application logic. `src/**/*.tsx` and `src/**/*.ts` change only where the tooling forces it: the entry file's imports, and the ambient type declaration file.
- Extracting logic out of components. If you see candidates, record them; do not act.
- Changing React, TypeScript, or lint tooling versions.
- Adding a deployment target.

## Done criteria

- `npm run build` produces a production bundle with no `react-scripts` involved.
- `npm run preview` serves that bundle and the app works in it.
- `npm run dev` serves the app and its proxy reaches a backend on port 4000.
- `npm run typecheck` passes, gating on the project's own sources. Zero errors under `src/`. The `node_modules` parse errors are task 05's to clear.
- `npm test` passes with the same test count as before.
- The regression suite from `qa/procedures/` passes against the dev server and against the preview server.
- No occurrence of `react-scripts` remains in the repository.
- The architect's note lists any extraction candidates seen, for the project manager to plan as structural tasks.

## Handoffs

### Coder

**Changed**

- `public/index.html` -> `index.html` at the project root, with `<script type="module" src="/src/index.tsx"></script>`. Title and `<div class="todoapp" id="root">` are byte-identical; the CRA template comment is gone. `public/` held nothing else and was removed, so Vite has no `publicDir`.
- `src/react-app-env.d.ts` -> `src/vite-env.d.ts`, now `/// <reference types="vite/client" />`.
- `vite.config.ts` -> `vite.config.mts`, extended with `server.port: 3000` and a `/api` proxy to `http://localhost:4000`. The Vitest block is unchanged. `preview` gets the same proxy so the built bundle can talk to the same backend.
- `package.json`: `dev`, `start` (alias), `build`, `preview`, `typecheck` added; `eject` and the `proxy` field removed; `react-scripts` dropped from devDependencies. `npm install` pruned 1413 packages from the lockfile.
- `scripts/typecheck.mjs` added (see below).
- `.gitignore`: `build/` replaced by `dist/`.
- `README.md` rewritten: no Create React App, no `react-scripts`, no `eject`, and every command it now documents exists.
- No file under `src/` changed other than the ambient declaration rename. `todomvc-app-css` imports from `src/index.tsx` unchanged and it resolves.

**`"type": "module"`: decided no**

Setting it breaks QA-owned code, not just the config. `qa/stub/*.js` are eight CommonJS files; with `"type": "module"` in the root package.json, `node qa/stub/main.js` dies with `require is not defined in ES module scope`. Verified, then reverted. Rather than force a change QA would have to make, I renamed the config to `vite.config.mts`, which is the other remedy Vite's own warning names. The `configLoader: 'native'` deprecation warning is gone from every command. `qa/playwright.config.ts` was not touched and still loads.

**How `npm run typecheck` is scoped, and a caveat worth reading**

`scripts/typecheck.mjs` runs `tsc --noEmit --pretty false`, prints only diagnostics whose path starts with `src/`, and exits non-zero if there are any. Today it reports: `0 error(s) under src/, 313 in dependencies (task 05)`. The dependency count fell from roughly 1800 to 313 simply because `react-scripts`' tree is gone.

The caveat: while those 313 parse errors stand, tsc withholds *semantic* diagnostics for the whole program. I probed it both ways. A syntax error planted in `src/` is reported and the gate fails. A type error planted in `src/` (`const bad: number = "x"`) produces no diagnostic at all, and the gate passes. So the script gates on syntax in the project's sources, not on types, and it will keep doing so until task 05 bumps the compiler. No change to the script is needed then; it widens to a full type check on its own once the dependency parse errors clear. I could not do better inside this task's scope, which forbids changing the TypeScript version. QA and the project manager should read the done criterion "zero errors under `src/`" as satisfied but weaker than it sounds until task 05 lands.

**Output directory: `dist/`, and a trap in stale trees**

Vite's default is kept. `qa/stub/main.js` looks for `build/` *before* `dist/`, so a working tree that still holds the old `react-scripts` output would silently E2E-test the CRA bundle. I deleted the stale `build/` here. Anyone carrying one from before this task must delete it too. Nothing under `qa/` was edited and `npm run test:e2e` was not changed.

**Verified**

- `npm run build`: succeeds with no `react-scripts` in the tree. Main chunk 57.33 kB gzipped, against 56.9 kB under CRA.
- `npm run dev`: starts on port 3000. The pre-existing `options.allowedHosts[0] should be a non-empty string` failure is gone, as the task expected.
- Proxy: `curl http://localhost:3000/api/todos/` reaches a backend on 4000 with the path forwarded verbatim. I used QA's own stub as the backend (`QA_STUB_PORT=4000 QA_APP_DIR=dist node qa/stub/main.js`), read-only.
- Browser smoke against dev and against `npm run preview` (Chromium from `/opt/pw-browsers`): the app renders, a todo typed into `.new-todo` round-trips through the proxy to the backend and appears in the list, and the console is clean.
- `npm test`: 10 files, 55 tests, unchanged.
- `npm run test:e2e`: 22 passed, twice, with `qa/` untouched. The stub's `dist/` fallback carries it.
- `grep` for `react-scripts` outside `tasks/` and `PLAN.md`: nothing.
- `grep` for `REACT_APP_` and `process.env` under `src/`: nothing. There was no env usage to migrate, as the task suspected.

**Left for the next roles**

- Architect: the forced moves are `index.html` to the root, `react-app-env.d.ts` -> `vite-env.d.ts`, and the config rename. No module boundary inside `src/` moved.
- QA: the regression suite runs against the built bundle through the stub. Running the procedures against `npm run dev` and `npm run preview` needs a backend on 4000; QA's own stub serves as one with `QA_STUB_PORT=4000`.
- `react-scripts` still appears in `PLAN.md` and in several `tasks/*.md`, where it is history rather than tooling. I left the planning documents alone. If the done criterion is meant literally, that is the project manager's call, not mine.
- `browserslist` stays in `package.json` and is now read by nothing: Vite targets through esbuild. It is dead config, not a dependency, so I left it for task 08's hygiene pass.
- `todomvc-app-css` makes lightningcss warn about `.todoapp input::input-placeholder` on every build. Benign: all three placeholder rules survive into the built CSS, and the italic placeholder renders in the browser check.

**Extraction candidates, recorded not acted on**

- `src/actions/api.ts`: five creators repeat the `api/todos/` literal, the Accept/Content-Type headers, and the request-shape assembly. A request-building module would be a testable module and would put the URL the dev proxy depends on in one place.
- `src/middlewares/callapimiddleware.ts`: one function validates the action, dispatches three lifecycle actions, performs `fetch`, decodes JSON, and logs to `console.error`. The dispatch policy is domain; the fetch and decode are an adapter.
- `src/reducers/todos.ts`: `LOAD_TODO_SUCCESS` returns `action.json` unvalidated, so a non-array response becomes the todo list and the next action throws `state is not iterable`. I hit this with a deliberately wrong stub backend. A decoding adapter at the boundary would answer it; the reducer should not.

**Open question**

Adding the `/api` proxy to `preview` as well as `server` goes one step past the literal scope line, which names only the dev proxy. I did it because the done criteria ask for the procedures to pass against the preview server, which needs a reachable backend. Say so if that should come back out.

**Note on the commit**

A commit (`Build, serve and preview with Vite; remove react-scripts`) appeared on the branch partway through this task. I did not run `git commit`. Since the brief says to leave the work uncommitted, I ran `git reset --soft` back to `4ce63dd`; nothing was lost and everything is in the working tree, with the renames still staged from `git mv`.

### Architect

**Branch state first.** The branch moved under me. The coder's note ends by
describing a `git reset --soft` back to `4ce63dd` with everything in the working
tree; what I found is a clean tree and three commits on top of `4ce63dd`
(`150cccd`, `636a27d`, `9be26bb`) carrying exactly that work. I committed
nothing, reset nothing, and changed no file other than this note. Every finding
below is a recommendation, not an edit.

**Scope.** Tooling task, so I reviewed only the moves and boundary changes Vite
forced and recorded candidates rather than acting. `git diff 4ce63dd..HEAD --
src` is one file: `react-app-env.d.ts` -> `vite-env.d.ts`. No module boundary
inside `src/` moved, and no import path inside `src/` changed. The coder's claim
holds.

**On the property-test bullet: it does not apply and I added nothing.** This
task moved zero logic. The only new executable code is `scripts/typecheck.mjs`,
a process shell whose whole job is to run `tsc` and filter its output; it has no
invariants, round trips, or ranges to state as properties. Picking a property
framework here would be choosing it for tasks 09-13 before their specifiers
exist. Left for whoever gets the first structural task.

**The four forced changes, judged**

1. *`public/index.html` -> `index.html` at the root.* Correct, and it is the
   right boundary: the HTML shell is environmental, it holds no policy, and the
   only thing it now asserts about the app is the entry module path. Title and
   `<div class="todoapp" id="root">` are byte-identical to `4ce63dd`; the only
   losses are the CRA template comment and `public/`, which held nothing else,
   so no static asset went missing. `publicDir` stays at Vite's default, which
   is `public/` — the same convention CRA used, so a future asset folder needs
   no config. One pre-existing wart I am flagging but not touching: the
   `todoapp` presentation class lives on the shell's root div rather than in the
   component tree, so `App.tsx` renders a bare `<div>` inside a styled one it
   cannot see. Tooling did not cause it and fixing it is a visible-DOM change.

2. *`react-app-env.d.ts` -> `vite-env.d.ts`.* This is the one forced change that
   could have silently broken something, because it is what declares
   `*.css` for `import 'todomvc-app-css/index.css'` in `src/index.tsx`, and the
   current gate cannot see semantic errors (below). So I verified it out of
   band, with a throwaway TypeScript 5.9 in a scratch directory, never installed
   into this repo: the CSS import resolves and the whole program reports exactly
   one error. `vite/client` genuinely replaces what `react-scripts` provided.
   Result in full below, as a gift to task 05.

3. *The dev proxy, `package.json` -> `vite.config.mts`.* Right direction: the
   proxy target is now one named constant shared by `server` and `preview`
   rather than a magic field npm-tooling happened to read. But it is a real
   narrowing of the boundary and QA needs to know, see the `/__qa/` finding
   below. Keeping the config in `.mts` rather than setting `"type": "module"` is
   the correct call for the reason the coder gave; it also keeps the module
   system of the app's config independent of QA's, which is a boundary worth
   having.

4. *Output `build/` -> `dist/`.* Fine. `.gitignore` now lists `dist` (line 83,
   inherited from the boilerplate's Nuxt section) and `dist/` (line 107). Both
   work; the duplicate is task 08 hygiene, not worth a commit now.

**Finding 1: the typecheck gate returns a false green when `tsc` does not run.**
This is in `scripts/typecheck.mjs`, one of the files in my review scope, and it
is worse than the weakness already recorded for task 05. `compiler.error` only
fires when *`npx` itself* fails to spawn. If `npx` spawns and then cannot run
`tsc` — a broken or partial install, a resolution failure, anything that prints
to stderr and exits non-zero — its message becomes a diagnostic line, no line
starts with `src/`, and `compilerRan` is true because `diagnostics.length > 0`.
The script prints `0 error(s) under src/` and exits 0. I reproduced it with a
copy of the script in a scratch directory, substituting a command that prints
npm's real "could not determine executable to run" to stderr and exits 1: exit
code 0, gate green. The narrowest fix is to stop inferring "the compiler ran"
from output volume and require that every diagnostic line look like one
(`/^\S+\(\d+,\d+\): (error|warning) TS\d+/`), treating any other stderr content
as a failure to run. That is a coder's edit to a shell script, not an
architecture change, so I did not make it. It matters most for task 08, which
will wire this into CI where nobody reads the output.

**Finding 2: the proxy no longer forwards `/__qa/`, and the coder's advice to
QA depends on it.** CRA's `proxy` field forwarded *every* unmatched request to
port 4000. `vite.config.mts` forwards `/api` only. For the application that is
strictly better — the proxied surface is now an explicit contract matching the
only paths `src/actions/api.ts` requests — and I am not proposing to widen it:
putting QA's `/__qa/` control prefix into the app's dev and preview config would
leak the test harness into the shipped configuration, which is exactly the
leakage this review exists to prevent. But the consequence needs saying plainly,
because the coder's "Left for the next roles" tells QA to run the procedures
against `npm run dev` and `npm run preview` with the stub on 4000, and
`qa/tests/support/stub-control.ts` drives `/__qa/reset` and `/__qa/faults` as
*relative* paths on `baseURL`. I measured all four combinations with the stub on
4000:

  - dev `GET /api/todos/` -> `200 []`, proxied, path forwarded verbatim.
  - preview `GET /api/todos/` -> `200 []`, same.
  - dev `GET /__qa/faults` -> `200` **`index.html`**, Vite's SPA fallback.
  - preview `GET /__qa/faults` -> `200` `index.html`.

The failure mode is nasty: not a 404 but a 200 carrying HTML, so a control call
that checks only the status code passes while resetting nothing. Procedures 16
to 21 inject faults and would run against whatever state the stub happened to
hold. `npm run test:e2e` is unaffected — there the stub serves the bundle itself
and app and control API share an origin — and it passed for me. If QA wants the
dev/preview runs, the harness must address the stub's own origin for `/__qa/`.
That is QA's file, so I neither changed it nor proposed the change to the coder.

**Verified**

- `npm test`: 10 files, 55 tests, pass.
- `npm run typecheck`: exit 0, `0 error(s) under src/, 313 in dependencies`.
- `npm run test:e2e`: 22 passed, `qa/` untouched, tree clean afterwards.
- `npm run dev` on 3000 and `npm run preview` on 4173: both serve the app, both
  proxy `/api` to a backend on 4000.
- `grep` for `react-scripts` outside planning documents: nothing. It survives in
  `PLAN.md` and in `tasks/04`, `05`, `06`, `08`, all as history.
- The 313 dependency parse errors are `@reduxjs/toolkit` (115), `tinybench`
  (40), `react-redux` (40), `vitest` (26), `expect-type` (48),
  `vite/types/importGlob.d.ts` (19, pulled in by the new `vite/client`
  reference), `reselect` (16), `@types/react/ts5.0` (9).

**For task 05, measured rather than guessed.** With a throwaway TypeScript 5.9
and this repository's *current* `tsconfig.json`, the entire program — not just
`src/` — reports exactly one error:

    src/test-support/fetch.ts(4,4): error TS2304: Cannot find name 'global'.

That is the intersection of two things task 05's file already knows: `types` is
`["vitest/globals"]`, which excludes `@types/node`, and this helper reaches for
`global`. `globalThis` is the narrowest fix and keeps `@types/node` out of the
app's compilation, which is what that task wants. So task 05's "zero errors
everywhere" is reachable, and whatever else it surfaces will come from its own
`target`, `jsx: react-jsx` and `moduleResolution: bundler` changes rather than
from a backlog this task left behind. Its plan to plant a type error and prove
the gate catches it is exactly right — and should be run *after* Finding 1 is
fixed, or the proof is weaker than it looks.

**Also worth the project manager's eye:** CI (`.github/workflows/nodejs.yml`)
runs `npm ci`, `npm run build --if-present`, `npm test`. It does not run
`npm run typecheck` or `npm run test:e2e`. Both gates now exist and neither is
enforced. `PLAN.md` puts CI release checks in task 08, so this is on the map,
but the gap widens with every task until then.

**One correction to `PLAN.md`.** Its "Architect and hardener placement" section
justifies putting me on task 04 partly because Vite "changes the env variable
prefix". There was no env variable to change: nothing under `src/` reads
`process.env` or any `REACT_APP_` name, which the coder checked and I confirmed.
The other two reasons — root `index.html` and the ambient declaration swap — are
real and were worth a review. No action needed; noting it so the record is
accurate.

**Extraction candidates for tasks 09-13.** Recorded, not acted on. I confirmed
all three of the coder's, sharpened two, and added four.

*Confirmed and sharpened, for task 09 (API client).* `src/actions/api.ts` does
repeat the `api/todos/` literal, the headers, and the request shape across five
creators. The sharper problem is above that: every creator returns
`ApiActionMessage`, imported from `src/middlewares/callapimiddleware.ts`, whose
`callAPI` field is typed `[RequestInfo, RequestInit]`. Those are DOM `fetch`
types. So the transport's shape reaches all the way into policy, and the arrow
points from the action creators *to* the adapter. The interface should be owned
by the high-level module and the adapter should translate into `fetch`. Fixing
only the duplication would leave the direction wrong.

*Confirmed, for task 10 (middleware -> slices and thunks).* `callAPIMiddleware`
does hold at least three jobs — validate the action, sequence the
REQUEST/SUCCESS/FAILURE dispatches, perform and decode the fetch — plus a fourth
the coder did not list, `console.error` as the failure report. The dispatch
sequence is policy; fetch, decode and reporting are adapters. One extra fact for
the specifier: `src/reducers/apis.ts` `errorMessage` is written by that failure
path and no component reads it, so the middleware's error handling is currently
observable only through the console. `PLAN.md` already records that under known
defects and the procedures pin the invisibility, so task 10 must preserve it
deliberately.

*Confirmed, for task 10 or 13 (unvalidated `action.json`).* Real, and the E2E
suite already characterizes it: `qa/tests/21-http-error-status-ignored.spec.ts`
records that a load answered `500` with a JSON body is rendered as the todo
list. So this is pinned behavior, not a latent bug the structural task may quietly
fix — whichever task adds a decoding adapter at the boundary changes what
procedure 21 records, and by `PLAN.md`'s rule the specifier rewrites the
procedure first and the task stops and asks.

*Added — the one I would put first, for task 12.* `RootState` is declared in
`src/containers/index.ts`, the `connect()` adapter layer, and the whole
application imports its state shape *from the UI*: `src/selectors/index.ts`
does, and so does `src/middlewares/callapimiddleware.ts`. The reducers own the
real shape (`src/reducers/index.ts` combines four slices), which is why
`RootState` can list two of them and be wrong without anything noticing — the
defect `PLAN.md` already records. The fix is a direction fix, not a field fix:
derive the state type from the root reducer and let the UI import it inward.
Task 12's line "changes the selector input type" is aimed at the right file; I
would make owning `RootState` its explicit goal rather than a side effect, and
task 05's "correcting `RootState` is task 12" stays correct.

*Added — free, and available to any of 09 through 13.*
`src/middlewares/callapimiddleware.ts` line 2 imports `RootState` from
`../containers` and never uses it. An adapter pointing at the UI layer for
nothing. One line, no behavior; I left it because deleting it is not a change
Vite forced.

*Added, for task 13.* The UI re-walks facts the domain already owns, and
inconsistently. `src/containers/MainSection.ts` asks `getCompletedTodoCount` for
one observable and then computes `todosCount: state.todos.length` inline beside
it. `src/components/MainSection.tsx` derives two more from those props —
`completedCount === todosCount` ("all complete", which drives the toggle-all
checkbox) and `todosCount - completedCount` (the active count Footer renders).
`src/containers/FilterLink.ts` computes `ownProps.filter ===
state.visibilityFilter` ("is this filter selected"). Four observables the
selectors could answer; `src/selectors/index.ts` today answers two. Footer's
`activeCount || 'No'` and its `item`/`items` pluralization are presentation and
should stay in the component.

*Added, for task 10's specifier — a boundary that must be preserved
deliberately.* `src/reducers/todos.ts` is one file holding two reducers with two
different persistence policies, chained through a `default` branch:
`todoApiResults` applies what the server echoed back, and `todos` applies local
edits. `COMPLETE_ALL_TODOS` and `CLEAR_COMPLETED` only ever reach the second
one, which is why `PLAN.md` and the procedures record that toggle-all and
clear-completed issue no request. That split is load-bearing behavior, not an
accident of layout, and a slice rewrite that unifies them changes what the app
sends to the backend.

**Open questions for the project manager**

1. Finding 1 (false-green typecheck) is a defect in a file this task created,
   but the fix belongs to a coder and this task's coder is done. Fold it into
   task 05, which already owns the gate's weakness, or reopen 04 for a
   one-line touch-up? My preference is task 05, before its "plant a type error
   and prove the gate catches it" step, so that proof means something.
2. Finding 2 needs QA to decide whether the dev and preview runs are actually
   wanted. If they are, `qa/tests/support/stub-control.ts` needs the stub's own
   origin, and that is a QA edit I did not make and did not ask the coder to
   make. If they are not, `npm run test:e2e` alone satisfies the done criteria
   and the coder's suggestion should be struck from the record so nobody acts on
   it later.

**Left for QA.** Nothing changed since the coder's verification, so the numbers
above should reproduce. Read Finding 2 before running the procedures against
`npm run dev` or `npm run preview`.

### QA


## Project manager notes

**On the coder's open question about the `preview` proxy.** Keep it. The done
criteria require the E2E procedures to pass against the preview server, and the
app fetches a relative `api/todos/` that has to reach something. Mirroring the
dev proxy onto preview is the minimum way to satisfy a criterion this task
already had, not a scope extension.

**On `"type": "module"`.** The task file asked for a decision and the answer is
no, for the reason the coder found: it breaks QA's CommonJS stub. Renaming the
config to `.mts` clears the warning without touching a file this role is not
allowed to edit. That is the right resolution of the constraint.

**On the branch state.** A checkpoint commit was made by the project manager
mid-task and the coder reset it away to honour "leave your changes in the
working tree". No work was lost. Later roles: commit nothing, and do not reset
the branch. If the branch has moved under you, say so in your note and leave it
alone.

## Project manager notes, second round

**On the false green in `scripts/typecheck.mjs`.** Confirmed as a real defect and
routed back to a fresh coder before QA runs. It is a tooling defect, so the coder
owns it; the architect was right to record it rather than fix it, since it is not
an architecture change and not the architect's file.

The architect is not re-run afterwards. Its job on a tooling task is to review
the file moves and boundary changes the tooling forced, and a defensive fix
inside a process shell is neither. Re-running it would produce the same review.
QA verifies the repair.

**On the `/__qa/` proxy narrowing.** Ruling: do **not** widen the app's proxy to
carry QA's control prefix. The architect refused to, and refused correctly.
Putting a test-harness path into the application's shipped dev config is exactly
the leakage the review exists to catch.

The consequence is a constraint on QA, not a defect: `npm run test:e2e` is
unaffected, because the stub serves the built app and the control channel on one
origin. It is only running the procedures against `npm run dev` or
`npm run preview` that would silently lose fault injection, since `/__qa/` would
be answered by `index.html` with a 200 and a status-code-only check would pass
while resetting nothing. The supported path for the procedures is the suite's own
harness. If QA wants preview coverage beyond that, it belongs in QA-owned files.
