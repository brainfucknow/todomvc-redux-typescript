# Task 01: Replace CRA with Vite and Vitest

Status: pending

## Goal

The project builds, runs in development, and runs its tests with no `react-scripts` dependency anywhere in the tree. Vite serves and builds; Vitest runs the unit tests. The acceptance pipeline exists and runs.

Observable behavior of the application does not change in this task. Same UI, same API calls, same rendered output.

## Scope

- Remove `react-scripts` and the CRA-specific surface: `public/index.html` template moves to a root `index.html` with a `<script type="module" src="/src/index.tsx">` entry; `src/react-app-env.d.ts` is replaced by a Vite client types reference.
- Add `vite`, `@vitejs/plugin-react`, and a `vite.config.ts`.
- Port the CRA `package.json` `proxy: "http://localhost:4000"` to Vite `server.proxy` so `api/todos/*` requests reach the Todo-Backend in development exactly as they do today.
- Add `vitest` with a jsdom environment and a setup file, replacing `react-scripts test`. Convert the existing spec files' Jest globals to Vitest equivalents mechanically. `react-shallow-renderer` stays in place for now; task 02 removes it.
- Upgrade TypeScript from 3.9 to current stable and modernize `tsconfig.json`: a module resolution and target appropriate to a Vite ESM project, `jsx: react-jsx`, `isolatedModules`, and whatever else Vite requires. Fix only the type errors this upgrade surfaces.
- Scripts: `dev`, `build`, `preview`, `test`, plus the tier commands named in `PLAN.md` section 4 that this task creates.
- Stand up the APS acceptance pipeline: a bootstrap script that builds the Go fallback binaries, plus the project-specific entrypoint generator, runtime, step handlers, and scripts, wired to `npm run test:acceptance`. This exists here because every later task depends on it.
- Update `.gitignore` for `dist/`, `build/acceptance*/`, and `bin/`.
- Update `README.md` where it describes CRA commands that no longer exist.

## Out of scope

- Any change to rendered output, component structure, Redux shape, action creators, or the API middleware.
- Rewriting the shallow-renderer tests. Task 02.
- Upgrading React. Task 03.
- Removing `connect()`. Task 04.
- Converting class components or removing `prop-types`. Task 05.
- ESLint configuration and CI workflow changes. Task 06.
- Routing, deployment, offline persistence. Settled out of scope in `PLAN.md` section 3.

## Done criteria

1. `npm ci` succeeds and `react-scripts` appears nowhere in `package.json` or the lockfile.
2. `npm run dev` serves the app and `api/todos/` requests proxy to `localhost:4000`.
3. `npm run build` produces a production bundle; `npm run preview` serves it.
4. `npm test` runs every existing spec under Vitest and they all pass.
5. `npm run test:acceptance` parses the feature files, generates entry points, and executes them green.
6. TypeScript compiles with no errors under the upgraded compiler.
7. The E2E QA procedures written by the specifier pass when QA executes them.

## Handoffs

### Specifier

Done. Behaviour specs and QA procedures are in the working tree; nothing is committed.

**What I added**

`features/` (five files, APS Gherkin subset, 9 scenarios / 21 scenario executions):

| File | Scenarios | Covers done criterion |
| --- | --- | --- |
| `development-server.feature` | `development server 1` (4 rows) | 2 |
| `api-proxy.feature` | `api proxy 1` (2 rows) | 2 |
| `production-build.feature` | `production build 1` (3 rows), `2`, `3` | 3 |
| `toolchain-dependencies.feature` | `toolchain dependencies 1` (3 rows), `2` (5 rows) | 1, and the script surface |
| `typescript-compilation.feature` | `typescript compilation 1`, `2` | 6 |

`qa/toolchain-commands.md` — E2E QA procedure A-E covering done criteria 1-6 through the
CLI and the browser: install, dev server + proxy + HMR, build + preview + asset integrity,
the test tiers, `tsc`, and repository hygiene.

`qa/todo-app-regression.md` — E2E QA procedure F-K proving the application behaves exactly
as it did on `react-scripts`, driven through the UI with the network boundary stubbed per
PLAN section 3.1. Fixes a stub contract and seed data so the run is deterministic.

**What I verified**

- Every feature file parses with the APS Go `gherkin-parser` (built from
  `github.com/unclebob/Acceptance-Pipeline-Specification` with the toolchain at
  `/usr/local/go/bin/go`; `go build ./cmd/gherkin-parser` and
  `./cmd/gherkin-ir-dry-checker` both build clean, no network beyond the clone).
- `gherkin-ir-dry-checker` reports **0 findings** on all five files, including with
  `--include-exact`. Two findings were fixed rather than waived: `a client requests /`
  vs `a client requests <path>` was accidental drift (split the proxy into its own
  feature file), and `the response status is 200` vs a plural form was reworded to
  `every referenced asset responds with status 200`.
- Example columns constant across all rows were removed and inlined into step text
  (port `4000`, path `/`, status `200`, `react-scripts`, `/src/index.tsx`). Every
  surviving column varies across rows and is germane: mutating it should fail the test.
- Spec-file inventory for QA step D1: **10** spec files, **54** `it(` cases, no
  `.skip` / `.each`. If the coder's conversion changes either number, D1 must be updated
  and the reason recorded.
- I built the APS binaries into a scratchpad only. Nothing under `bin/` was written to
  the repo, and I ran no project verification tooling.

**Left for the coder**

- Step handler vocabulary the runtime must support (23 step occurrences, 18 unique texts):

```
Given the development server is running
Given the todo backend on port 4000 replies to <path> with <body>
Given the project has been built for production
Given the preview server is serving the build output
Given a client has requested /
When  a client requests /
When  a client requests <path>
When  a client requests every script and stylesheet referenced by the index page
When  the TypeScript compiler checks the project
Then  the response status is 200
Then  the response body contains <content>
Then  the response body equals <body>
Then  the response body does not contain /src/index.tsx
Then  every referenced asset responds with status 200
Then  <location> contains no reference to react-scripts
Then  npm run <script> is an available command
Then  the compiler reports no errors
Then  the TypeScript compiler major version is at least 5
```

- `toolchain dependencies 1` uses `src` as a `<location>`, meaning the source directory
  searched recursively. It is the scenario that catches a leftover
  `/// <reference types="react-scripts" />`.
- `toolchain dependencies 2` lists only `dev`, `build`, `preview`, `test`,
  `test:acceptance` — the tier commands this task creates. `test:property`,
  `test:mutation`, and `test:e2e` are deliberately absent; add rows when a later task
  introduces them.
- Some example values contain `<` and `>` (`class="todoapp"`) and `{ }` / `"` (the JSON
  bodies). The runtime must substitute placeholders once and must not re-scan the
  substituted text for placeholders, or these rows will break.
- Feature files must not invoke `npm run test:acceptance` or `npm test` — those tiers are
  verified by QA procedure D, deliberately kept out of acceptance to avoid nesting a test
  runner inside itself.
- Fixtures the acceptance steps need: a throwaway HTTP server on port 4000 for
  `api proxy 1`, and dev/preview servers started on an ephemeral port and torn down per
  feature.

**Assumptions I had to make** (task file and PLAN.md do not settle these; correct me if wrong)

1. E2E QA procedures live in `qa/`. PLAN section 4 fixes `features/`, `build/acceptance*/`
   and `acceptance/` but is silent on where QA procedures go.
2. The build output directory is `dist/`, inferred from the `.gitignore` line the task
   scope asks for. QA steps C1-C3 name it.
3. Done criterion 6 is checked with `npx tsc --noEmit` (QA step D6) rather than a
   `typecheck` npm script, because PLAN section 5 assigns typecheck scripting to task 06.
   If the coder adds a `typecheck` script anyway, tell me and I will add a row to
   `toolchain dependencies 2`.
4. The dev and preview server ports are whatever Vite prints; no scenario or QA step pins
   a port number, so the coder is free to configure them.

**Open questions**

1. "Scenario name `<feature> <stable-index>`; repeat it in a comment immediately before the
   feature." I read this as a comment line carrying the scenario name immediately before
   each `Scenario:`, which is what the files do. If it meant a block of comments before
   `Feature:` instead, say so and I will move them; the parser ignores comments either way,
   so nothing downstream changes.
2. `React.StrictMode` makes the initial `GET api/todos/` fire twice in a development build
   and once in a production build. QA procedure F treats both as correct. If the project
   would rather assert one exact count, it has to pick one serving mode for that procedure.


#### Second pass: correction under Coder-handoff ruling 2

Done. `qa/toolchain-commands.md` procedure D is corrected. `features/` is unchanged.

**What I changed**

Only `qa/toolchain-commands.md`, procedure D:

- **D1** now expects 13 test files and 92 passing tests, 0 failing, 0 skipped.
- **D2** now names the 13: the 10 matching `src/**/*.spec.{ts,tsx}` plus
  `acceptance/generator.spec.ts`, `acceptance/inspection.spec.ts` and
  `acceptance/runtime.spec.ts`. Its real point is unchanged and now stated against the
  actual path: no file from `build/acceptance/generated/` appears in the unit run.
- **D2a** and **D2b** are new. They split the D1 total so a future change is attributable
  rather than merely visible: `npx vitest run src` must report 10 files / 54 tests,
  `npx vitest run acceptance` must report 3 files / 38 tests.
- A paragraph after procedure D's fail clause states the asymmetry between the halves. A
  drop below 10 files or 54 cases fails D outright, because that half is the pre-existing
  suite this task must not shrink. A change to the acceptance-pipeline half is acceptable
  only when a handoff note records it, and then D1, D2 and D2b move together.

The split is the point of the correction. The stale numbers were not merely wrong; a single
total lets a lost `src` case hide behind a gained `acceptance` one. D2a is now the guard the
Coder's conversion has to survive.

**What I verified**

Counted from the tree, not taken from the Coder's note:

- `npm test`: 13 files, 92 passing, 0 failing, 0 skipped.
- `npx vitest run src`: 10 files, 54 passing. `npx vitest run acceptance`: 3 files, 38
  passing. 54 + 38 = 92, so the split is exhaustive and the halves do not overlap.
- `it(` occurrences per file sum to 54 across the ten `src` specs and 38 across the three
  `acceptance` specs, matching the runner's counts.
- No `.skip`, `.only` or `.each` anywhere in either half, so the reported count is the
  executed count.
- The ten `src` spec files are the same ten the first pass inventoried; none was added,
  renamed or removed.

I ran no other verification or quality tooling, and I did not re-run the parser or the dry
checker: no feature file changed.

**Ruling 1 needs nothing from me.** The pending TypeScript move to `^5.9.3` leaves both
version assertions true — `typescript compilation 2` says "at least 5" and QA D7 says "major
version is 5 or higher". Neither pins a minor and neither should; 5.9.3 satisfies both. No
feature or QA edit is required for that correction, before or after the Coder makes it.

**Left for the Coder**

- D2a is now a hard floor: 10 files, 54 cases in `src`. If the second pass changes either
  number, it fails QA. The `^5.9.3` downgrade should not touch them; if it does, that is a
  finding to report, not a number to adjust.
- `npx vitest run src` and `npx vitest run acceptance` are QA's commands and depend on the
  unit-tier `include` covering both directories. Do not narrow it.

**Open questions**

None. Ruling 2 is discharged.

#### Third pass: `api proxy 1` under Hardener-handoff ruling 1, and procedure D reconciled

Done. Three files changed, all mine: `features/api-proxy.feature`,
`features/toolchain-dependencies.feature`, `qa/toolchain-commands.md`. Nothing committed.

**`api proxy 1` now has separate stub and assertion columns**

`<body>` became `<stub_body>` and `<expected_body>`, both varying by row and both holding the
same value per row:

```
  Background:
    Given the todo backend on port 4000 replies to <path> with <stub_body>
    And the development server is running
# api proxy 1
  Scenario: api proxy 1
    When a client requests <path>
    Then the response status is 200
    And the response body equals <expected_body>
```

The scenario now says what it always meant - what the backend answers with comes back through
the proxy unchanged - and it can fail. Mutate the stub cell and the proxy returns something the
assertion does not expect; mutate the assertion cell and the assertion is wrong about what the
stub served. Either way the row goes red.

**`path` stays one column, deliberately.** The same argument would apply to it, but the
Hardener's report already shows both `path` mutants killed, so splitting it would add a column
the mutation evidence does not ask for. If a `path` mutant ever survives, the fix is the same
two-column treatment - `<stub_path>` / `<request_path>` - and nothing else about the scenario
changes.

**No step handler has to change.** Only the placeholder token names moved. `steps.ts` matches
raw step text with generic captures (`... replies to (\S+) with (.+)$`, `... body equals (.+)$`)
and the runtime resolves each capture against the example row, so the vocabulary is still the
same 16 patterns over the same 18 step texts. The two texts that read differently now are:

```
Given the todo backend on port 4000 replies to <path> with <stub_body>
Then  the response body equals <expected_body>
```

`<stub_body>` and `<expected_body>` satisfy the runtime's `^<([A-Za-z0-9_]+)>$` placeholder
form, and the APS parser carries them through to `parameters` and the example objects intact.

**`toolchain dependencies 2` gained the three tier commands this task created**

`test:property`, `test:hardening` and `test:mutation` are now rows, alongside the original five.
This is the decision the Hardener routed to me, and I am taking it rather than deferring: the
scenario's job is to say which commands the project offers, all eight now exist, and three of
them were specified by nothing at all. `test:property` and `test:mutation` are named by
`PLAN.md` section 4 and by this task's scope line ("plus the tier commands named in `PLAN.md`
section 4 that this task creates"); `test:hardening` is the Hardener brief's separate command
and the CRAP gate needs it to be a tier it can run. `test:e2e` is still absent: PLAN section 4
names it but no task-01 role created it, and `qa/todo-app-regression.md` still has no driver.

That takes the scenario from 5 rows to 8, and the feature total from 21 scenario executions to
**24**. QA step D5 moved with it.

**QA procedure D reconciled against the tree**

Counted by running each tier, not taken from any handoff note:

| Step | Was | Now |
| --- | --- | --- |
| D1 `npm test` | 13 files / 92 | **15 files / 119** |
| D2 file list | 10 `src` + 3 `acceptance` | 10 `src` + **5** `acceptance` (adds `layering.spec.ts`, `layout.spec.ts`) |
| D2a `npx vitest run src` | 10 / 54 | **10 / 54, unchanged - the floor held through every role** |
| D2b `npx vitest run acceptance` | 3 / 38 | **5 / 65** |
| D5 scenario executions | 21 | **24** |
| D8 `npm run test:property` | - | new: 6 files / 60 |
| D9 `npm run test:hardening` | - | new: 7 files / 92 |
| D10 tier separation | - | new: D8 and D9 file lists do not overlap D1's |

D2 also now says no `property/` or `hardening/` file appears in the unit run, which is the same
point D2 always made about `build/acceptance/generated/`: the tiers are separate commands.
Existing step letters are unchanged so earlier citations of D1, D2a, D2b, D5 and D7 still
resolve; the two new tiers are appended as D8-D10 rather than renumbered in.

D8 and D9 exist because 54 + 65 = 119 accounts for `npm test` exactly, which means the property
and hardening tiers were invisible to QA - 152 passing tests that no procedure asked anyone to
run. They are cheap (under a second each) and deterministic, so there is no reason for QA not to
see them. The D2a/D2b attribution rule now covers them too.

`npm run test:mutation` and `node scripts/acceptance-mutation.ts` are deliberately **not** in
procedure D, and the procedure now says so. They are instruments, not done criteria; one takes
about seven minutes, and the Hardener reports both in the handoff notes.

**Procedure E was stale too, and I fixed it**

E3 listed five documented commands; `README.md` documents eight. As written, QA would have
failed E3 on a correct README. E3 now names all eight and reads them against `npm run`, and a
new E4 covers the README's `Other checks` section (`node scripts/acceptance-mutation.ts`,
`node scripts/crap.mjs`) as a presence check only - QA should not run those.

`qa/todo-app-regression.md` needed nothing. It names no counts and no commands that moved.

**What I verified**

- All five feature files parse with the APS `gherkin-parser` from `bin/`, and
  `gherkin-ir-dry-checker -include-exact` reports **0 findings** on each of the five, including
  both files I changed.
- `npm run test:acceptance`: 5 features parse, 5 entry points generate, **24 scenario
  executions pass**, matching D5. No handler edit was needed to get there.
- **The split bites, checked in both directions rather than assumed.** Dithering one
  `stub_body` cell the way the mutator would (`{"id":1,"text":...}` -> `{"id":1, "text":...}`)
  turns `api proxy 1/example_1` red and the tier exits 1. Dithering one `expected_body` cell
  (`true` -> `tru`) turns `api proxy 1/example_2` red on its own. Restoring the file returns the
  tier to 24 passing. This is a hand-applied edit for verification, not a mutator run - my brief
  bars Gherkin mutation, and the Hardener re-run is what records the mutants as killed.
- Tier counts, each run directly: `npm test` 15 / 119; `npx vitest run src` 10 / 54;
  `npx vitest run acceptance` 5 / 65; `npm run test:property` 6 / 60;
  `npm run test:hardening` 7 / 92. 54 + 65 = 119, so D1 is still exhaustively split.
- Spec-file inventory read off the tree: the ten `src` specs are the same ten inventoried in my
  first pass, none added, renamed or removed; `acceptance/` holds exactly `generator`,
  `inspection`, `layering`, `layout`, `runtime`.
- `package.json` declares exactly the eight scripts `toolchain dependencies 2` and E3 now name.
- `git status --short` shows exactly `features/api-proxy.feature`,
  `features/toolchain-dependencies.feature` and `qa/toolchain-commands.md`. `src/` is untouched.
- I ran no verification or quality tooling beyond the parser, the dry checker and the test
  tiers above. No mutation of any kind.

**Left for the Coder**

- **Nothing is required of you for `api proxy 1`.** The handler table already matches the new
  step texts and the tier is green at 24 executions. If you touch `steps.ts` anyway, keep the
  captures generic; hard-coding `stub_body` or `expected_body` into a pattern would put the
  example-column names into the handler, which is where they must not be.
- Scenario execution counts moved: 21 -> 24, and per feature `toolchain-dependencies` is 3 + 8.
  Anything that restates the total (a handoff table, a README line) needs the new number.
- The eight npm scripts are now specified. Removing or renaming one fails
  `toolchain dependencies 2` and QA E3. Adding a ninth needs a row and a README entry, and PM
  ruling 3 still bars a `typecheck` script in this task.

**Left for the Hardener**

- `api-proxy.feature` now presents **6** candidate mutations (2 rows x 3 columns), not 4:
  two `path`, two `stub_body`, two `expected_body`. All six should be killed. The two that
  survived are the `stub_body`/`expected_body` pairs and I have shown by hand that each side
  now fails independently.
- `toolchain-dependencies.feature` presents **11** (3 locations + 8 scripts), not 8.
- Total candidate mutations across the five features move from 19 to 28. No skip list was
  added, per ruling 1.

**Left for QA**

- Procedure D now has ten steps; D8-D10 are new. Procedure E has four; E4 is new. Nothing else
  in `qa/` moved.
- `qa/todo-app-regression.md` still needs a browser driver with route interception.
  `@playwright/test` is not installed and no `test:e2e` script exists. PLAN section 4 assigns
  the tool to whichever role first needs it, and that role is you.

**Open questions**

None.

#### Fourth pass: QA step E3 de-hardcoded under the second-Coder-pass ruling

Done. One file changed, mine: `qa/toolchain-commands.md`, procedure E. `features/` is unchanged,
and no count in procedure D moved. Nothing committed.

**E3 is now a set equality read off the tree**

It was: read the `Available Scripts` section, then `npm run`, and expect "exactly the eight scripts
`package.json` declares, and no others", with all eight named in the step. It is now: list the script
names the section documents, one per `###` heading; list the script names `npm run` prints; the two
lists must be the same set. Neither side is written into the procedure, so the check keeps both of
its teeth - the README neither omits a script nor invents one - while a task that adds, renames or
removes a command passes E3 by updating both sides rather than by editing E3.

I added one parenthetical about npm's output shape, not about this project's scripts: `npm run`
prints lifecycle scripts in a block above the rest, so `test` is easy to miss and QA would report a
documented script as undeclared. That is the same false-failure class the ruling is about.

The fail clause now names the direction the old wording left out. It said only that the README must
not document commands that no longer exist; a declared script the README never documents was a
silent pass. Both directions now fail E.

**The neighbouring step with the same brittleness was E1, and I fixed it the same way**

E1 named four directories - `dist/`, `build/`, `bin/`, `node_modules/` - and asked for no untracked
entries among them. That list was already stale: the Cleaner's coverage run adds `coverage/`, which
E1 never mentioned, so a `coverage/` directory left untracked-but-unignored would have passed E1.
Its failure mode is the mirror of E3's - a silent false pass instead of a false failure - but the
cause is identical, a literal snapshot of the tree frozen into a verification step.

E1 now runs `git status --porcelain --ignored` and asks that every path procedures A-D generated be
listed as ignored (`!!`) rather than untracked (`??`), with the generated paths read off that same
listing. It names no directory, so `coverage/` is covered today and whatever a later task generates
is covered without an edit. The step letter is unchanged, so earlier citations of E1 still resolve.

E2 and E4 do not carry it. E2's three literals - `react-scripts`, `npm start`, `npm run eject` - are
a negative check on names this task removed for good; they cannot come back, so the list cannot go
stale. E4 already derives its list from the README's `Other checks` section and asserts only that
each documented command names a present script file, which is the direction that does not
false-fail when a task adds a script file.

**What I verified**

Read off the tree, by running what E1, E3 and E4 tell QA to run:

- E3 holds today. `Available Scripts` documents `dev`, `build`, `preview`, `test`, `test:property`,
  `test:acceptance`, `test:hardening`, `test:mutation`; `npm run` prints `test` as a lifecycle
  script and the other seven below. Same set, eight each, no extras on either side.
- E1 holds today. `git status --porcelain --ignored` reports `bin/`, `build/`, `coverage/`, `dist/`
  and `node_modules/` all as `!!`, and nothing as `??`.
- E4 holds today. `Other checks` documents `node scripts/acceptance-mutation.ts` and
  `node scripts/crap.mjs`; both files are in `scripts/`.
- `git status --short` shows exactly `qa/toolchain-commands.md` modified.

I ran no test tier, no parser and no dry checker: no feature file changed, no procedure-D count
changed, and rewording a Markdown procedure cannot move any of them. `qa/todo-app-regression.md`
needed nothing - it names no scripts.

**Left for QA**

- E3 no longer blocks the `test:e2e` script that ruling 2 on my second pass authorises you to add.
  Add it to `package.json` and give it a `###` entry under `Available Scripts`, and E3 stays green;
  add it to only one of the two and E3 fails, which is the check working.
- Do **not** add a `test:e2e` row to `toolchain dependencies 2` yourself - `features/` is mine, and
  a row for a script that does not exist yet turns the acceptance tier red. Record the script in
  your handoff note; the row is a Specifier edit in whatever pass follows.
- Procedure D is unchanged. D1-D10 and their counts read as the Coder's third pass left them.

**Open questions**

None. The ruling on the second Coder pass is discharged.



#### Fifth pass: the single reconciliation of procedure D against the tree, before QA

Done. One file changed, mine: `qa/toolchain-commands.md`, procedure D. `features/` is unchanged
and `qa/todo-app-regression.md` needed nothing. Nothing committed.

**Every number below was read off a command I ran, not off a handoff note.** Three roles have moved
test counts since the last reconciliation and each recorded the move; I used those records only to
know where to look.

| Step | As the last reconciliation left it | Now |
| --- | --- | --- |
| D1 `npm test` | 15 files / 119 | **22 files / 214** |
| D2 file list | 10 `src` + 5 `acceptance` | 10 `src` + **4** `acceptance` + **8** `scripts` |
| D2a `npx vitest run src` | 10 / 54 | **10 / 54 - the floor, intact through every role in this task** |
| D2b `npx vitest run acceptance` | 5 / 65 | **4 / 49** |
| D2c `npx vitest run scripts` | - | **new: 8 / 111** |
| D5 scenario executions | 24 | **24, unchanged** |
| D8 `npm run test:property` | 6 / 60 | **11 / 95** |
| D9 `npm run test:hardening` | 7 / 92 | **12 / 128** |
| D10 tier separation | src, acceptance | now also names `scripts/` |

Step letters D1-D10 are untouched, so every earlier citation still resolves. D2c is appended
between D2b and D3 rather than renumbered in, the same way D8-D10 were appended.

**D2c exists because the ruling on the third Cleaner pass asked for it, and because the split has to
stay exhaustive.** 54 + 49 + 111 = 214 accounts for D1 exactly, with no overlap. Without a `scripts`
bucket the 111 tests of the project's own tooling would sit inside D1's total unattributed, and a
case lost from `src` could hide behind one gained in `scripts` - the precise failure D2a and D2b were
introduced to prevent. The paragraph after D's fail clause now states the arithmetic and tells QA to
check the sum as part of D2c, so exhaustiveness is a step QA performs rather than a property the
procedure asserts about itself.

**D2b's drop from 65 to 49 is a move, not a loss,** and D2's file list is what records it:
`acceptance/layering.spec.ts` left `acceptance/` for `scripts/architecture/`, where it is now
`layering.spec.ts` plus `packages.spec.ts`. D2 names the four `acceptance/` files and the eight
`scripts/` files explicitly for that reason - a file that moves between buckets has to be visible as
a move, and only the names make it so. The ten `src` specs stay described by their glob, as they
always were; naming them would restate what D2a already guards.

**What I did not de-hardcode, deliberately.** My previous pass replaced the frozen lists in E1 and E3
with checks derived from the tree, and the PM ruling endorsed that. Procedure D is the opposite case
and the literal counts stay. A count that derives itself from the tree it is checking cannot fail:
D's whole job is to hold the tree to a number a handoff note had to justify, and D's fail clause
already carries the update protocol. The distinction is that E1 and E3 assert a *relation* between
two things in the tree, which stays true as the tree grows, whereas D asserts a *fact about a
baseline*, which is only worth asserting if it is written down.

**What I verified**

Each command run directly, in the tree as it stands:

| Command | Result | Step |
| --- | --- | --- |
| `npm test` | 22 files / 214 tests, 0 failing, 0 skipped | D1 |
| `npx vitest run src` | 10 files / 54 | D2a |
| `npx vitest run acceptance` | 4 files / 49 | D2b |
| `npx vitest run scripts` | 8 files / 111 | D2c |
| `npm run test:acceptance` | 5 features parse, 5 entry points generate, 24 scenario executions pass | D3, D5 |
| `ls build/acceptance` | `ir/` (5 JSON) and `generated/` (5 entry points + `metadata/`) | D4 |
| `npx tsc --noEmit` / `--version` | exit 0, no output / `Version 5.9.3` | D6, D7 |
| `npm run test:property` | 11 files / 95 | D8 |
| `npm run test:hardening` | 12 files / 128 | D9 |

- The 22 spec files D2 names are the 22 the tree holds, listed from `find` and from a verbose
  `vitest run`; the two agree and neither holds a file D2 omits.
- D5's per-feature breakdown was re-derived from a verbose run of the generated tests, not carried
  forward: 4 + 2 + (3+1+1) + (3+8) + (1+1) = 24, matching the step row by row.
- D10 holds in both directions: no `property/` or `hardening/` file appears in the `npm test` list,
  and no `src/`, `acceptance/` or `scripts/` spec appears in the property or hardening runs. The
  tiers are `*.property.ts` and `*.hardening.ts` under their own directories, so the file sets
  cannot intersect by construction.
- A3-A5 and C1-C3 still read true (`react-scripts` count 0 in `package.json`, `package-lock.json`
  and `src`; `npm ls react-scripts` empty; `npm run build` exits 0 and emits `index.html` plus
  `index-BPxiUVWS.js` and `index-xAQXB6NR.css`; `grep -c 'src/index.tsx' dist/index.html` is 0).
- E1-E4 still read true. `git status --porcelain --ignored` lists `bin/ build/ coverage/ dist/
  node_modules/` as `!!` and nothing as `??`; `README.md`'s `Available Scripts` documents eight
  scripts under `###` headings and `package.json` declares the same eight, so E3's set equality
  holds; `Other checks` names `scripts/acceptance-mutation.ts` and `scripts/crap.mjs`, both present.
- `git status --short` shows exactly `qa/toolchain-commands.md` modified.

I ran no verification or quality tooling beyond the test tiers above and `tsc`. No mutation of any
kind, no parser or dry-checker run - no feature file changed, so nothing they check moved.

**`features/` needed nothing, checked rather than assumed.** `toolchain dependencies 2` lists the
eight scripts `package.json` declares, and no role since my third pass added or renamed one. The
`test:e2e` row still waits on QA actually creating the script, per the ruling on my fourth pass; it
is a task-02 Specifier edit. `toolchain dependencies 1` and the other four features assert nothing
that any of the intervening passes moved.

**The Hardener's `28` -> `24` correction needs no edit.** I grepped `features/` and `qa/` for the
number and it appears nowhere; the only `28` in `qa/` is the `128` of D9's new count. The 28 lived in
my own third-pass handoff note as an estimate. Recording it here so the measured figure is what a
later reader finds: the acceptance-mutation tier presents **24** candidates, and the Hardener's
forced full run killed all of them.

**Left for QA**

- Procedure D now has eleven steps. D2c is the only new letter; D1, D2, D2b, D8 and D9 carry new
  numbers, and D2a, D3-D7 and D10 read as they did.
- When you add `@playwright/test` and the `test:e2e` script under ruling 2 on my second pass, E3
  stays green only if you add both the `package.json` entry and an `Available Scripts` heading. Do
  not add a `toolchain dependencies 2` row - `features/` is the Specifier's, and a row for a script
  that does not yet exist reddens the acceptance tier. Record the script in your note.
- Adding `test:e2e` moves nothing in procedure D. It is a new command, not a new unit spec, so
  D1/D2a/D2b/D2c and their sum are unaffected. If your Playwright specs land somewhere the unit
  include matches, that *would* move D1, and the fix is a handoff note plus a Specifier edit, not a
  quiet renumber.
- `qa/todo-app-regression.md` is unchanged and still needs that driver. Its one dependency on the
  tree - `src/index.tsx` wrapping the app in `React.StrictMode`, which is why F1 accepts one or two
  initial `GET api/todos/` calls - is still true; `src/` has not been touched since the Coder.

**Open questions**

None. The deferred reconciliation is discharged.

#### Sixth pass: `production build` can now tell a production bundle from a development one

Done. Two files changed, both mine: `features/production-build.feature` and
`qa/toolchain-commands.md`. Nothing committed. The implementation half - `acceptance/fixtures.ts`
building in development mode - is untouched and is the Coder's.

**The observable I picked, and why**

The distinction at stake is which `react-dom` entry got bundled, and the only thing that
distinguishes the two artifacts is the strings that entry carries. I measured both artifacts rather
than reasoning about them: `npm run build` emits 167,067 bytes, and the same build driven the way
`acceptance/fixtures.ts` drives it (Vite's JS API with `NODE_ENV=test`) emits 372,861 bytes. I then
diffed the string literals of the two and chose from the set present in the production one and
absent from the development one:

| Marker | production bundle | development-mode bundle |
| --- | --- | --- |
| `Minified React error` | 1 | 0 |
| `act(...) is not supported in production builds of React.` | 1 | 0 |

Both are React's production entry talking about itself: the minified error path, and the guard that
refuses `act` outside a development build. They are two different pieces of evidence rather than two
halves of one sentence, and both survive the React 18 -> 19 move that `tasks/03-react-19.md` will
make (React 19 keeps both texts; the error-decoder **URL** changes, which is why I did not use it).

**I chose presence over absence deliberately, and the reason is mutation.** The obvious phrasing -
"the bundle contains no development-mode warning text" - cannot be mutation tested here: the
acceptance mutator rewrites one example cell at a time, and a dithered copy of an absent string is
still absent, so every such row would survive as a matter of arithmetic. That is the defect class
this task refused to accept in `api proxy 1`, arriving from the other direction. A production-only
marker in a positive assertion dies when its cell is dithered. Size ratio was rejected for the same
reason: dithering a threshold cell can move it to another value that is still true.

**What the feature file now says**

```
# production build 4
  Scenario: production build 4
    Then the served JavaScript bundle contains <production_marker>

    Examples:
      | production_marker                                        |
      | Minified React error                                     |
      | act(...) is not supported in production builds of React. |
```

A new scenario rather than a strengthened `production build 1`: it is a different question about the
artifact, and appending keeps `1/2/3` at their stable indices, so the stored mutation manifest still
matches them and their recorded kills are still reusable. The Background is untouched for the same
reason - its hash is what the manifest's soft level keys the reuse on.

**Wording was chosen by the dry checker, not by taste.** My first draft was
`When a client requests the JavaScript bundle referenced by the index page` /
`Then the response body contains <production_marker>`, and `-include-exact` found two real problems
with it: a `placeholder-variant` finding (identical to `production build 1`'s
`the response body contains <content>` once placeholder names are erased) and a `possible-synonym`
finding at 0.545 against `production build 2`'s
`a client requests every script and stylesheet referenced by the index page`. Folding the retrieval
into the assertion removes both, and it is the shape `toolchain dependencies 1` already uses
(`Then <location> contains no reference to react-scripts` reads a file inside the Then).

**What I verified**

- All five feature files parse with `bin/gherkin-parser`, and
  `bin/gherkin-ir-dry-checker -include-exact` reports **0 findings** on each - `production-build`
  now at 9 step occurrences, 9 unique.
- **The scenario can fail, and does.** `npm run test:acceptance` is now red:
  `Tests 2 failed | 24 passed (26)`, both failures `production build 4/example_1` and
  `example_2`. Today they fail on the missing step handler; once the handler exists they will fail
  on the development bundle until `acceptance/fixtures.ts` is fixed. Either way the feature file no
  longer passes over the distinction it is named for.
- The markers hold against a real production build served the way the scenario serves it: `npm run
  build`, `npm run preview`, `curl` the script the index page references - 167,067 bytes, both
  markers present. And they are absent from the 372,861-byte artifact the current fixture produces.
- QA steps C3a/C3b read true on a fresh `npm run build`: `1`, `1`, and `0`.
- `git status --short` shows exactly `features/production-build.feature` and
  `qa/toolchain-commands.md`. `src/`, `acceptance/` and every config are untouched.
- I ran no verification or quality tooling beyond the parser, the dry checker, `npm run build`,
  `npm run preview` and `npm run test:acceptance`. No Gherkin mutation.

**QA procedure C gained the same check; procedure D's counts moved**

| Step | Change |
| --- | --- |
| C3a | new: the emitted bundle carries both production markers (`1` each) |
| C3b | new: it carries no development-mode warning text - `Invalid hook call` is `0` |
| C fail clause | now also fails when C3a/C3b show React's development entry |
| C, after the fail clause | new paragraph: read C3a/C3b before procedure D, because D3 builds for production itself and may replace `dist/`; re-run C1 if D has already run |
| D5 | 24 -> **26** scenario executions, `production build 1/2/3/4` now `3 + 1 + 1 + 2` |

D1, D2, D2a-D2c and D6-D10 are unchanged: no unit spec moved, and nothing I changed can move one.
The existing step letters are unchanged, so every earlier citation still resolves. C3a and C3b are
appended in the D2a style rather than renumbered in.

`qa/todo-app-regression.md` needed nothing - it names no counts and no build artifact.

**Left for the Coder**

- **One new step handler**, and it is the only handler change: `the served JavaScript bundle
  contains <production_marker>`. The vocabulary goes from 16 patterns / 18 texts to 17 / 19.
  Everything it needs is already in the tree: `referencedAssets` in `acceptance/inspection.ts`
  finds the script the index page references (the Background has already put the index response in
  the world), `requestPath` fetches it, and the judgment is `bodyContains`'s. Keep the assertion in
  `assertions.ts` where the other judgments live; the fetch belongs in the shell.
- **Then the real fix: `acceptance/fixtures.ts` must build the way `npm run build` builds.** The
  scenario will stay red until it does, which is the point. Whether you pin the mode or build to an
  outDir of its own is yours to choose, but note that QA's C3a reads `dist/`, and the paragraph I
  added to procedure C assumes D3 *may* still overwrite it. If you give the tier its own outDir,
  that paragraph becomes needlessly cautious rather than wrong - say so in your note and the next
  Specifier pass drops it.
- Do not weaken the markers into a substring that a development bundle also contains. Both cells
  were measured against both artifacts; if a future React makes one of them false, the fix is a new
  measurement and a new cell, not a shorter one.

**Left for the Hardener**

- `production-build.feature` now presents **2** candidate mutations, not 0, and the feature total
  across the five files goes from 24 to **26** (4 + 6 + 5 + 11). Both new candidates should be
  killed; each is a production-only string in a positive assertion, so dithering either cell makes
  the assertion false. If either survives, the scenario is not reading the bundle it thinks it is.
- The stored manifest for this feature keys `production build 1` on an unchanged scenario hash and
  an unchanged background hash, so its 3 recorded kills stay reusable; only the implementation hash
  moves, which the Coder's handler will move anyway. I did not touch `.mutation/`.

**Left for QA**

- `e2e/toolchain-commands.spec.ts` needs to move with the procedure: **no `C3a`/`C3b` steps exist
  yet**, and `24` is hardcoded in three places - `expect(testCases(...)).toBe('24 passed (24)')` in
  the D3 step, and the summed total plus the same assertion in the D5 step. All three become 26, and
  D5's per-scenario map gains `production build 4` at 2.
- Procedures A, B, E and `qa/todo-app-regression.md` are unchanged.

**Open questions**

None.


#### Seventh pass: the reconciliation before QA, and `test:e2e` gets its row

Done. Two files changed, both mine: `features/toolchain-dependencies.feature` and
`qa/toolchain-commands.md`. `qa/todo-app-regression.md` needed nothing. Nothing committed.

**Every number below was read off a command I ran in this tree.** Four roles moved counts since the
last reconciliation and each recorded the move; I used those records only to know where to look, and
two of them turned out to be incomplete in a way a copied number would have carried forward.

**`test:e2e` is now a row in `toolchain dependencies 2`**

The script exists in `package.json` and under `Available Scripts`, so the condition the ruling on my
fourth pass attached to the row is met and the row goes in. That takes the scenario from 8 rows to 9
and the feature total from 26 scenario executions to **27**.

I checked the row in the failing direction rather than trusting a green tier, per PLAN section 4:
dithering the cell to `test:e2f` reddens exactly `toolchain dependencies 2/example_9` and nothing
else, with the handler naming the nine scripts it did find. Restoring returns the tier to 27 passing.
A hand edit for verification, not a mutator run.

**Procedure D reconciled against the tree**

| Step | As the last reconciliation left it | Now |
| --- | --- | --- |
| D1 `npm test` | 22 files / 214 | **23 files / 228** |
| D2 file list | 10 `src` + 4 `acceptance` + 8 `scripts` | 10 + **5** + 8; adds `acceptance/assertions.spec.ts` |
| D2a `npx vitest run src` | 10 / 54 | **10 / 54 - the floor, intact through every role in this task** |
| D2b `npx vitest run acceptance` | 4 / 49 | **5 / 63** |
| D2c `npx vitest run scripts` | 8 / 111 | **8 / 111, unchanged** |
| D5 scenario executions | 26 | **27**, `toolchain dependencies 1/2` now 3 + 9 |
| D8 `npm run test:property` | 11 / 95 | **14 / 141** |
| D9 `npm run test:hardening` | 12 / 128 | **12 / 128, unchanged** |
| sum paragraph | 54 + 49 + 111 = 214 | **54 + 63 + 111 = 228** |

No step letter moved and none was added, so every earlier citation of D1-D10 still resolves. The
split stays exhaustive and disjoint, which is the property D2a/D2b/D2c exist for.

**Two of the recorded moves were understated, which is why this pass measures rather than copies.**
The ruling on the third Architect pass records D2b at 63 and D8 at 141, and it is right about both,
but it also says "D2's file list does not move, since no spec file was added or renamed" - and
`acceptance/assertions.spec.ts` is in the tree and in the `npm test` list, taking `acceptance/` from
four files to five. Separately, D9 was recorded as moving in an earlier note and has not: the
hardening tier is 12 / 128 today, the same as the last reconciliation. Both are the same lesson in
opposite directions: a file list and a count are different facts and each has to be read.

**Procedure C's ordering caveat was stale and is now a check**

It told QA that D3 "may replace `dist/` with a build C1 did not make", and to re-run C1 before C3a
if D had already run. That was true when the acceptance fixture built with `NODE_ENV=test`. It is
not true now: the fixture asks `package.json` for the build command and runs it with
`NODE_ENV=production`, so D3 leaves the artifact C1 emitted. I checked rather than reasoning from
the handoff note - `rm -rf dist && npm run build`, hash, `npm run test:acceptance`, hash again; both
`dist/index.html` and `dist/assets/index-BPxiUVWS.js` are byte-identical across the two.

Worse than stale, the old wording told QA to paper over the exact defect the sixth pass was spawned
to specify against: a development bundle sitting in `dist/` after the acceptance tier is a finding,
and "re-run C1" hides it. The paragraph now says the artifacts are the same, tells QA to read C3a and
C3b whenever it likes, and makes a difference between the before and after readings something to
report. `production build 4` is what guards the property inside the tier; the procedure no longer
has to guard it by discipline.

**What I verified**

Each command run directly, in the tree as it stands:

| Command | Result | Step |
| --- | --- | --- |
| `npm test` | 23 files / 228 tests, 0 failing, 0 skipped | D1 |
| `npm test -- --reporter=verbose` | the 23 files D2 names, and no others | D2, D10 |
| `npx vitest run src` | 10 / 54 | D2a |
| `npx vitest run acceptance` | 5 / 63 | D2b |
| `npx vitest run scripts` | 8 / 111; 54 + 63 + 111 = 228 | D2c |
| `npm run test:acceptance` | 5 parse, 5 generate, 27 scenario executions pass | D3, D5 |
| `ls build/acceptance` | `ir/` (5 JSON) and `generated/` (5 entry points + `metadata/`) | D4 |
| `npx tsc --noEmit` / `--version` | exit 0, no output / `Version 5.9.3` | D6, D7 |
| `npm run test:property` | 14 / 141, every file under `property/` | D8, D10 |
| `npm run test:hardening` | 12 / 128, every file under `hardening/` | D9, D10 |

- D5's per-scenario split was re-derived from a verbose run of the generated entry points, not
  carried forward: 4 + 2 + (3+1+1+2) + (3+9) + (1+1) = 27, matching the step row by row.
- All five feature files parse with `bin/gherkin-parser`, and `bin/gherkin-ir-dry-checker
  --include-exact` reports **0 findings** on each, `toolchain-dependencies` included. Adding an
  example row changes no step text, so the dry checker had nothing new to see - I ran it anyway
  because the file changed.
- A3-A5 and C1-C3b read true on a fresh build: `react-scripts` count 0 in `package.json`,
  `package-lock.json` and `src`; `dist/index.html` plus `assets/index-BPxiUVWS.js` and
  `assets/index-xAQXB6NR.css`; `grep -c 'src/index.tsx' dist/index.html` is 0; the two production
  markers are 1 each and `Invalid hook call` is 0.
- E1-E4 read true. `git status --porcelain --ignored` lists `bin/ build/ coverage/ dist/
  node_modules/ test-results/` as `!!` with nothing as `??`; `README.md` documents nine scripts
  under `###` headings and `package.json` declares the same nine, so E3's set equality holds at its
  new size without an edit to E3 - which is the point of the fourth pass; `Other checks` names
  `scripts/acceptance-mutation.ts` and `scripts/crap.mjs`, both present.
- `qa/todo-app-regression.md`'s one dependency on the tree still holds: `src/index.tsx` still wraps
  the app in `React.StrictMode`, which is why F1 accepts one or two initial `GET api/todos/` calls.
- `git status --short` shows exactly the two files above. `src/`, `e2e/`, `.mutation/`, `acceptance/`
  and every config are untouched.

I ran no verification or quality tooling beyond the parser, the dry checker, the test tiers above,
`tsc` and `npm run build`. No mutation of any kind.

**Left for the Hardener, if it runs again**

- `toolchain-dependencies.feature` now presents **12** candidate mutations (3 locations + 9 scripts),
  not 11, taking the total across the five features from 26 to **27**.
- `.mutation/gherkin/toolchain-dependencies.manifest` keys reuse on `hashJSON(scenario)`, which
  covers the examples table, so `toolchain dependencies 2`'s scenario hash has moved and its 8
  recorded kills are no longer reusable - the next run re-tests all 9, which is correct.
  `toolchain dependencies 1`'s hash and the feature's background hash are untouched, so its 3 kills
  stand. I did not touch `.mutation/`.

**Left for QA**

`e2e/toolchain-commands.spec.ts` is yours and carries these counts as literals. It is currently
stale in two generations at once - it was written before `production build 4` existed - so it needs
all of the following, not only my changes:

| Location | Is | Becomes |
| --- | --- | --- |
| D1 step | `'22 passed (22)'` / `'214 passed (214)'` | `'23 passed (23)'` / `'228 passed (228)'` |
| D2 step | four `acceptance/*.spec.ts` entries | five; add `'acceptance/assertions.spec.ts'` |
| D2b step | `'4 passed (4)'` / `'49 passed (49)'` | `'5 passed (5)'` / `'63 passed (63)'` |
| D2c step | `expect(54 + 49 + 111).toBe(214)`, `expect(10 + 4 + 8).toBe(22)` | `54 + 63 + 111 = 228`, `10 + 5 + 8 = 23` |
| D3 step | `'24 passed (24)'` | `'27 passed (27)'` |
| D5 map | no `production build 4`; `'toolchain dependencies 2': 8` | add `'production build 4': 2`; `'toolchain dependencies 2': 9` |
| D5 total | `.toBe(24)` twice | `.toBe(27)` twice |
| D8 step | `'11 passed (11)'` / `'95 passed (95)'` | `'14 passed (14)'` / `'141 passed (141)'` |
| D10 step | `expect(inProperty.length).toBe(11)` | `.toBe(14)` |

D9's literals (`12` / `128`) are correct as they stand, and nothing in procedures A, B or E moved.

Procedure C gained no new row, but its trailing paragraph changed meaning: the spec should no longer
rebuild `dist/` between D and C3a. If the executable form has any such re-run, drop it and instead
assert what the paragraph now says - that the hash of `dist/` is the same before and after D3.

**Open questions**

None.


### Project manager rulings on the Specifier handoff

The Specifier handoff is accepted. Its assumptions and open questions are settled as follows.
These are now part of the task, not open items.

1. **QA procedures live in `qa/`.** Accepted and promoted to a shared convention in `PLAN.md` section 4.
2. **Build output is `dist/`.** Accepted; it is Vite's default and matches the `.gitignore` line this task's scope asks for.
3. **Done criterion 6 is checked with `npx tsc --noEmit`.** Correct. `PLAN.md` section 5 assigns the `typecheck` script to task 06. If the coder adds a `typecheck` script anyway, that is a scope violation for this task, not a reason to add an example row.
4. **Dev and preview ports are the coder's to configure.** No scenario or QA step pins one, and none should.
5. **Scenario-name comment placement.** The current reading stands: a comment line carrying the scenario name immediately before each `Scenario:`. Promoted to a shared convention in `PLAN.md` section 4 so later tasks match.
6. **StrictMode firing `GET api/todos/` twice in development.** QA procedure F is right to accept both counts here. This task must not change application behavior, and `tasks/03-react-19.md` already owns the question of whether StrictMode produces a duplicate load. Do not assert an exact count in task 01 and do not "fix" the double fire in task 01.


### Project manager rulings on the second Specifier pass

Verified independently: only `features/` and `qa/` changed; `npm run test:acceptance` passes
5 files / 24 scenario executions; and the split genuinely bites, checked by dithering one
`stub_body` cell, watching `api proxy 1/example_1` go red, and restoring to 24 passing. Ruling 1
is discharged. Accepted.

Leaving `path` as a single column is accepted and correctly argued: the Hardener's report already
shows both `path` mutants killed, so splitting it would add a column the mutation evidence does not
ask for. Splitting every column on principle is how a feature file fills up with parameters that
carry no acceptance meaning.

Two findings from this pass are worth recording as rulings.

1. **Procedure E was stale in a way that would have failed QA on a correct README.** E3 checked five
   documented commands against a README documenting eight. That is a false-failure trap in the
   verification procedure itself, not a cosmetic drift, and catching it before QA ran is worth more
   than the count reconciliation this pass was spawned for. Accepted as fixed.

2. **QA is authorized to add `@playwright/test` and a `test:e2e` script.** `qa/todo-app-regression.md`
   has no browser driver behind it, and `PLAN.md` section 4 puts the E2E pick on the role that first
   needs it, which is QA. This is an explicit exception to the earlier ruling that froze this task's
   script surface: that ruling refused a `typecheck` script because task 06 owns it, whereas
   `test:e2e` is named in `PLAN.md` section 4 and QA cannot execute its procedures without it.
   Use the preinstalled Chromium at `/opt/pw-browsers`; never run `playwright install`.

**The chain continues from the Coder.** The Specifier reports that no step handler change is needed,
because the handlers match raw step text with generic captures and the runtime resolves captures
against the example row. That is the Specifier's reading, not a dispensation: the Coder runs as a
fresh agent, reaches its own conclusion, and confirms it in its note. No role is skipped because an
earlier role expected it to have nothing to do.


### Coder

Done. Toolchain swapped, acceptance pipeline stood up, nothing committed.

**What I changed**

Toolchain:

- `package.json`: `react-scripts`, `@types/jest` and the CRA `proxy` key removed; `vite` 8,
  `@vitejs/plugin-react` 6, `vitest` 5 and `jsdom` added; `@types/node` 13 -> 22;
  `typescript` 3.9 -> 7.0.2 (npm `latest`, satisfies `typescript compilation 2`);
  `"type": "module"` added so the `.ts` tooling scripts load as ESM. Scripts are exactly
  `dev`, `build`, `preview`, `test`, `test:acceptance`. Lockfile regenerated.
- `public/index.html` -> root `index.html` with `<script type="module" src="/src/index.tsx">`;
  `public/` is gone (it held nothing else). `src/react-app-env.d.ts` -> `src/vite-env.d.ts`
  referencing `vite/client`.
- `vite.config.ts`: react plugin, `server.proxy` `'/api' -> http://localhost:4000`, the same target
  the CRA `proxy` key named, and the Vitest block (jsdom, `globals`, `setupFiles`,
  `include: ['src/**/*.spec.{ts,tsx}', 'acceptance/**/*.spec.ts']`).
- `src/setupTests.ts`: registers Testing Library `cleanup` in `afterEach`.
- `tsconfig.json`: `target`/`lib` es2022, `moduleResolution: bundler`,
  `jsx: react-jsx`, `allowImportingTsExtensions`, `types: [node, vite/client, vitest/globals]`,
  `allowJs` dropped. `isolatedModules` and `strict` were already on and stay on.
- Spec files: `jest.fn(` -> `vi.fn(` in the seven component specs. Nothing else in the
  suite needed converting; no `jest.mock`, no timers, no `jest` globals elsewhere.
- `.gitignore`: `dist/`, `build/acceptance*/`, `bin/` (`build/` was already ignored, which
  also covers the APS checkout under `build/aps-source/`).
- `README.md` rewritten around `dev`/`build`/`preview`/`test`/`test:acceptance`; no
  mention of CRA, `npm start` or `npm run eject` survives.

Acceptance pipeline (APS):

- `scripts/bootstrap-aps.sh`: clones the APS repo into `build/aps-source/` and builds
  `gherkin-parser`, `gherkin-ir-dry-checker` and `gherkin-mutator` into `bin/` with the Go
  toolchain. Idempotent; no-ops when all three binaries are present. `GO_BIN`, `APS_REPO`
  and `APS_REF` are overridable.
- `acceptance/runtime.ts`: the portable half. `expandScenarios` (background prepended,
  one execution per example row, `<scenario>/example_<n>`, scenarios without examples run
  once with `{}`), `resolveArgument`, `matchStep`, `runExecution`. Framework-free and
  project-free; no filesystem, network or Vitest dependency.
- `acceptance/generator.ts` + `acceptance/generate-entrypoints.ts`: the pure source/hash/
  metadata-name functions, and the `<json-ir> <generated-test-output>` CLI around them
  (exit 0/1/2 per the APS generator spec). Emits one `<slug>.acceptance.ts` per feature plus
  `metadata/<mapped-name>.json` with `schema_version`, `feature_path`, `ir_path`,
  `implementation_hash` (sha256 over generated files only) and `hash_scope`.
- `acceptance/steps.ts`: 16 regex step handlers covering all 18 unique step texts the
  specifier listed. `acceptance/fixtures.ts` owns the servers and child processes,
  `acceptance/repository.ts` the file reads, `acceptance/inspection.ts` the pure text
  parsing (referenced assets, `tsc` version banner, declared npm scripts).
- `vitest.acceptance.config.ts`: runs only `build/acceptance/generated/*.acceptance.ts`,
  node environment, no file parallelism (port 4000 is a shared fixture), 120s timeouts.
  Generated tests never enter the unit-test include.
- `scripts/acceptance.ts` (`npm run test:acceptance`): bootstrap if needed -> parse every
  `features/*.feature` into `build/acceptance/ir/` -> generate into
  `build/acceptance/generated/` -> execute. It prints each parse and each generated file,
  so QA step D3 has something to read.

**Step handler decisions**

- Handlers match the *raw* step text and capture `<placeholder>` tokens; the runtime then
  resolves each capture against the example object (`<name>` -> value, anything else is a
  literal). This is one substitution per capture with no rescan of the substituted text, so
  the JSON bodies and `class="todoapp"` survive intact, and a capture group can never
  swallow a value's punctuation.
- One handler covers `a client requests /`, `a client requests <path>` and
  `a client has requested /` — same behavior, different tense and example source.
  `matchStep` fails loudly on ambiguity rather than picking the first match, so the
  narrower `a client requests every script and stylesheet...` handler cannot collide.
- Dev server, preview server, production build and the port-4000 backend stub are
  memoized per generated entry point and released in that file's `afterAll`. Dev and
  preview run on an ephemeral port via Vite's Node API.

**What I verified**

- `rm -rf bin build dist node_modules && npm ci` then `npm run test:acceptance` from
  scratch: bootstrap builds the three Go binaries, 5 feature files parse, 5 entry points
  generate, **21 scenario executions pass** — 4 / 2 / 3+1+1 / 3+5 / 1+1, matching QA D5
  exactly.
- `npm test`: **13 files, 92 tests, 0 failing, 0 skipped** (see the open question below).
- `npx tsc --noEmit` exits 0 with no output; `npx tsc --version` prints `Version 7.0.2`.
- `npm run build` emits `dist/index.html` + hashed JS and CSS; `grep -c 'src/index.tsx'
  dist/index.html` is 0. `npm run preview` serves the index and the emitted bundle 200.
- `npm run dev` serves the transformed index page containing `class="todoapp"`, `id="root"`,
  `/src/index.tsx` and `Redux TodoMVC Example`.
- `react-scripts` count is 0 in `package.json`, `package-lock.json` and `src`;
  `npm ls react-scripts` reports an empty tree.
- `git status --porcelain --ignored` shows `dist/`, `build/`, `bin/` and `node_modules/`
  ignored after a full run; no build output is untracked-but-unignored.
- Negative check that the acceptance tests are actually wired to the app: deleting
  `server.proxy` from `vite.config.ts` turns both `api proxy 1` rows red; restoring it
  turns them green again.
- Not verified by me: the E2E QA procedures in `qa/`. They are QA's to execute.

**Left for the next role**

- Cleaner: `scripts/crap.mjs` is not written yet (PLAN section 4 assigns it to this task's
  cleaner). Nothing else in `scripts/` presumes its shape.
- Vitest prints a perf hint that jsdom is created once per file and suggests
  `isolate: false`. I left isolation on — a shared jsdom across 13 files is a behavior
  change to the unit tier, not a task-01 concern.
- `vite build` prints a lightningcss warning about `input::input-placeholder` inside
  `todomvc-app-css`. It is a warning from a third-party stylesheet, the build succeeds, and
  the emitted CSS is unchanged in effect.
- `.github/workflows/nodejs.yml` still runs `npm ci && npm run build && npm test` and still
  works, but it never runs `test:acceptance` and `npm ci` alone does not build `bin/`.
  Wiring acceptance into CI belongs to task 06 (`PLAN.md` section 5), so I left it.
- QA's `qa/todo-app-regression.md` needs a browser driver. `@playwright/test` is not
  installed; PLAN section 4 says the role that first needs a tool introduces it, and no
  task-01 done criterion requires it, so I did not add it or a `test:e2e` script.
- I added no `typecheck` script, per PM ruling 3.

**Open questions**

1. **QA step D1's counts are now stale, and I could not fix them because `qa/` is the
   specifier's.** `npm test` reports **13 test files and 92 tests**, not 10 and 54. The 10
   original `src/**/*.spec.{ts,tsx}` files and their 54 cases are all still there and all
   pass, unchanged except `jest.fn` -> `vi.fn`. The extra three files are the unit tests
   for the acceptance pipeline code this task introduced — `acceptance/runtime.spec.ts`
   (15), `acceptance/generator.spec.ts` (13), `acceptance/inspection.spec.ts` (10) — which
   my role brief requires and which are unit tests, not generated acceptance tests, so
   `PLAN.md` section 4 puts them in the `npm test` tier. D2's "exactly the 10
   `src/**/*.spec.{ts,tsx}` files" needs the same amendment; its real point — that no
   *generated* acceptance file appears in the unit run — still holds, and
   `build/acceptance/generated/` is outside the unit include.
2. **TypeScript major version.** The task says "current stable" and the feature file says
   "at least 5"; npm `latest` is 7.0.2, so that is what I pinned. It compiles the project
   clean. If the project would rather sit on the 5.x line for tooling-ecosystem reasons,
   say so and I will move it — nothing else depends on the major.
3. I did **not** enable `verbatimModuleSyntax`, although it is the modern default for a
   Vite ESM project. Turning it on surfaced 33 `TS1484` errors across 20 `src` files that
   tasks 02-05 are about to rewrite, and the task says to fix only the errors the upgrade
   surfaces. Flag it if you would rather absorb that churn here.

#### Second pass: correction under Coder-handoff ruling 1

Done. `typescript` moved to `^5.9.3`. Nothing else changed; nothing committed.

**What I changed**

Two files, both from a single `npm install typescript@^5.9.3`:

- `package.json`: `typescript` `^7.0.2` -> `^5.9.3`.
- `package-lock.json`: regenerated. The only removals are the twenty
  `@typescript/typescript-<platform>` optional native binaries that TypeScript 7 pulls in;
  `node_modules/typescript` is now `5.9.3`. 8 insertions, 349 deletions, no other package
  moved.

No source file, config file, feature file or QA file was touched. `verbatimModuleSyntax`
stays off per the ruling.

**What I verified**

The downgrade surfaced **no type errors and no test failures**. Re-verified after
`rm -rf node_modules && npm ci` (exit 0), so the lockfile alone reproduces this:

- `npx tsc --version` -> `Version 5.9.3`; `npx tsc --noEmit` exits 0 with no output.
- `npm test`: 13 files, 92 passing, 0 failing, 0 skipped.
- `npx vitest run src`: **10 files, 54 passing** — the Specifier's D2a floor is intact,
  as predicted. `npx vitest run acceptance`: 3 files, 38 passing. 54 + 38 = 92.
- `npm run test:acceptance`: 5 features parse, 5 entry points generate, 21 scenario
  executions pass. That run exercises the dev server, the port-4000 proxy, the production
  build and the preview server, so those paths are covered too.
- `npm run build`: exits 0, emits `dist/index.html` plus hashed JS and CSS. The
  third-party `input::input-placeholder` lightningcss warning from `todomvc-app-css` is
  unchanged and still only a warning.
- `typescript compilation 2` ("at least 5") and QA D7 ("major version is 5 or higher")
  both hold on 5.9.3, matching the Specifier's second note.
- `react-scripts` count is still 0 in `package.json`, `package-lock.json` and `src`.
- `git status --short` shows exactly `package.json` and `package-lock.json` modified.

`typescript-eslint@8.69.0`'s `peerDependencies.typescript` range `>=4.8.4 <6.1.0` now
contains the pin, which was the point of the ruling. I did not install
`typescript-eslint` — that is task 06's.

**Left for the next role**

Unchanged from my first note. `scripts/crap.mjs` is still the Cleaner's to write; the
Vitest isolation hint, the lightningcss warning, CI wiring for `test:acceptance` (task 06),
and the missing Playwright driver for `qa/todo-app-regression.md` all stand as recorded
there.

**Open questions**

None. Ruling 1 is discharged, and both my earlier open questions are closed: ruling 1
settled the TypeScript major, ruling 2 settled the QA spec inventory.

#### Third pass: `api proxy 1`'s new columns, checked rather than taken on trust

Done. **No file changed.** The step handlers already carry the Specifier's split, and I confirmed
that by running the pipeline rather than by reading the previous note. Nothing committed;
`git status --short` is empty.

**Why no handler change is needed**

The mechanism, traced from the parser output rather than from the claim:

- `build/acceptance/ir/api-proxy.json` carries `parameters: ["path", "stub_body"]` on the Given
  and `["expected_body"]` on the Then, and each example row carries all three cells.
- `steps.ts` matches the **raw** step text: `replies to (\S+) with (.+)$` captures the literal
  `<stub_body>`, `body equals (.+)$` captures the literal `<expected_body>`. Neither pattern
  names a column, so renaming one cannot reach the handler table.
- `runExecution` maps `resolveArgument` over every capture of every step against that step's own
  example row. `resolveArgument` matches `^<([A-Za-z0-9_]+)>$`, which `stub_body` and
  `expected_body` satisfy, looks the name up once, and returns the value without rescanning it.

So the two sides meet only through a real HTTP round trip: `backendRepliesTo` puts the resolved
`stub_body` in the stub's route map, and `bodyEquals` compares the body the dev server's proxy
actually returned against the separately resolved `expected_body`. Nothing in the handlers ties
them together, which is what the split needs in order to bite.

**That the split bites, checked in both directions, without writing to `features/`**

I staged a dithered copy of the feature in the scratchpad, parsed *that* into
`build/acceptance/ir/api-proxy.json`, regenerated the entry point and ran it. `features/` was
never written to; `git status --short` was empty before and after.

| Dither | Result |
| --- | --- |
| `stub_body` row 1, `{"id":1,` -> `{"id":1, ` | `api proxy 1/example_1` red, `example_2` green. Message: expected the row's `expected_body`, got the dithered stub. |
| `expected_body` row 2, `true` -> `tru` | `api proxy 1/example_2` red, `example_1` green. |

Each side fails alone, and each failure names the other column's value, so the assertion is
genuinely about pass-through and no longer about a cell against itself.

**The scenario is still wired to the proxy, not just to the stub.** Deleting `server.proxy` from
`vite.config.ts` turns both rows red (`Tests 2 failed | 22 passed`); restoring it returns the tier
to 24 passing. Both dither runs and this one were restored by re-running the tier, and the whole
tree is back to what the Specifier left.

**What I verified**

Every tier run directly, and every count matches procedure D as the Specifier reconciled it:

| Command | Result | Procedure D |
| --- | --- | --- |
| `npm run test:acceptance` | 5 features parse, 5 entry points generate, **24 scenario executions pass** | D3, D5 |
| `npm test` | 15 files / 119 tests, 0 failing, 0 skipped | D1 |
| `npx vitest run src` | **10 files / 54 tests** - the D2a floor, intact | D2a |
| `npx vitest run acceptance` | 5 files / 65 tests | D2b |
| `npm run test:property` | 6 files / 60 | D8 |
| `npm run test:hardening` | 7 files / 92 | D9 |
| `npx tsc --noEmit` | exit 0, no output; `--version` 5.9.3 | D6, D7 |
| `npm run build` | exit 0, `index-BPxiUVWS.js` + `index-xAQXB6NR.css` - the same content hashes every role since the Cleaner has recorded; `grep -c 'src/index.tsx' dist/index.html` is 0 | C1-C3 |

Also: `react-scripts` count 0 in `package.json`, `package-lock.json` and `src`, and `npm ls
react-scripts` reports an empty tree (A3-A5). `git status --porcelain --ignored` shows `bin/`,
`build/`, `coverage/`, `dist/` and `node_modules/` ignored and nothing untracked-but-unignored (E1).
`package.json` declares exactly the eight scripts `toolchain dependencies 2` lists, and
`README.md`'s `Available Scripts` documents those eight and no others (E3).

I ran the property tier only to reconcile its count against D8; my brief otherwise leaves it alone.
No mutation, CRAP or DRY tooling ran, and I applied no Gherkin mutation - the dither above is two
hand edits to a scratchpad copy, and the Hardener re-run is what records the mutants as killed.

**No new unit test, and why that is not a gap**

I added no test because I added no code. The behaviour the split depends on is already pinned by
the tiers: `resolveArgument` reading a value by name, passing a literal through, failing on a
missing name, and *not* rescanning a value that looks like a placeholder are all in
`acceptance/runtime.spec.ts` and again as properties in `property/runtime.property.ts`, and
`hardening/runtime.hardening.ts` pins the near-miss forms (`<path>/1`, `api<path>`,
`<path><path>`). A plausible wrong implementation - resolve the first capture and pass the rest
raw - dies on the dither above and on the acceptance tier; the Hardener's run already reports 0
survivors in `runtime.ts`, so no mutant of that mapping is alive either.

**Left for the next role**

- Cleaner, Architect, Hardener: I changed nothing, so nothing new is routed to you. Everything
  earlier roles left standing still stands - the Vitest isolation hint, the third-party
  lightningcss warning from `todomvc-app-css`, CI wiring for the five test commands (task 06), the
  `console.log` in `src/reducers/apis.ts` (task 06 by PM ruling), and `scripts/crap.mjs` having no
  tier over it (PM ruling 3 on the Hardener handoff assigns that to the Cleaner in this chain).
- Hardener: the two `api proxy 1` survivors are the point of this chain. `api-proxy.feature` now
  presents 6 candidate mutations, not 4.
- QA: nothing in `qa/` moved for me, and D1-D10 all read true against the tree today.

**Open questions**

1. **QA adding `test:e2e` will break QA step E3 as written.** PM ruling 2 on the second Specifier
   pass authorises QA to add `@playwright/test` and a `test:e2e` script, but E3 says `README.md`'s
   `Available Scripts` documents "exactly the eight scripts `package.json` declares, and no
   others", and names the eight. A ninth script fails E3 whether or not the README documents it,
   because the number is written into the step. `toolchain dependencies 2` is unaffected - it only
   asserts that the scripts it lists exist. This is not mine to fix: the script is QA's to add and
   E3 is the Specifier's to edit. Flagging it so it is decided before QA runs rather than
   discovered as a false failure, which is the same trap the PM recorded for E3's previous count.


#### Fourth pass: the acceptance tier now builds a real production bundle

Done. Seven files changed, all mine and all under `acceptance/`. Nothing committed. `features/`,
`qa/` and `e2e/` are untouched.

**The step handler, first**

- `acceptance/inspection.ts`: `referencedScripts(html)` is now its own exported function and
  `referencedAssets` is composed from it plus a private `referencedStylesheets`. No behavior of
  `referencedAssets` moved - same values, same order.
- `acceptance/assertions.ts`: two new judgments. `scriptReferencedByResponse(world)` returns the one
  script the observed index page references, and fails loudly on none and on more than one rather
  than guessing which is the bundle. `responseContains(response, content)` is `bodyContains`'s
  judgment with the world lifted out, so it can judge a response the scenario fetched without
  overwriting the index response the Background recorded; `bodyContains` now delegates to it and its
  message is unchanged, which is why the hardening tier still reads the same text.
- `acceptance/steps.ts`: one new handler, `/^the served JavaScript bundle contains (.+)$/`, which
  fetches the referenced script and hands it to `responseContains`. The capture stays generic - it
  captures `<production_marker>` and the runtime resolves it against the example row, so no example
  column name is written into a pattern. Vocabulary is now 17 patterns over 19 unique step texts.

**Then the fixture, which is what the scenario was really about**

`acceptance/fixtures.ts` built by calling Vite's `build()` inside the Vitest worker. Vite decides
whether a build is a production build from `process.env.NODE_ENV`, not from its `mode`, and Vitest
sets `NODE_ENV=test`, so `react-dom` resolved to its development entry. I measured both halves of
that claim rather than reasoning about it: `NODE_ENV=test npx vite build` emits 372,861 bytes with
**zero** occurrences of `Minified React error`, and adding `--mode production` changes nothing -
still 372,861 bytes, still zero. Only `NODE_ENV` moves it.

`buildForProduction` now runs `node_modules/.bin/vite build` as its own process with
`NODE_ENV=production`, and throws with the child's output when it exits non-zero. `runCommand` in
`acceptance/commands.ts` takes an optional environment (defaulting to `process.env`, so the two
`tsc` steps are unaffected) and `viteBundler` joins the existing `typescriptCompiler` beside it.

**I kept the default `dist/` outDir**, so `npm run preview` needs no argument and QA's C3a reads the
same directory it always did. The Specifier asked whether procedure C's cautionary paragraph could
go: it should stay, because D3 does still overwrite `dist/` - but it is now harmless rather than
merely tolerable, because what D3 leaves there is byte-identical to what `npm run build` leaves
(checked by md5, below). Re-running C1 after D is now a formality, not a repair.

**The ordering the ruling required, in the order it required it**

1. Handler added, fixture untouched: `npm run test:acceptance` is red at `2 failed | 24 passed (26)`,
   and both rows now fail for the reason the scenario exists -
   `production build 4/example_1`: `response body does not contain "Minified React error"`, followed
   by an excerpt of the minified development bundle, and `example_2` the same for
   `act(...) is not supported in production builds of React.`. No `unsupported step text` anywhere in
   the run. That is the scenario detecting a development bundle.
2. Fixture fixed: `npm run test:acceptance` is green at **26 scenario executions**, 5 features
   parsed, 5 entry points generated.
3. Re-checked in the other direction, because a green tier proves less than a red one: setting the
   child's `NODE_ENV` back to `test` and running the production-build entry point alone reddens
   exactly `production build 4/example_1` and `example_2` on the missing markers, with the other five
   executions of that file still passing. Restoring `production` returns it to 7 passing. So the
   scenario discriminates on the artifact, not on the step's existence.

**What else I verified**

- Unit tier, TDD order: the ten new unit tests were written first and failed with
  `referencedScripts is not a function` / `responseContains is not a function` before the production
  code existed.
- `npm test`: **23 files / 224 tests**, 0 failing, 0 skipped. `npx vitest run src` **10 / 54** - the
  floor D2a guards is intact and untouched. `npx vitest run acceptance` **5 / 59**.
  `npx vitest run scripts` **8 / 111**. 54 + 59 + 111 = 224 and 10 + 5 + 8 = 23, so D1 is still
  exhaustively split.
- `npm run test:property` 11 files / 95 and `npm run test:hardening` 12 files / 128, both unchanged:
  keeping `bodyContains`'s message and semantics is what left the hardening tier alone.
- `npx tsc --noEmit` exits 0 with no output.
- `npm run build` after the acceptance tier had run: `dist/index.html`, `dist/assets/*.js` and
  `dist/assets/*.css` are **md5-identical** to what the tier itself left, so the tier and the script
  now emit the same artifact. `grep -c` on the emitted bundle: `Minified React error` 1,
  `act(...) is not supported in production builds of React.` 1, `Invalid hook call` 0, and
  `src/index.tsx` 0 in `dist/index.html` - QA C3a, C3b and C3 read true.
- `git status --short` shows only `acceptance/assertions.ts`, `acceptance/assertions.spec.ts` (new),
  `acceptance/commands.ts`, `acceptance/fixtures.ts`, `acceptance/inspection.ts`,
  `acceptance/inspection.spec.ts` and `acceptance/steps.ts`, plus this task file.
- I ran no mutation of any kind, no property run beyond the tier command above, and not the CRAP
  gate; my brief bars them.

**Where the new tests live, and why there is a new spec file**

`acceptance/assertions.spec.ts` is new. `assertions.ts` had no unit spec - its judgments were tested
only in `hardening/assertions.hardening.ts`, which is the Hardener's tier, and an acceptance run is
not a substitute for a unit test of a new judgment. The new file covers only the two functions this
pass added; I deliberately did not restate the hardening tier's coverage of the existing ones. The
`referencedScripts` tests went into the existing `acceptance/inspection.spec.ts` beside
`referencedAssets`, with that file's page fixture hoisted to module scope so both describes read the
same page.

**Left for the Cleaner**

- `acceptance/assertions.ts` and `acceptance/inspection.ts` are cores, so both are in the CRAP gate's
  measured set and in Stryker's mutate set. The new functions are small - `scriptReferencedByResponse`
  is two guards and a return - but I did not run the gate.

**Left for the Hardener**

- `.mutation/` is untouched. Two things there are now stale by construction and neither is
  hand-editable: `.mutation/gherkin/production-build.manifest` keys its reuse on an
  `implementation_hash` that `steps.ts` has moved, and `.mutation/test-tier.json`'s `tier_hash`
  predates `acceptance/assertions.spec.ts`, which the mutation tier picks up automatically
  (`vitest.mutation.config.ts` includes `acceptance/**/*.spec.ts`).
- `production build 4`'s two candidates are the ones to watch, and they are the reason this chain
  resumed. Each is a production-only string in a positive assertion; dithering either cell should
  make `responseContains` fail.
- New core code to mutate: `referencedScripts`, `scriptReferencedByResponse`, `responseContains`. The
  guards in `scriptReferencedByResponse` are covered in all three directions (none, one, several) and
  the messages are asserted, so equality- and message-mutants should die in the unit tier.

**Left for the Specifier and QA - counts moved, and the protocol says say so here**

The unit tier grew by the one new spec file and its 7 tests, plus 3 tests in an existing file. The
`src` half did not move. Procedure D needs:

| Step | Now reads | Should read |
| --- | --- | --- |
| D1 | 22 files / 214 | **23 files / 224** |
| D2 | 4 `acceptance/` files | **5**, adding `acceptance/assertions.spec.ts` |
| D2a | 10 / 54 | unchanged |
| D2b | 4 / 49 | **5 / 59** |
| D2c | 8 / 111 and the sums | 8 / 111, sums **54 + 59 + 111 = 224**, **10 + 5 + 8 = 23** |

D3-D10 are unaffected: no property or hardening file moved, and D5's 26 is what the tier now reports.

`e2e/toolchain-commands.spec.ts` is QA's and carries the same numbers as literals -
lines around D1 (`22 passed (22)`, `214 passed (214)`), D2's explicit file list, D2b
(`4 passed (4)`, `49 passed (49)`) and D2c's two arithmetic assertions. The `24 -> 26` edits the
Specifier's sixth pass already flagged are still needed there too; I changed nothing under `e2e/`.

**Open questions**

None.


### Project manager rulings on the Coder handoff

Verified independently before ruling: `npx tsc --noEmit` exits 0, `npm test` passes 13 files
and 92 tests, `npm run test:acceptance` passes 5 files and 21 scenario executions, and nothing
under `features/` or `qa/` was modified. The toolchain swap itself is accepted.

Two corrections are required before the chain continues.

1. **TypeScript is pinned to the wrong line. Change `typescript` to `^5.9.3`.**
   `typescript-eslint@8.69.0` declares `peerDependencies.typescript` as `>=4.8.4 <6.1.0`.
   The current pin of `^7.0.2` sits outside that range, and `tasks/06-lint-typecheck-ci.md`
   requires `typescript-eslint`. "Current stable" in this task's scope means the current
   stable release the project's own toolchain supports, which is the 5.9.x line. Re-verify
   `npx tsc --noEmit`, `npm test`, `npm run test:acceptance`, and `npm run build` after the
   change, and report any type errors the downgrade surfaces rather than working around them.
   `verbatimModuleSyntax` stays off, as the Coder decided; that is correct while tasks 02-05
   are still going to rewrite those files.

2. **QA procedure D1/D2's spec inventory is stale, and it is the Specifier's to fix.**
   The recorded baseline of 10 spec files and 54 cases predates the acceptance-pipeline unit
   tests this task legitimately added; the suite is now 13 files and 92 tests, with the
   original 10 files and 54 cases all intact. The Coder was right not to edit `qa/`. A fresh
   Specifier is being spawned to correct the procedure before the Coder's second pass.



### Cleaner

Done. Behaviour-preserving cleanup of the toolchain and acceptance-pipeline sources, plus
`scripts/crap.mjs`. Nothing committed. `features/` and `qa/` untouched.

**What I changed**

`scripts/crap.mjs` (new, the tool PLAN section 4 assigns to this role):

- CRAP = `cc^2 * (1 - coverage)^3 + cc`, per function. Cyclomatic complexity comes from the
  TypeScript compiler API (already a project dependency, so no new tool): `if`, `?:`, the
  four loop forms, `case`, `catch`, and `&& || ?? &&= ||= ??=`. Coverage comes from
  `coverage/coverage-final.json`. Every decision point and every statement is attributed to
  the *innermost* enclosing function, so a callback never inflates the complexity of the
  function it is passed to. Module top-level code is reported as `(module)`.
- `node scripts/crap.mjs [--max <n>] [--reuse] [--all] [<path> ...]`. Paths restrict the
  gate (`node scripts/crap.mjs acceptance`); `--reuse` skips re-running the unit tier;
  `--all` lists every function instead of only the offenders. Exit 0 clean, 1 over the gate,
  2 on a usage error - the same convention `acceptance/generate-entrypoints.ts` uses.
- I added **no npm script** for it. The task scope fixes the script surface at `dev`,
  `build`, `preview`, `test`, `test:acceptance`, PM ruling 3 treats an extra script as a
  scope violation, and QA E3 reads the README against that list. Later tasks invoke it as
  `node scripts/crap.mjs`, which is how PLAN section 4 names it.
- `@vitest/coverage-v8@^5.0.0` added as a devDependency (PLAN section 4: the role that first
  needs a tool introduces it) and a `test.coverage` block added to `vite.config.ts`. The
  block excludes the adapter shells, per the shared definition that they stay out of test
  tooling: `src/index.tsx`, `src/setupTests.ts`, `acceptance/commands.ts`,
  `acceptance/fixtures.ts`, `acceptance/generate-entrypoints.ts`, `acceptance/project-files.ts`,
  `acceptance/steps.ts`.

Moved behaviour out of an environmental module into a testable one:

- `acceptance/generator.ts` gains `featureArtifacts()` - it decides both artifact paths, the
  entry-point source and the whole metadata document, and returns them as two
  `{ path, content }` records relative to the working directory. `relativeImportPath()` moved
  in with it. `acceptance/generate-entrypoints.ts` is now only argv handling, one read, two
  writes and the exit codes; every path decision and the metadata schema are testable.
- The generated entry points and metadata files are **byte-for-byte identical** before and
  after, implementation hashes included (`diff -r` against a saved baseline).

Split a mixed source:

- `acceptance/fixtures.ts` was doing three jobs: servers, running child processes, and owning
  `projectRoot`. Process running moved to a new `acceptance/commands.ts` (`runCommand`,
  `typescriptCompiler`), and `projectRoot` moved to `acceptance/project-files.ts`, where the
  other project-tree readers already live. `fixtures.ts` is now only "the servers a scenario
  runs against", and `project-files.ts` no longer has to import the server fixtures to learn
  where the project root is.

Renames and local cleanups:

- `acceptance/repository.ts` -> `acceptance/project-files.ts`. In a TypeScript project
  `repository.ts` reads as a data-access repository; the module reads files out of the
  project tree, and its functions already said `Project`. `filesReferencing(location, needle)`
  -> `(location, reference)`, matching the step text it serves.
- `acceptance/generator.ts` held two literal NUL bytes as the hash separator, which made git
  treat the file as binary (`Bin 0 -> 1766 bytes` in the Coder's commit - no reviewable diff).
  They are now the escape `\0`. Same bytes hashed, same hashes; the file is text again.
- `acceptance/inspection.ts`: the quoted-attribute regexes captured the value twice, once per
  quote style, and call sites passed the group indices (`attributeValue(match, 2, 3)`). One
  capture of the whole quoted string plus `unquoted()` says the same thing with no magic
  numbers. `SCRIPT_TAG`/`STYLESHEET_TAG` -> `SCRIPT_SRC`/`LINK_TAG` (the latter matches every
  link; the `rel` filter is separate).
- `acceptance/fixtures.ts`: `releaseFixtures` cleared six fields by hand and would silently
  go stale when a seventh was added; it now closes what is open and re-seeds one
  `emptyFixtures()` record. The two identical server-close promises collapsed into
  `closeServer`, and `addressed()` names the "this is the server the client steps talk to"
  assignment that both start functions repeated.
- `acceptance/steps.ts`: the every-asset handler computed the failure list before checking
  that any asset had been requested; the empty check now comes first.
- `scripts/acceptance.ts`: spawns `process.execPath` rather than whatever `node` is on PATH,
  so the pipeline runs on the Node that started it, and the generator and vitest paths are
  hoisted up beside `parser` instead of being rebuilt inline.
- `package.json`: removed `resolutions` and `browserslist`. Both are dead - npm ignores
  `resolutions` (it reads `overrides`; the installed `@types/react` is 18.3.31, not the
  18.0.0 that key names), and Vite reads `build.target`, not browserslist. Verified dead:
  `npm run build` emits the same two asset **content hashes** with and without them.
- `.gitignore`: `dist` was listed twice and `build/` sat under no heading; one comment now
  covers the acceptance-pipeline entries. `coverage/` was already ignored.

**What I verified**

- `npx tsc --noEmit` exits 0 with no output.
- `npm test`: **13 files, 99 tests**, 0 failing, 0 skipped. `npx vitest run src`: **10 files,
  54 tests** - the Specifier's D2a floor, untouched. `npx vitest run acceptance`: **3 files,
  45 tests** (was 38; see the QA note below).
- `npm run test:acceptance` from a clean `rm -rf bin build dist`: bootstrap builds the three
  Go binaries, 5 features parse, 5 entry points generate, **21 scenario executions pass**.
- The generated entry points and metadata are byte-identical to the Coder's output
  (`diff -r` against a copy taken before I started), so the generator refactor and the NUL
  escape changed no artifact and no implementation hash.
- `npm run build` exits 0 and emits `dist/index.html` plus `assets/index-BPxiUVWS.js` and
  `assets/index-xAQXB6NR.css` - the same content hashes as before the package.json cleanup.
  `grep -c 'src/index.tsx' dist/index.html` is 0. The preview server, the dev server and the
  port-4000 proxy are all exercised by the acceptance run.
- `npm ci` from the regenerated lockfile succeeds. `react-scripts` count is 0 in
  `package.json`, `package-lock.json` and `src`.
- `git status --porcelain --ignored`: `bin/`, `build/`, `coverage/`, `dist/`, `node_modules/`
  all ignored, nothing untracked-but-unignored.
- **CRAP.** `node scripts/crap.mjs acceptance`: 27 functions, 0 over the gate, worst is
  `resolveArgument` at 4.0. Statement coverage of the testable acceptance modules
  (`generator`, `inspection`, `runtime`) is **72/72 = 100%**.

**CRAP over the gate, all of it pre-existing `src/` application code**

`node scripts/crap.mjs` (whole project): 121 functions in 29 files, 5 over the gate.

| Function | cc | cov | CRAP |
| --- | --- | --- | --- |
| `src/reducers/apis.ts:4` `executing` | 13 | 0% | 182.0 |
| `src/middlewares/callapimiddleware.ts:18` (the middleware body) | 5 | 0% | 30.0 |
| `src/reducers/apis.ts:47` `errorMessage` | 4 | 0% | 20.0 |
| `src/selectors/index.ts:10` (the `getVisibleTodos` selector) | 4 | 0% | 20.0 |
| `src/reducers/todos.ts:23` `todoApiResults` | 5 | 33% | 12.4 |

Every one is driven by **missing coverage, not by complexity** - `executing` is a single
`switch` answering one question, which the CRAP exception permits at cc 13. Task 01 changed
none of these files, and its Out-of-scope list bars me from them ("any change to ... Redux
shape ... or the API middleware"), while D2a bars me from adding `src` test cases (10 files,
54 tests, "adds and removes no case"). So I measured them and left them. `src` statement
coverage is 123/196 = 63%.

**Open questions**

1. **QA D1/D2b are stale again, by 7 cases, and only the Specifier can fix them.** `npm test`
   now reports **13 files / 99 tests**; D1 says 92 and D2b says 38 for the acceptance half.
   The seven new cases are all in the existing `acceptance/generator.spec.ts` - no new spec
   file, so **D2's file list is still exactly right** and **D2a is untouched at 10/54**. They
   cover `featureArtifacts` and `relativeImportPath`, the logic I moved out of the CLI shell;
   without them the move would have traded a testable module's 100% coverage for a hole. QA's
   own rule is that a D2b change is acceptable when the handoff records it and D1/D2/D2b move
   together, so this note is that record: **D1 -> 13 files / 99 tests, D2b -> 3 files / 45
   tests, D2 unchanged.**
2. **`src/reducers/apis.ts:22` has a leftover `console.log('action', action)` inside the
   reducer.** It is debug output in shipping code and it prints on every PATCH/DELETE
   request. Removing it is one line, but it is observable behaviour in a file this task puts
   out of scope, so I did not touch it. It belongs to whichever task takes `src/reducers/`;
   no task in PLAN section 5 currently claims that file.
3. **`scripts/crap.mjs` cannot measure itself.** Coverage `include` covers `src/**` and
   `acceptance/**`, so `scripts/` is outside the report and the tool has no CRAP number of its
   own. Its functions are each one job; the widest is `readOptions` at cc 6, which is the
   single argument `cond` the CRAP exception describes.

**Left for the next role**

- Architect: the dependency direction question I deliberately did not settle - `acceptance/`
  now has a clean testable core (`runtime`, `generator`, `inspection`) and a shell
  (`commands`, `fixtures`, `project-files`, `steps`, `generate-entrypoints`), but nothing
  enforces that a core module never imports a shell one.
- Hardener: `acceptance/steps.ts` is excluded from the unit tier as wiring, and it is the one
  place where a wrong assertion would go unnoticed by anything except the acceptance tier
  itself.
- Everything the Coder left standing still stands: the Vitest isolation hint, the third-party
  lightningcss warning, CI wiring for `test:acceptance` (task 06), and the missing Playwright
  driver for `qa/todo-app-regression.md`.
- No mutation tooling ran. `.mutation/` does not exist yet, Stryker is not installed, and my
  brief bars mutation runs and Gherkin mutation; I applied the mixed-job hint by reading the
  changed sources and splitting `fixtures.ts`, which was the only one doing more than one job.

#### Second pass: correction under Architect-handoff ruling 1

Done. `scripts/crap.mjs` merges coverage across the tiers that measure it. Nothing else
changed; nothing committed. `src/`, `features/` and `qa/` untouched.

**What I changed**

Five files, all tooling:

- `vitest.coverage.ts` (new) owns what the gate measures: provider, reporters, the
  `include` of `src/**` and `acceptance/**`, and the adapter-shell `exclude`. That block used
  to sit inside `vite.config.ts`, where only the unit tier could see it, so the property tier
  had no coverage settings at all and could not report against the same sources. One owner now,
  imported by both tier configs. `tsconfig.json` gains the file.
- `vite.config.ts` and `vitest.property.config.ts` both read `measuredCoverage` from it. The
  unit tier's `include`, environment and setup are untouched; the property tier gains only the
  coverage block, so `npm test` and `npm run test:property` behave exactly as before (coverage
  stays off unless asked for).
- `scripts/crap.mjs`:
  - A `TIERS` table names the tiers the gate runs and merges - `unit` (`vite.config.ts`) and
    `property` (`vitest.property.config.ts`). Each runs with `--coverage.enabled` and its own
    `--coverage.reportsDirectory`, so one tier's report can no longer overwrite another's; the
    tool owns the `coverage/<tier>/` convention, and a manual `vitest run --coverage` still
    lands in the default `coverage/` and is ignored.
  - `mergeTiers` unions the reports before scoring. Statements are keyed by source location
    rather than by istanbul's per-report statement id, and hit counts are summed, so **a
    statement is covered when any tier covered it**. `measureFile` now takes merged
    `{ start, end, hits }` records instead of a raw istanbul file entry, which also drops the
    `statementMap`/`s` index-chasing it used to do.
  - A missing tier report fails loudly and names the tier
    (`no property-tier coverage report at ...`), exit 2, rather than scoring a partial union.
  - `--reuse` now reuses both tier reports; `--max`, `--all` and the path filter are unchanged.
    The summary line names the tiers it merged:
    `gate CRAP <= 10 | tiers: unit + property | files: 31 | functions: 144 | over the gate: 2`.

**Why the acceptance tier is not merged**

It is the only other tier that runs today, and I measured it rather than assuming. Run with
coverage over the same sources, it covers `inspection.ts` 20/21 and `runtime.ts` 25/29 - both
strict subsets of the unit tier's 21/21 and 29/29 - and nothing at all in `generator.ts`,
`layering.ts`, `layout.ts` or `src/`. Everything else it exercises (`steps.ts`, `fixtures.ts`,
`commands.ts`, `project-files.ts`) is an excluded adapter shell. So merging it moves no number,
while making the gate depend on the bootstrapped Go binaries and a parse-and-generate cycle.
The reason is recorded in the comment above `TIERS`; if a later task moves logic out of the
shells into measured modules, add the tier there.

**What the gate now reports**

`node scripts/crap.mjs`: 31 files, 144 functions, **2 over the gate** (was 5). The five the
Architect tabulated read as predicted:

| Function | before (unit only) | now (unit + property) |
| --- | --- | --- |
| `src/reducers/apis.ts:4` `executing` | 182.0 | **13.0** - cc 13, 100% covered |
| `src/middlewares/callapimiddleware.ts:18` | 30.0 | **30.0** - cc 5, 0% covered, it is IO |
| `src/reducers/apis.ts:47` `errorMessage` | 20.0 | 4.0 |
| `src/selectors/index.ts:10` `getVisibleTodos` | 20.0 | 4.0 |
| `src/reducers/todos.ts:23` `todoApiResults` | 12.4 | 5.0 |

Merged statement coverage: `src` **156/196 = 80%** (was 123/196 = 63%), the testable
`acceptance` modules **131/131 = 100%**.

The two that remain are both pre-existing `src/` application code this task's Out of scope bars
me from, and neither is a coverage gap I could close without adding `src` test cases, which the
Specifier's D2a floor forbids. `executing` at 13.0 is the CRAP exception verbatim - one `switch`
answering one question, now fully covered - so its number is a report, not a finding. See open
question 1.

**What I verified**

- `npx tsc --noEmit` exits 0 with no output.
- `npm test`: **15 files, 119 tests**, 0 failing, 0 skipped. `npx vitest run src`: **10 files,
  54 tests** - D2a intact. `npx vitest run acceptance`: **5 files, 65 tests**.
  `npm run test:property`: **6 files, 60 properties**. Every count is exactly what the Architect
  handed over: **I added no test and removed none, so QA procedure D needs nothing from this
  pass.**
- `npm run test:acceptance`: 5 features parse, 5 entry points generate, **21 scenario executions
  pass**. The generated entry points and metadata are **byte-identical** to the Architect's
  output (`diff -r` against a copy taken before I started), implementation hashes included.
- `npm run build` exits 0 and emits the same content hashes again - `index-BPxiUVWS.js`,
  `index-xAQXB6NR.css`.
- The tool itself: `--reuse` scores without re-running; a path filter (`... acceptance`) reports
  5 files / 50 functions / 0 over the gate; an unknown option and an unmatched path both exit 2;
  deleting `coverage/property/` makes the next `--reuse` fail naming the tier instead of scoring
  half the union.
- Cross-tier statement maps agree: for every file in both reports the `statementMap` is
  identical, so the location-keyed union adds no phantom statements. The one file that differed
  during a trial was a stale report, and it agreed once both tiers were re-run.
- `git status --short src features qa` is empty.

**Left for the next role**

- Hardener: the gate is the instrument the ruling asked for - run `node scripts/crap.mjs
  <changed paths>`. It runs both tiers itself (about 8s); `--reuse` skips that when the reports
  are current. If you add a tier that measures the same sources, add it to `TIERS` and give it
  `measuredCoverage`; that is the whole wiring.
- Everything earlier roles left standing still stands: the Vitest isolation hint, the
  third-party lightningcss warning, CI wiring for `test:acceptance` (task 06), the missing
  Playwright driver for `qa/todo-app-regression.md`, and the `console.log` in
  `src/reducers/apis.ts` (task 06 by PM ruling).
- No mutation tooling ran; my brief bars mutation runs and Gherkin mutation. I applied the
  mixed-job hint by reading the changed sources: `vitest.coverage.ts` has one job (what is
  measured), and `crap.mjs` still has one (score the code and gate it), with the tier-running
  shell and the pure merge/measure functions separated inside it.

**Open questions**

1. **The gate cannot apply the CRAP exception, and `executing` is the case that shows it.**
   At cc 13 and 100% coverage it scores 13.0 and the run exits 1, though the shared definition
   exempts exactly this shape - a single `switch` answering one question. Detecting that
   mechanically (a function whose complexity comes entirely from one flat `switch`) is possible
   but it is new behaviour in the instrument and it would let real offenders pass quietly, so I
   did not add it on a targeted correction. Until it is settled, a whole-project run exits 1 on
   a function no role is allowed to change; scope the gate to changed paths, or say the word and
   I will add the detection.
2. **Coverage reports moved to `coverage/<tier>/`.** Nothing in `qa/`, `README.md` or any
   feature file mentions coverage paths, and `coverage` stays gitignored, so I believe this is
   invisible outside the tool. Flagging it in case a later task wants a single canonical report.

#### Third pass: `scripts/crap.mjs` brought under test, under Hardener-handoff ruling 3

Done. The gate's logic is a tested, measured package and the tool is a shell over it. Nothing
committed. `features/`, `qa/` and `src/` untouched. No dependency added, no npm script added,
no mutation run.

**Ruling 3, decided: test it by splitting it, and widen the coverage `include` to
`scripts/**/*.ts` rather than to `scripts/**`**

`scripts/crap.mjs` was four jobs in one file: read a command line, walk the TypeScript AST for
complexity, merge and attribute coverage, and format a report - wrapped around running the
tiers and reading their files. Only the last of those is environmental. It is now:

| Module | Its one job |
| --- | --- |
| `scripts/crap/complexity.ts` | cyclomatic complexity and the span of every function in a source text |
| `scripts/crap/coverage.ts` | istanbul reports in, one union of statements keyed by source location out |
| `scripts/crap/score.ts` | attribute each statement to the innermost function containing it, and score it |
| `scripts/crap/options.ts` | what a command line asks the gate for, and which files a path argument gates |
| `scripts/crap/report.ts` | which functions a run lists, in what order, and whether it passed |
| `scripts/crap/tiers.ts` | which tiers the gate runs and merges, and where each one's report goes |
| `scripts/crap.mjs` | the shell: run the tiers, read the reports and the sources, write the lines, pick the exit code |

The core is TypeScript, not `.mjs`: `tsc --noEmit` then checks the gate's own logic, Stryker's
TypeScript checker can reject invalid mutants of it, and the coverage globs stay uniform with
the rest of the tree. The entry point keeps the name `PLAN.md` section 4, `README.md` and QA
step E4 all use, and loads the core through Node 22's type stripping - the same way
`node scripts/acceptance.ts` already runs. 77 lines of shell, 359 of core, 499 of specs.

**Why not `scripts/**` whole.** That would measure `scripts/acceptance.ts`,
`scripts/acceptance-mutation.ts` and `scripts/mutation.ts`, which are CLI shells by the same
definition that already excludes `acceptance/generate-entrypoints.ts` and
`acceptance/pipeline.ts`, and would put three 0%-covered files over the gate for being what
they are meant to be. They are named in `vitest.coverage.ts`'s exclude with the others.
`scripts/crap.mjs` is a shell too and needs no exclude, because the include reaches only
TypeScript; the comment says so, so a later rename does not silently pull it in. The list is
opt-out on purpose: a new module under `scripts/` lands inside the gate unless someone
declares it a shell.

**Ruling 1 needed nothing.** I added no waiver list, and none was called for: the two functions
over the gate are still `src/reducers/apis.ts` `executing` at 13.0 and
`src/middlewares/callapimiddleware.ts` at 30.0, both pre-existing `src/` code this task's Out of
scope bars me from, and the changed-file run is clean. **I am applying the CRAP exception to
`executing` and recording that I did**: one flat `switch` answering one question, now at 100%
coverage, so its 13.0 is cc alone. `callapimiddleware` is IO at 0% coverage, unchanged since
the Coder found it.

**Behaviour preserved, checked against the committed tool rather than argued**

I ran the tool as `HEAD` has it beside the split one over the same coverage reports and diffed
the output. Byte-identical on every invocation I could think to try:

| Invocation | Result |
| --- | --- |
| `--reuse --all` (whole project, every function) | identical, both exit 1 |
| `--reuse acceptance` | identical, both exit 0 |
| `--reuse --max 1 src/selectors` | identical, both exit 1 |
| `--reuse nosuchdir` | identical message, both exit 2 |
| `--reuse --bogus`, `--reuse --max` (no value) | identical messages, both exit 2 |
| `--reuse` with `coverage/property/` moved away | identical message naming the tier, both exit 2 |

**One dead branch, removed.** `functionName` had a `` `${node.parent.name?.text ?? 'class'}.constructor` ``
fallback. A named class names its own constructor through the clause above it, so the only node
that ever reaches the fallback is a class with no name of its own, and the interpolation always
evaluated to `class`. It is the constant now, with the reason written beside it. This is the same
class of finding as the Hardener's `metadataFileName` trim: a branch nothing can take is also a
mutant nothing can kill. Both behaviours are pinned by tests now - a named class's constructor
reports under the class name, an anonymous one as `class.constructor`.

**A hole closed: the gate could not tell when a tier it should merge existed**

`TIERS` lived in the shell, where nothing could read it, and a tier that measures the same
sources but is missing from that list is silently ignored - which is exactly the defect that
cost the correction pass recorded above, when the property tier measured `src/` and the gate
scored `executing` at 182.0 anyway. `MEASURING_TIERS` is in `scripts/crap/tiers.ts` now, and
`tiers.spec.ts` asserts it is **every** root config that imports `measuredCoverage`, that each
named config exists, and that no two tiers share a report directory. Verified it bites: dropping
`hardening` from the list turns the spec red. The judgment that the acceptance tier stays out
moved with the list and still reads as the previous pass left it.

**Tests: 6 spec files, 90 cases, all in the unit tier**

`scripts/crap/*.spec.ts`, beside the code, run by `npm test` like `acceptance/*.spec.ts`.
38 complexity (every decision form counted once, `else` and `default:` counted as none, a
callback charged its own decisions, the eight ways a function gets its name, spans as istanbul
positions), 16 options, 12 score (the formula at 0%, 50% and 100%, innermost attribution),
11 report, 8 coverage (union, summed hits, location keying across differing istanbul ids),
5 tiers.

**Test counts moved. Procedure D needs one Specifier pass before QA - this is the one thing
that fails QA as written.**

| Step | Was | Now |
| --- | --- | --- |
| D1 `npm test` | 15 files / 119 | **21 files / 209** |
| D2 file list | 10 `src` + 5 `acceptance` | 10 `src` + 5 `acceptance` + **6 `scripts/crap/*.spec.ts`** |
| D2a `npx vitest run src` | 10 / 54 | **10 / 54, the floor, intact** |
| D2b `npx vitest run acceptance` | 5 / 65 | **5 / 65, intact** |
| new D2c `npx vitest run scripts` | - | 6 / 90 |
| D8, D9, D5 | 6 / 60, 7 / 92, 24 | unchanged |

54 + 65 + 90 = 209, so D1 stays exhaustively split and a lost case is still attributable to a
half. D10's point holds too: no `property/` or `hardening/` file is in the unit run, and no
`scripts/` spec is in D8 or D9.

**What I verified**

- `npx tsc --noEmit` exits 0 with no output; `npx tsc --version` is 5.9.3.
- `npm test` 21 files / 209 tests, 0 failing, 0 skipped. `npx vitest run src` **10 / 54**.
  `npx vitest run acceptance` 5 / 65. `npx vitest run scripts` 6 / 90.
  `npm run test:property` 6 / 60. `npm run test:hardening` 7 / 92.
- `npm run test:acceptance`: 5 features parse, 5 entry points generate, **24 scenario executions
  pass**. The generated entry points and metadata are **byte-identical** to the tree's previous
  output (`diff -r` against a copy taken before I started), implementation hashes included.
- `npm run build` exits 0 and emits `index-BPxiUVWS.js` and `index-xAQXB6NR.css` - the same
  content hashes every role since the first Cleaner pass has recorded.
- **CRAP.** `node scripts/crap.mjs`: 39 files, 213 functions, 2 over the gate, both dispositioned
  above. `node scripts/crap.mjs scripts` (what this pass changed): **6 files, 48 functions, 0 over
  the gate**, every one at 100% statement coverage, worst are `readOptions` and `contains` at 6.0 -
  one `cond` over the argument list, and one boolean answering whether a span holds a position. `node scripts/crap.mjs acceptance`: 7 files, 71 functions, 0 over.
  Merged statement coverage: `scripts/crap` **127/127**, `acceptance` 190/190, `src` 156/196.
- `react-scripts` count is 0 in `package.json`, `package-lock.json` and `src`.
- E1 and E3 still hold: `git status --porcelain --ignored` shows `bin/`, `build/`, `coverage/`,
  `dist/`, `node_modules/` ignored with nothing untracked-but-unignored except the source I added
  by hand; the README's `Available Scripts` headings and `npm run` are still the same set of eight.
- `git status --short` is `README.md`, `scripts/crap.mjs`, `vite.config.ts`, `vitest.coverage.ts`
  and the new `scripts/crap/`. `git status --short src features qa` is empty.
- I ran no mutation tooling of any kind and applied no Gherkin mutation. The mixed-job hint is
  what drove the split above; `scripts/mutation.ts`'s tier hash is untouched, so the Hardener's
  manifest is still reusable as it stands.

**Left for the next role**

- **Architect.** `scripts/crap/` is a second package with a core/shell split and nothing enforces
  it: a `node:fs` import into `score.ts` would pass every check in the tree. `acceptance/layering.ts`
  already takes a rules map per package and `layering.spec.ts` already walks a directory, so the
  shape exists. The dependency question I did not settle: `projectRoot` is now derived identically
  in `acceptance/project-files.ts` and in `scripts/crap.mjs`, and collapsing that would make a
  generic tool depend on the APS package for a path constant.
- **Hardener.** The core is mutable now and it is the instrument the gate depends on - your
  finding 4. Adding `scripts/crap/*.ts` to `stryker.config.json`'s `mutate` and a
  `{ directory: 'scripts', suffix: '.spec.ts' }` entry to `mutationTierTests` is the whole wiring;
  I did neither, because the manifest and the runs are yours and my brief bars mutation runs. Note
  that adding the tier entry moves `scripts/mutation.ts`'s tier hash and so forces one full run,
  which is the mechanism working.
- **QA.** Procedure D's counts above are the only thing in `qa/` that this pass moves. Nothing
  else in either QA file is affected: no script was added or renamed, no command changed, and
  `node scripts/crap.mjs` is still the file E4 looks for.
- Everything earlier roles left standing still stands: the Vitest isolation hint, the third-party
  lightningcss warning from `todomvc-app-css`, CI wiring for the six test commands (task 06), the
  missing Playwright driver for `qa/todo-app-regression.md`, and the `console.log` in
  `src/reducers/apis.ts` (task 06 by PM ruling).

**Open questions**

1. **Do the crap specs belong in the unit tier, given that puts them in procedure D?** I put them
   there because they are unit tests and the unit tier is where unit tests live - the same
   reasoning that put `acceptance/*.spec.ts` there. The alternative was `hardening/`, whose count
   procedure D explicitly permits a handoff note to move, but that would file example-based unit
   tests under a tier that means "written against surviving mutants" and would tread on the
   Hardener's tier to dodge a Markdown edit. If the PM would rather not spend a Specifier pass,
   the fix is a D2c row and three numbers, not a different home for the tests.
2. **Nothing measures `hardening/` or `property/` themselves**, and one of them contains real
   logic - `layering.spec.ts` aside, the hardening files assert against helpers they define
   locally. This is the same argument ruling 3 made about `scripts/crap.mjs`, one level up, and I
   did not act on it: test code judged by no other test is where the regress has to stop, and the
   tiers do read each other's sources through the mutation tier. Recorded in case a later task
   disagrees.

#### Fourth pass: the production-build fix, cleaned

Done. Six files changed, all under `acceptance/`, all touched by the Coder's fourth pass. Nothing
committed. `features/`, `qa/`, `e2e/`, `src/`, `.mutation/` and every config are untouched, and no
test count moved.

**What I changed**

`acceptance/commands.ts` - the environment parameter is now overrides, not a whole environment:

- `runCommand(command, args, environmentOverrides = {})` merges what a caller names onto
  `process.env` itself. The caller was spreading `process.env` and appending one key, so the
  knowledge that a child process has to inherit the parent environment lived at the call site,
  where the next caller would have had to rediscover it. Now a caller states only what differs.
  The two `tsc` calls pass nothing and are unaffected: `env: process.env` became a copy of it.
- `executable(name)` names the `node_modules/.bin` convention that `typescriptCompiler` and
  `viteBundler` each spelled out.

`acceptance/fixtures.ts`:

- `bundleForProduction` -> `runProductionBuild`. Two functions a line apart called
  `bundleForProduction` and `buildForProduction` differ by one synonym and read as the same thing;
  the names now say what each does - one runs the build, the other ensures it has been run once.
- The call is one line again now that it names only `NODE_ENV`.
- The comment keeps the `NODE_ENV`-not-`mode` fact the PM ruling asked to outlive this task, and
  drops the sentence about the build getting a process of its own, which `runCommand` now says.

`acceptance/steps.ts` - the new handler names what it fetched:

```ts
const bundle = await requestPath(scriptReferencedByResponse(world))
responseContains(bundle, marker)
```

`acceptance/assertions.ts` - `scriptReferencedByResponse` moved up beside
`assetsReferencedByResponse`. Both answer "what does the observed index page reference"; they were
separated by `statusIs`. A pure move, no edit to either function.

Test readability:

- `acceptance/assertions.spec.ts`: `responseOf(body)` builds the `Response` the three
  `responseContains` cases each spelled out as an object literal, and `served` is now built from
  it; the index page moved into a named `indexPage` so the first assertion is one line instead of a
  four-line nested literal.
- `acceptance/inspection.spec.ts`: the module-scope `page` the Coder hoisted is now `indexPage`,
  matching what it is and what the other spec calls it.

**What I did not change, and why**

- **The command-failure judgment stays duplicated between `compilationSucceeded` and
  `runProductionBuild`.** Both decide "non-zero exit is a failure; report the code and the output",
  and lifting the shape into one judgment was the obvious DRY move. It is the wrong one: one is a
  step assertion the scenario makes about a compiler the scenario ran, the other is a fixture
  refusing to continue because the world could not be built. Same shape, different knowledge, and
  merging them would route a setup failure through the assertions module. Recorded so it is not
  rediscovered as an oversight.
- **`CommandResult` (`commands.ts`) and `Compilation` (`assertions.ts`) stay as two names for
  `{ code, output }`,** for the same reason: one is what a runner returns, the other is what the
  world recorded. `steps.ts` assigning one to the other is structural typing doing its job.
- **`fixtures.ts` was not split.** It runs the servers, the production build, the client that talks
  to whichever server is current, and the teardown. The client half is the only candidate, and it
  reads `currentBaseUrl`, module-private mutable state; splitting it would mean exporting an
  accessor for that state, which widens shared mutable state rather than reducing it. One job:
  the world a scenario runs in - start it, address it, talk to it, tear it down.
- **`startDevServer` and `startPreviewServer` remain near-duplicates.** Pre-existing, deliberately
  left by the first Cleaner pass, and not touched by the pass I am cleaning after.

**What I verified**

Every number below was read off a command I ran.

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | exit 0, no output |
| `npm test` | 23 files / 224 tests, 0 failing, 0 skipped |
| `npx vitest run src` | **10 / 54 - the D2a floor, untouched** |
| `npx vitest run acceptance` | 5 / 59 |
| `npx vitest run scripts` | 8 / 111 |
| `npm run test:property` | 11 / 95 |
| `npm run test:hardening` | 12 / 128 |
| `npm run test:acceptance` | 5 features parse, 5 entry points generate, **26 scenario executions pass** |
| `npm run build` | exit 0, `dist/assets/index-BPxiUVWS.js` 167.06 kB |

- **No count moved.** 23 / 224 with 54 + 59 + 111 = 224 and 10 + 5 + 8 = 23 are exactly the figures
  the Coder's fourth pass recorded, so QA procedure D needs nothing from me. Procedure D as the tree
  holds it is still stale by that pass's table (D1 22->23, D2 gains `acceptance/assertions.spec.ts`,
  D2b 4/49 -> 5/59, D5 24->26); that is the deferred Specifier reconciliation, not mine.
- **The refactor of the environment plumbing was checked in the failing direction, not just the
  passing one.** With `{ NODE_ENV: 'production' }` changed by hand to `'test'` and the
  production-build entry point run alone, exactly `production build 4/example_1` and `example_2` go
  red on the missing markers, with the file's other five executions passing; restoring it returns
  the file to 7 passing and the tier to 26. So the override is being applied by the merge, and the
  scenario still discriminates on the artifact.
- The artifact the acceptance tier leaves in `dist/` is **md5-identical** to what `npm run build`
  produces (`e432ae91...` / `1cba6aae...` / `43022ca5...`), 167,067 bytes, `Minified React error`
  count 1, `src/index.tsx` count 0 in `dist/index.html`. QA C3, C3a and C3b read true.
- Merged coverage over the two changed core modules is complete: `acceptance/assertions.ts` and
  `acceptance/inspection.ts` have **zero uncovered statements** across the unit, property and
  hardening tiers.
- `git status --short` shows exactly the six `acceptance/` files. `git status --porcelain --ignored`
  lists `bin/ build/ coverage/ dist/ node_modules/` as `!!` and nothing as `??`, so QA E1 still reads
  true.
- I ran no mutation of any kind and no Gherkin mutation, and I did not run the parser or dry checker
  beyond what `npm run test:acceptance` does - no feature file changed.

**CRAP**

`node scripts/crap.mjs` (fresh coverage, unit + property + hardening merged): 40 files, 222
functions, **2 over the gate**. Both are pre-existing `src/` application code, unchanged by this
task, and the changed-file run is clean.

| Function | cc | cov | CRAP | Disposition |
| --- | --- | --- | --- | --- |
| `src/middlewares/callapimiddleware.ts:18` | 5 | 0% | 30.0 | Coverage, not complexity. Task 01's Out of scope bars changing the API middleware, and the D2a floor (10 files / 54 cases) bars adding a `src` spec. Measured and left, as in every earlier pass. |
| `src/reducers/apis.ts:4` `executing` | 13 | 100% | 13.0 | **CRAP exception applied and recorded**, per the shared definitions and the ruling on the CRAP correction: a single `switch` on `action?.type` answering one question. Splitting it would produce helpers taking a discriminant the caller already had. |

- Changed files that the gate measures - `acceptance/assertions.ts`, `acceptance/inspection.ts`:
  **30 functions, 0 over the gate.** The other four changed files are adapter shells and stay
  excluded from the coverage include, per the shared definition.
- The whole `acceptance` package: 56 functions, 0 over the gate, unchanged by this pass.

**Mixed-job hint**

Applied by reading the five changed sources and counting the jobs each does; my brief bars mutation
runs, so no scan tool was invoked, which is how the earlier Cleaner passes discharged it and what the
PM accepted. `assertions.ts` decides whether an observation satisfies a step; `inspection.ts` reads
facts out of project text; `commands.ts` runs a project executable and reports its code and output;
`steps.ts` is wiring; `fixtures.ts` is the world a scenario runs in, argued above. One job each, so
nothing was split. The Coder's pass added no job to any of them - `buildForProduction` was already in
`fixtures.ts`; only its mechanism moved.

**Left for the Architect**

- Nothing is routed. `scripts/architecture/layering.spec.ts` and `packages.spec.ts` still pass:
  no module was added, removed or renamed, and no import crossed a layer. `commands.ts` and
  `fixtures.ts` are both shell, so the import between them was already legal and still is.

**Left for the Hardener**

- `.mutation/` is untouched, and the two staleness items the Coder recorded are still exactly as
  handed over: `.mutation/gherkin/production-build.manifest` keys reuse on an `implementation_hash`
  that `steps.ts` has moved, and `.mutation/test-tier.json`'s `tier_hash` predates
  `acceptance/assertions.spec.ts`. My changes move the same two hashes again and add no third.
- New core surface to mutate is unchanged from the Coder's list - `referencedScripts`,
  `scriptReferencedByResponse`, `responseContains`. I moved `scriptReferencedByResponse` within its
  file and edited neither its body nor any message text, so nothing the hardening tier asserts moved;
  the tier is green untouched at 12 / 128.
- `runCommand`'s third parameter is now merged rather than substituted. A mutant that empties the
  override object should be killed by `production build 4`, which is the only caller that passes one.

**Left for the Specifier's reconciliation pass and QA**

- **No count moved in this pass.** The reconciliation still owed is the Coder's fourth-pass table,
  unchanged: D1 23 files / 224, D2 gains `acceptance/assertions.spec.ts` as a fifth `acceptance/`
  file, D2b 5 / 59, D2c's sums 54 + 59 + 111 = 224 and 10 + 5 + 8 = 23, D5 26. `e2e/toolchain-commands.spec.ts`
  carries the same numbers as literals and I did not touch `e2e/`.

**Open questions**

None.

### Project manager rulings on the Cleaner handoff

Verified independently: `npx tsc --noEmit` exits 0, `npm test` passes 13 files / 99 tests,
`npx vitest run src` holds the D2a floor at 10 files / 54 tests, `npm run test:acceptance`
passes 21 scenario executions, and `src/`, `features/` and `qa/` are all untouched. Accepted.

The NUL-byte finding is confirmed and was worth catching: the committed `acceptance/generator.ts`
contained 2 literal NUL bytes, so git classified it as binary and the file had no reviewable diff
in its own commit. The replacement contains none and reads as text.

The two items the Cleaner routed are settled as follows.

1. **QA procedure D's totals are refreshed once, after the Hardener, before QA.** They are stale
   again (99 total, acceptance half 45), and the Hardener will move them again by design. Procedure
   D already permits this: D2a is the hard floor and is intact at 10 / 54, D2's file list is intact,
   and D's own fail clause allows a D2b change that a handoff note records, which this one does.
   Refreshing after every role that adds tests is churn that buys nothing, so a single fresh
   Specifier pass runs between the Hardener and QA to reconcile D1, D2 and D2b against the tree.
   No role before then should edit `qa/`, and no role should adjust its own test count to match a
   stale procedure.

2. **The stray `console.log` in `src/reducers/apis.ts` is assigned to task 06.** The Cleaner was
   right that it is out of task 01's scope and that no task claimed it. `tasks/06-lint-typecheck-ci.md`
   is amended to name it as an authorized removal, because `no-console` is exactly what that task's
   rule set will flag. It stays in place until then.

Also noted: the Cleaner's removal of the dead `resolutions` and `browserslist` keys means
`tasks/03-react-19.md` no longer has a `resolutions` pin to remove. That task file is amended.


### Architect

Done. Boundary rules and the property tier. `src/`, `features/` and `qa/` untouched; nothing committed.

**What I changed**

Dependency rule, made checkable:

- `acceptance/layering.ts` (new, pure) declares which acceptance modules are **core**
  (`generator`, `inspection`, `layering`, `layout`, `runtime`) and which are **shell**
  (`commands`, `fixtures`, `generate-entrypoints`, `project-files`, `steps`), plus the pure
  dependencies a core module may import (`node:crypto`, `node:path`). `layerViolations` and
  `importCycles` evaluate an import graph against that map; both are data in, strings out.
- `acceptance/layering.spec.ts` reads the package with the TypeScript compiler API and asserts
  zero violations and zero cycles. It fails on: a core module importing a shell module, a core
  module importing an impure dependency, any module importing outside the package, an
  undeclared module, and a declared module that no longer exists - so adding a file to
  `acceptance/` forces a core-or-shell decision rather than silently landing on either side.
  It also asserts no module under `src/` imports anything outside `src/`, which is the other
  half of the same rule: the application does not depend on its own test pipeline.
- The rules were already satisfied; nothing had to move to make them pass. The check is the
  intent written down. Verified it bites: adding `import { readFileSync } from 'node:fs'` to
  `runtime.ts` turns it red with `core module runtime.ts imports node:fs, which is not a pure
  dependency`.

Information hiding - one owner for the pipeline's path convention:

- `acceptance/layout.ts` (new, pure) owns `features/`, `build/acceptance/ir`,
  `build/acceptance/generated`, `metadata/`, the `.feature` -> `.json` -> `.acceptance.ts`
  name chain, and the glob the acceptance runner includes.
- That knowledge was in three places. `scripts/acceptance.ts` spelled out the directories and
  built `<slug>.json` from a feature name; `acceptance/generator.ts` reversed the same
  convention with an inline `` `features/${slug}.feature` ``; `vitest.acceptance.config.ts`
  restated the generated-file glob. The two halves of a round trip were separately written
  in a shell module and a core module, so nested feature directories would have recorded a
  wrong `feature_path` from one side while the other side kept working. All three now read
  the convention from `layout.ts`, and a property test asserts the round trip closes.
- `scripts/acceptance.ts` also recomputed `projectRoot` instead of importing the one
  `acceptance/project-files.ts` already exports. It imports it now.
- The APS generator command takes exactly two arguments, so the generator genuinely cannot be
  told its feature path and must recover it from the IR slug. `layout.ts` names that constraint
  where the code depends on it.

Property tests (`npm run test:property`, PLAN section 4's tier and its named tool):

- `fast-check@4.9.0` added as a devDependency, `vitest.property.config.ts` added, and
  `property/` holds **6 files, 60 properties**. Files run only under the property command; the
  unit tier's `include` is untouched, and `property/` is outside the coverage `include`, so no
  CRAP number moves because of them.
- Pipeline core: `expandScenarios` (one execution per row, background prepended to every one,
  one-based naming in written order), `resolveArgument` (the value comes back exactly, a value
  that looks like a placeholder is not rescanned, non-placeholders pass through, a missing name
  is named in the error), `matchStep` (single match, ambiguity, unsupported), `runExecution`
  (every step once, in order, arguments resolved), `implementationHash` (order-independent,
  changes on any rewrite or rename), `metadataFileName` (shape and case-insensitivity),
  `relativeImportPath` (resolves back to the target; never reads as a package),
  `entrypointSource` (deterministic, escaped literals, never names the `.feature` file),
  `featureArtifacts` (hash covers exactly the emitted entry point, paths stay
  working-directory-relative, metadata parses back), and the feature/IR round trip.
- Application core, which had the worst coverage in the tree: `todos.ts` (append-with-a-fresh-id,
  ids never reused, delete is idempotent, edit and complete touch one todo, complete-all makes
  every todo agree on the opposite of what they agreed on, clear-completed keeps the active ones
  in order, and the four `*_SUCCESS` results), `apis.ts` (a request marks, either answer clears,
  one todo's mark does not disturb another's, unhandled actions return the same state),
  `selectors` (SHOW_ALL is the list itself, the two filters partition it, order is preserved,
  an unknown filter is refused, asking twice gives the same answer).
- `README.md` documents the new command.

**What I verified**

- `npx tsc --noEmit` exits 0 with no output.
- `npm test`: **15 files, 119 tests**, 0 failing, 0 skipped. `npx vitest run src`: **10 files,
  54 tests** - the Specifier's D2a floor, untouched. `npx vitest run acceptance`: **5 files,
  65 tests** (was 3 / 45).
- `npm run test:property`: 6 files, 60 properties. Ran the tier **20 times** (2000 random cases
  per property) with no failure. One property was flaky when written - it looked a scenario up
  by name, and fast-check found a feature with two scenarios of the same name; it is positional
  now. That was a defect in my test, not in `expandScenarios`.
- `npm run test:acceptance` from the existing tree: 5 features parse, 5 entry points generate,
  **21 scenario executions pass**. The generated entry points and metadata are **byte-identical**
  to the Cleaner's output (`diff -r` against a copy taken before I started), implementation
  hashes included, so the layout refactor changed no artifact.
- `npm run build` exits 0 and emits the same content hashes as the Cleaner recorded
  (`index-BPxiUVWS.js`, `index-xAQXB6NR.css`). `npm ci` from the regenerated lockfile exits 0.
- `node scripts/crap.mjs acceptance`: 5 files, **50 functions, 0 over the gate**; the core
  modules are at 100% statement coverage and the worst function is `resolveArgument` at 4.0.
- `git status --short src features qa` is empty.

**The gate reads one tier, and that now understates the application core**

`node scripts/crap.mjs` still reports the same 5 functions over the gate that the Cleaner
recorded, because it runs the unit tier and the property tier is a separate command. Measured
against property-tier coverage instead, the same functions read:

| Function | CRAP on unit coverage | CRAP on property coverage |
| --- | --- | --- |
| `src/reducers/apis.ts` `executing` | 182.0 | 13.0 (100% covered; cc 13 is the single `switch` the exception permits) |
| `src/reducers/apis.ts` `errorMessage` | 20.0 | 4.0 |
| `src/selectors/index.ts` `getVisibleTodos` | 20.0 | 4.0 |
| `src/reducers/todos.ts` `todoApiResults` | 12.4 | 5.0 |
| `src/middlewares/callapimiddleware.ts` | 30.0 | 30.0 - untouched, it is IO |

The code is tested; the gate cannot see it. Merging the tiers is a change to `scripts/crap.mjs`,
whose shape PLAN section 4 gives to the Cleaner and whose numbers later tasks are measured
against, so I left the tool alone and recorded the measurement. See open question 1.

**Findings I did not fix, and who owns them**

1. **`src/selectors/index.ts` and `src/middlewares/callapimiddleware.ts` import `RootState`
   from `src/containers/index.ts`.** Domain policy and an IO adapter both depend on the UI
   container barrel; the arrow points outward. `tasks/04-hooks-replace-connect.md` already owns
   it - its scope derives `RootState` from the root reducer and deletes `src/containers/` - so
   the fix belongs there and the boundary check is scoped to `acceptance/` and to "src imports
   nothing outside src", which passes today. When task 04 lands, extend the layer map to `src/`.
2. **The UI re-walks facts the domain already knows.** `containers/MainSection.ts` passes
   `todosCount` and `completedCount`, and `components/MainSection.tsx` derives
   `activeCount = todosCount - completedCount` and "all complete" as
   `completedCount === todosCount`. `reducers/todos.ts` answers the same "are they all marked?"
   question itself, for `COMPLETE_ALL_TODOS`. No selector owns either observable. Task 04 is
   where components start asking for what they need; that is the moment to add the selectors.
   Task 01's Out of scope bars me from all of it.
3. **`errorMessage`'s state parameter is inferred `null`** from its `state = null` default, so
   the reducer's own signature says it can never be handed back the message it just stored.
   `property/apis.property.ts` carries one cast and a comment for it. Task 06 or whoever types
   the store; it is a type defect, not a behavior one.
4. **`implementationHash` hashes `` `${path}\0${content}\0` ``.** A generated file whose content
   contained a NUL byte could collide with a two-file set. Unreachable for generated TypeScript,
   and any fix changes every recorded hash, so I left it. Worth knowing before the format is
   reused for something with arbitrary content.
5. `resolveArgument` and `matchStep` are exported but used in production only by `runExecution`.
   I judged them part of the runtime contract the APS spec names, not accidental API, and the
   property tests exercise them directly. Left as they are.

**Left for the next role**

- **Test counts moved, as procedure D permits when a handoff records it: D1 -> 15 files /
  119 tests, D2's list gains `acceptance/layering.spec.ts` and `acceptance/layout.spec.ts`,
  D2b -> 5 files / 65 tests. D2a is unchanged at 10 / 54 and D2's real point still holds - no
  generated file appears in the unit run.** This is the record the PM's ruling asks for; the
  Specifier pass scheduled between the Hardener and QA reconciles it.
- **`test:property` is a new npm script.** `toolchain dependencies 2` asserts only that the
  scripts it lists exist, so it stays green, and PM ruling 3 was about `typecheck`, which task 06
  owns. This one is PLAN section 4's own tier and `tasks/04-hooks-replace-connect.md` already
  requires it in its done criteria. The same Specifier pass should add a `test:property` row to
  `toolchain dependencies 2` and name it in QA step E3, which currently lists five commands.
- Hardener: `acceptance/steps.ts` is still the one place a wrong assertion goes unnoticed by
  anything but the acceptance tier, and it is excluded from coverage as wiring. The property
  tier runs on fast-check's default random seed and prints the seed and the shrunk counterexample
  on failure; if a run ever goes red, reproduce with that seed before changing anything.
- Everything earlier roles left standing still stands: the Vitest isolation hint, the
  third-party lightningcss warning, CI wiring for `test:acceptance` (task 06), the missing
  Playwright driver for `qa/todo-app-regression.md`, and the `console.log` in `src/reducers/apis.ts`
  (task 06 by PM ruling; the property tier silences it locally rather than working around it).

**Open questions**

1. **Should `scripts/crap.mjs` merge coverage across tiers?** As it stands the gate reports 182.0
   for a function the property tier covers completely, which invites either a false alarm or a
   habit of ignoring the number. Merging is a change to the Cleaner's tool and to the baseline
   later tasks are measured against, so I did not make it.
2. **Does the `RootState` relocation wait for task 04?** I assumed yes, on the precedent of the
   `console.log` ruling: it is a real dependency-direction violation, but task 04's scope names
   the fix, and moving a type out of `src/containers/` now would collide with the task that
   deletes that directory. If task 01's Architect was meant to take it, say so and it is a
   type-only move with no behavior change.

#### Second pass: `scripts/crap/` brought under the boundary rule, and the rule given a home

Done. The boundary check governs three packages instead of one, the core/shell decision has a
single owner, and the property tier reaches the gate's own core. `src/`, `features/` and `qa/`
untouched; nothing committed; no npm script and no dependency added.

**The routed item, and why it moved a file to close it**

`scripts/crap/` had a core/shell split nobody could break loudly: a `node:fs` import into
`score.ts` passed every check in the tree. The machinery to catch it was `acceptance/layering.ts`,
which already takes a rules map per package. But that module is not an acceptance-pipeline part -
`PLAN.md` section 4 says `acceptance/` holds "entrypoint generator, runtime, step handlers, runner
adapter", and `layering.spec.ts`'s own header admitted it was parked there for want of a home
("this package is the only non-application code the unit tier collects, so they live here"), which
stopped being true the moment `scripts/crap/` existed. Leaving it would have made the APS package
either declare the CRAP gate's internals or be imported by the CRAP gate's tests, and the Cleaner
routed me the second of those specifically to avoid.

So the checker is its own package now, governing from outside every package it governs:

| Module | Its one job |
| --- | --- |
| `scripts/architecture/layering.ts` | whether an import graph obeys a layer map (moved, engine unchanged) |
| `scripts/architecture/packages.ts` | which directories are packages, and each one's layer map |
| `scripts/architecture/layering.spec.ts` | the engine, on graphs written by hand (moved) |
| `scripts/architecture/packages.spec.ts` | the engine over the real tree, per declared package |

`scripts/architecture/` rather than a new top-level directory, because `scripts/**/*.spec.ts` is
already in the unit tier's `include`, `scripts/**/*.ts` is already in the coverage `include`, and
`scripts` is already a QA attribution bucket. The move therefore needed no config glob and adds no
fourth `npx vitest run <dir>` command. See open question 1.

**What each package now declares, and what the check refuses**

- `acceptance` - the same map as before, minus `layering.ts`, which is no longer in the package.
- `scripts/crap` - all six modules core; `node:path` and `typescript` are the pure dependencies.
  `typescript` is pure as these modules use it: text in, AST out, never `ts.sys`. The package's
  only shell is `scripts/crap.mjs`, which sits outside the directory.
- `scripts/architecture` - both modules core, no pure externals at all. The checker is held to the
  rule it enforces; reading the tree is the spec's job.

The rules were already satisfied - nothing had to move to make them pass, which is what
"behaviour-preserving" means here. Verified each refusal bites by breaking it and putting it back:

| Break | What fails |
| --- | --- |
| `import { readFileSync } from 'node:fs'` in `scripts/crap/score.ts` | `core module score.ts imports node:fs, which is not a pure dependency` |
| a new `scripts/crap/stray.ts` | `stray.ts is not declared in the layer map` |
| `scripts/crap/tiers.ts` importing `../../acceptance/project-files.ts` | `tiers.ts imports ../../acceptance/project-files.ts, which leaves the package` |
| a core module added to the coverage `exclude` by hand | `leaves no core module out of the report` |

**One owner for the core/shell decision, which was written down three times**

`acceptanceRules.layers`, `vitest.coverage.ts`'s `exclude` and `stryker.config.json`'s `mutate`
each restated which modules are shells and which are core. They agreed, and nothing made them.

`vitest.coverage.ts` now spreads `modulesIn('shell')` into its exclude and lists only the shells
that belong to no package (the browser entry point, the test setup, the three CLI wrappers under
`scripts/`). A module inside a package is declared a shell once, in its layer map, and both the
boundary check and the CRAP gate follow - and `packages.spec.ts` makes every module in a declared
directory pick a side, so a new one cannot land in the gate by being forgotten.

The third copy, Stryker's `mutate`, is JSON and cannot import the list, and it is the Hardener's
file. I repointed the entry I moved and left the rest alone; see the routing below. What I did add
is the assertion the derivation cannot make for itself: **no core module is excluded from the
gate**. The shell direction is now true by construction, so the direction worth checking is a core
module someone excludes by hand, which would be a module nothing scores.

**Property tests: the gate's own core had none**

`npm run test:property` goes from 6 files / 60 properties to **11 / 95**. The five new files cover
the two packages that no property tier reached, which is where the coverage assessment pointed -
`scripts/crap/*` had 100% statement coverage from examples only, and it is the instrument every
later task is measured by.

- `property/layering.property.ts` (10) - a graph in which every import runs shell -> core has no
  faults; a core module importing a shell, or an impure dependency, is always reported; a shell may
  import anything that is not a member; a relative import that climbs out is reported from either
  layer; map and package must agree in both directions. Cycles: a ring of *n* modules is reported
  once and names all *n*; a forward-only graph reports nothing; a specifier that is not a member
  never closes a cycle.
- `property/complexity.property.ts` (5) - one per decision form, over all fifteen: the module scope
  is one plus the decisions outside any function; a function is one plus the decisions it holds; a
  callback is charged its own, so the function it is passed to keeps none; nothing scores below
  one; a function is reported at the line it starts on.
- `property/coverage.property.ts` (5) - conservation (merged hits are the sum, whatever id each
  tier gave the statement), reached-anywhere is reached, order independence, a single report comes
  back unchanged one statement per location, and the file list is the union.
- `property/score.property.ts` (6) - the formula itself; fully covered scores exactly `cc` and
  untouched exactly `cc^2 + cc`; covering one more statement never scores worse; a function holding
  no measured statement is covered; a statement is charged to the innermost function containing it.
- `property/options.property.ts` (9) - flags read the same wherever they appear among the paths,
  `--max` likewise; a non-number and an unknown option are refused by name; trailing slashes do not
  change a path; `isGated` gates everything when nothing was named, gates a directory and what is
  under it, and does not gate a sibling that merely shares a prefix.

**That they bite, checked by hand rather than argued.** Each of these turns its file red and goes
back green when restored: `(1 - coverage) ** 3` -> `** 2`; dropping the `+ merged.get(key).hits`
from the merge; `/\/+$/` -> `/\/$/` in the path trim; dropping `QuestionQuestionToken` from the
short-circuit set; dropping the `rules.layers[module] === 'core'` guard from `memberFault`.

**One property was flaky when written, and it was my test.** `charges a callback its own decisions`
generated the function name `do`, which is not an identifier, so the source did not parse and the
function was not found. The generator now emits a trailing digit. Ran the tier **20 times** after
the fix with no failure.

**What I verified**

- `npx tsc --noEmit` exits 0 with no output.
- `npm test` **22 files / 214 tests**, 0 failing, 0 skipped. `npx vitest run src` **10 files / 54
  tests - the D2a floor, intact**. `npx vitest run acceptance` 4 / 49. `npx vitest run scripts`
  8 / 111. 54 + 49 + 111 = 214, so D1 is still exhaustively split across the three buckets.
- `npm run test:property` 11 / 95. `npm run test:hardening` 7 / 92, unchanged.
- `npm run test:acceptance`: 5 features parse, 5 entry points generate, **24 scenario executions
  pass**. The generated entry points and metadata are **byte-identical** to what was in the tree
  before I started (`diff -r` against a copy), implementation hashes included.
- `npm run build` exits 0 and emits `index-BPxiUVWS.js` and `index-xAQXB6NR.css` - the same content
  hashes every role since the first Cleaner pass has recorded. Config now imports a package module,
  so this was worth checking rather than assuming.
- **CRAP.** `node scripts/crap.mjs scripts` (what this pass changed): 8 files, 72 functions, **0
  over the gate**, every function at 100% statement coverage. `node scripts/crap.mjs acceptance`:
  6 files, 52 functions, 0 over. `node scripts/crap.mjs` whole project: 40 files, 218 functions,
  **2 over the gate**, the same two as every pass since the Cleaner's merge - `src/reducers/apis.ts`
  `executing` at 13.0 and `src/middlewares/callapimiddleware.ts` at 30.0. Both are pre-existing
  `src/` code this task's Out of scope bars me from. **I am applying the CRAP exception to
  `executing` and recording that I did**: one flat `switch` answering one question, at 100%
  coverage, so its 13.0 is cc alone. The other is IO at 0% coverage.
- `git status --short src features qa` is empty. `git status --porcelain --ignored` shows `bin/`,
  `build/`, `coverage/`, `dist/`, `node_modules/` ignored and nothing untracked-but-unignored
  except the sources I added. `.mutation/` is unmodified: I ran no mutation tooling of any kind.
- No dependency added, so no lockfile change and no `npm ci` needed.

**Test counts moved. The Specifier pass scheduled before QA reconciles them.**

| Step | As the Cleaner's third pass left it | Now |
| --- | --- | --- |
| D1 `npm test` | 21 files / 209 | **22 files / 214** |
| D2 file list | 10 `src` + 5 `acceptance` + 6 `scripts/crap` | 10 `src` + **4** `acceptance` + **8** `scripts` |
| D2a `npx vitest run src` | 10 / 54 | **10 / 54, the floor, intact** |
| D2b `npx vitest run acceptance` | 5 / 65 | **4 / 49** |
| D2c `npx vitest run scripts` | 6 / 90 | **8 / 111** |
| D8 `npm run test:property` | 6 / 60 | **11 / 95** |
| D5, D9, D10 | 24, 7 / 92, tiers separate | unchanged |

**D2b drops by 16 and that is a move, not a loss.** `acceptance/layering.spec.ts` (16 cases) is now
`scripts/architecture/layering.spec.ts` (13) plus `scripts/architecture/packages.spec.ts` (8); the
`scripts` half gains those 21 and nothing was deleted. D2's list needs both moves and the two new
file names. D10's point still holds: no `property/` or `hardening/` file is in the unit run.

**Left for the Hardener**

- **Read this before running mutation.** `stryker.config.json` now names
  `scripts/architecture/layering.ts` and `scripts/architecture/packages.ts` in `mutate`, where
  `acceptance/layering.ts` used to be, but `vitest.mutation.config.ts`'s `mutationTierTests` still
  lists only `acceptance` / `hardening` / `property`. Their unit specs are in `scripts/`, so until
  you add the `{ directory: 'scripts', suffix: '.spec.ts' }` entry the PM already routed to you,
  those two files' mutants are judged by the hardening and property tiers only - `importCycles` is
  covered by both, `layerViolations` and `modulesIn` by the property tier and the unit spec. Add
  the entry in the same pass as `scripts/crap/*.ts`, and it is one full run for both.
- The manifest: the moved file changes path, so its recorded results are orphaned and it re-runs.
  I hand-edited nothing under `.mutation/` and ran no mutation. The two
  `// Stryker disable next-line` waivers in `importCycles` moved with the file, text unchanged.
- If you want the core list to have one owner the way the shell list now does,
  `scripts/mutation.ts` already spawns Stryker and could pass `--mutate` from
  `modulesIn('core')`, which would delete the `mutate` array from the JSON. I did not do it: it is
  your file, and it changes which files are mutated in the same pass that you are widening them.

**Left for the Specifier pass before QA**

- The counts table above, and D2's file list. Nothing else in `qa/` is affected: no script was
  added or renamed, no command changed, `node scripts/crap.mjs` is still the file E4 looks for,
  and `README.md` still documents exactly the eight scripts `package.json` declares (E3 holds -
  I edited prose inside existing sections and added no `###` heading).

**Left for QA**

- Nothing new. The boundary rules run inside `npm test`, so procedure D covers them already.

**Findings I did not fix, and who owns them**

1. **`src/selectors/index.ts` and `src/middlewares/callapimiddleware.ts` import `RootState` from
   `src/containers/index.ts`** - domain policy and an IO adapter depending on the UI barrel. Still
   true, still `tasks/04-hooks-replace-connect.md`'s, per the PM's ruling on the first Architect
   pass. The boundary check covers `src` only with "imports nothing outside `src`", which passes;
   when task 04 lands, `src` becomes a fourth entry in `PACKAGES` with a real layer map.
2. **The UI re-walks facts the domain already knows.** `components/MainSection.tsx` still derives
   `activeCount = todosCount - completedCount` and "all complete" as `completedCount === todosCount`
   from two counts the container passes, while `reducers/todos.ts` answers the same "are they all
   marked?" question itself for `COMPLETE_ALL_TODOS`, and no selector owns either observable. Task
   04, unchanged from the first pass.
3. **`projectRoot` is derived identically in `acceptance/project-files.ts` and `scripts/crap.mjs`,
   and I am deliberately not collapsing it** - this is the question the Cleaner routed to me. Two
   packages that must not depend on each other each deriving their own root from their own module
   URL is correct; sharing the constant would make the CRAP gate import the APS package for a
   path. That is now enforced rather than merely intended: the check refuses it, as the third row
   of the table above shows.
4. `resolveArgument`, `matchStep`, `metadataFileName`, `relativeImportPath` and friends are still
   exported and still used in production only by a sibling in their own file. I re-checked the
   whole export surface of all three packages for policy that only tests reach; there is none that
   an adapter reimplements. The first pass's disposition stands.

**Open questions**

1. **Is `scripts/architecture/` the right home?** `PLAN.md` section 4 fixes `features/`,
   `acceptance/`, `build/acceptance*/`, `qa/` and `.mutation/`, and names `scripts/crap.mjs`, but
   says nothing about where project self-checks live. I chose a package under `scripts/` because it
   needed no config glob and no fourth QA attribution bucket, and because `scripts/crap/` set the
   precedent for a tested core under `scripts/`. A top-level `architecture/` would read better and
   costs a line in `vite.config.ts`, one in `vitest.coverage.ts`, one in `tsconfig.json` and a new
   `D2d` step. Say the word and it is a rename.
2. **`vitest.coverage.ts` now imports `scripts/architecture/packages.ts`,** so a root config
   depends on a package module. I judged that the right direction - a config is a shell, and it is
   asking policy what the shells are rather than restating them - and the production build is
   unaffected (same content hashes). Recorded in case the project would rather keep root configs
   free of project imports, in which case the alternative is the assertion I deleted as
   tautological: keep the two lists apart and have a spec require they agree.

#### Third pass: one owner for the production build, and properties for the judgments that decide a step

Done. Four files changed and three added, all under `acceptance/` and `property/`. Nothing
committed. `src/`, `features/`, `qa/`, `e2e/`, `.mutation/` and every config are untouched, and no
npm script and no dependency was added.

**The dependency review found one thing to fix, and it was in the fixture this chain resumed for**

`acceptance/fixtures.ts` built the production bundle by running `node_modules/.bin/vite build`.
`package.json` declares `"build": "vite build"`. Two statements of how this project produces a
production bundle, agreeing by coincidence, with nothing making them agree - and the acceptance
tier is the one place where that coincidence is load-bearing. `production build 1-4` assert about
*the bundle this project ships*; the moment the declared build script gains a flag, an env prefix or
a different bundler, the tier would keep testing an artifact nobody deploys, and every scenario would
stay green while doing it. That is the same shape as the defect that reopened this task: a scenario
named for a distinction it can no longer detect.

The fixture now asks the owner instead of restating what it says:

```ts
const [command, ...args] = scriptArgv(readProjectFile('package.json'), 'build')
const { code, output } = await runCommand(executable(command), args, { NODE_ENV: 'production' })
```

- `scriptArgv(manifestText, name)` is new in `acceptance/inspection.ts` (core, pure): the argv of a
  script the manifest declares, refusing by name a script that is absent or declared as nothing to
  run. It shares a private `declaredScripts` parse with `availableScripts`, which had the same two
  lines. It knows one narrow thing - an npm script is a command and its arguments separated by
  whitespace - and the comment says so, because a script needing shell syntax would have to be read
  some other way.
- `executable` in `acceptance/commands.ts` is exported and `viteBundler` is gone. `typescriptCompiler`
  stays a constant: `tsc --noEmit` has no npm script to read it from, and PM ruling 3 bars adding one
  in this task, so the compiler steps must name the binary. The asymmetry is deliberate, not an
  oversight.
- Layers are unchanged. `fixtures.ts` is a shell importing a core (`inspection.ts`) and a shell
  (`project-files.ts`); no new module, no cycle, no import leaves the package.

**Verified in both directions, not just the green one**

| Check | Result |
| --- | --- |
| `npm run test:acceptance` | 5 features parse, 5 entry points generate, **26 scenario executions pass** |
| the artifact the tier leaves in `dist/` | md5 `e432ae91` / `1cba6aae` / `43022ca5`, 167,067 bytes - **identical to what the Cleaner recorded and to what `npm run build` emits** |
| `NODE_ENV` put back to `test` by hand | exactly `production build 4/example_1` and `example_2` redden on the missing markers, the file's other 5 pass; restored, 7 pass |
| `scripts.build` renamed to `bundle` by hand | all 7 executions of that file fail with `package.json declares no "build" script to run` |

The second of those is the one that says the refactor did what it claims. Before this pass, renaming
the build script would have changed nothing about how the tier builds; now the tier stops, because it
is reading the manifest rather than remembering it.

**Property tests: the module that decides every step's verdict had none**

Coverage assessment across the three packages' core modules: `runtime`, `generator`, `layout` (via
the feature/IR round trip), `inspection`, `layering`, `packages`, `complexity`, `coverage`, `options`
and `score` all had properties from the two earlier passes. `assertions.ts`, `report.ts`,
`mutation-jobs.ts` and `tiers.ts` had none. `assertions.ts` is the worst of those by a distance: every
acceptance step's pass or fail goes through it, this chain added two judgments to it, and its only
tests were the Coder's examples for those two plus the Hardener's tier. `npm run test:property` goes
from 11 files / 95 properties to **14 / 141**.

- `property/assertions.property.ts` (24) - each judgment against the predicate it is named for, over
  inputs nobody wrote down: `statusIs`, `bodyEquals`, `scriptIsAvailable`, `compilationSucceeded` and
  `everyAssetRespondsWith` accept exactly their condition and name what failed; `bodyContains` and
  `bodyExcludes` are exact opposites on the same observation, and `bodyContains` agrees with
  `responseContains` on the observed response; `responseContains` accepts content inserted anywhere,
  quotes what it looked for, and reports an excerpt bounded independently of the body, so the message
  does not grow with a 167 kB bundle; `majorVersionIsAtLeast` stays accepting as the compiler gets
  newer; `everyAssetRespondsWith` refuses an empty asset list rather than passing vacuously;
  `scriptReferencedByResponse` answers with the one script, agrees with `referencedScripts`, refuses
  a page with none, and names all of several in page order.
- `property/report.property.ts` (7) - the gate's own verdict, which nothing had generalised:
  `overGate` counts exactly the functions above the gate; raising the gate can never find more
  offenders; rows are one per offender, or one per function when all were asked for; the summary
  accounts for every measured function, listed or not; files read in path order whatever order they
  were measured in; functions read worst first within a file; a run measuring nothing the caller asked
  about is refused.
- `property/mutation-jobs.property.ts` (9) - the runner adapter's protocol: a duration parses back to
  the milliseconds it was written as, whole or fractional, and anything that is not a duration is
  declined rather than guessed; a run that reported a failure or never reported at all is an
  infrastructure error whatever it exited; zero and only zero is a success; the output passes through
  untouched however it was classified; a response line is one newline-terminated JSON object that
  parses back to what went in.
- `property/inspection.property.ts` gains 5 - `referencedScripts` finds the scripts and none of the
  stylesheets and is the leading half of what `referencedAssets` answers; `scriptArgv` reads back the
  argv it was written from, reads the same argv however much whitespace separates it, and refuses an
  undeclared or empty declaration by name.

**That they bite, checked by hand on every judgment rather than argued.** Each break below reddens
the property file and goes back green when restored:

| Break | Properties red |
| --- | --- |
| `responseContains` condition inverted | 4 |
| `excerpt` stops truncating | 1 |
| `statusIs` `!==` -> `<` | 2 |
| `bodyExcludes` `includes` -> `===` | 3 |
| `bodyEquals` weakened to `includes` | 1 |
| `majorVersionIsAtLeast` `<` -> `<=` | 1 |
| `everyAssetRespondsWith` filter inverted | 2 |
| an empty asset list defaulted to one asset | 1 |
| `scriptIsAvailable` weakened to a length check | 1 |
| `compilationSucceeded` `!== 0` -> `< 0` | 1 |
| `nothingReferences` tolerates one offender | 1 |
| `scriptReferencedByResponse` tolerates two scripts | 1 |
| `referencedScripts` reads link tags | 3 |
| `scriptArgv` stops splitting / stops trimming | 2 / 2 |
| `gateReport` drops the file sort / reverses the function sort | 2 / 1 |
| summary counts files instead of functions | 1 |
| `overGate` counts every function | 2 |
| `jobTimeout` ignores its unit / unanchors its pattern | 2 / 1 |
| `classify` turns a terminated run into a verdict / every run into a success | 1 / 1 |

**One break initially survived and the property was wrong, not the code.** `entry.crap > options.max`
changed to `>=` passed, because the scores were drawn from a continuous range and never landed on the
gate exactly. The generator now mixes small integers in with the arbitrary doubles, ties happen, and
the mutant dies. A property over a boundary has to be able to reach the boundary; `report.spec.ts`
caught this one by example, which is why it was worth the generator and not a reason to skip it.

**What I verified**

Every number read off a command I ran, in the tree as I leave it.

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | exit 0, no output |
| `npm test` | **23 files / 228 tests**, 0 failing, 0 skipped |
| `npx vitest run src` | **10 / 54 - the D2a floor, untouched** |
| `npx vitest run acceptance` | **5 / 63** |
| `npx vitest run scripts` | 8 / 111 |
| `npm run test:property` | **14 / 141**, and the tier run **20 times** with 0 failures |
| `npm run test:hardening` | 12 / 128, unchanged |
| `npm run test:acceptance` | 5 parse, 5 generate, **26 scenario executions pass** |
| `npm run build` | exit 0, 167.06 kB, `Minified React error` count 1, `src/index.tsx` count 0 in `dist/index.html` |
| `npx vitest run scripts/architecture` | 2 / 21 - the boundary rules and every package's layer map still hold |

- 54 + 63 + 111 = 228 and 10 + 5 + 8 = 23, so D1 is still exhaustively split with no overlap.
- **CRAP.** `node scripts/crap.mjs acceptance/inspection.ts acceptance/assertions.ts` (the changed
  measured files): **32 functions, 0 over the gate**. Whole project: 40 files, 224 functions, **2 over
  the gate** - the same two pre-existing `src/` functions every pass since the Cleaner's merge has
  reported. **I am applying the CRAP exception to `src/reducers/apis.ts` `executing` and recording
  that I did**: one flat `switch` on `action?.type` answering one question, at 100% coverage, so its
  13.0 is cc alone. `src/middlewares/callapimiddleware.ts` at 30.0 is coverage, not complexity, and
  task 01's Out of scope plus the D2a floor bar both fixes.
- `git status --short` shows exactly `acceptance/commands.ts`, `acceptance/fixtures.ts`,
  `acceptance/inspection.ts`, `acceptance/inspection.spec.ts`, `property/inspection.property.ts`
  modified and the three new `property/` files. `git status --short src features qa e2e .mutation` is
  empty. `git status --porcelain --ignored` lists `bin/ build/ coverage/ dist/ node_modules/
  test-results/` as `!!` and nothing as `??` but the sources I added, so QA E1 still reads true.
- I ran no mutation of any kind and no Gherkin mutation, and no parser or dry-checker run beyond what
  `npm run test:acceptance` does - no feature file changed. No dependency added, so no lockfile change.

**Test counts moved. The Specifier reconciliation before QA is where they land.**

| Step | As the Cleaner's fourth pass left it | Now |
| --- | --- | --- |
| D1 `npm test` | 23 files / 224 | **23 files / 228** |
| D2 file list | 10 `src` + 5 `acceptance` + 8 `scripts` | **unchanged - no spec file was added or moved** |
| D2a `npx vitest run src` | 10 / 54 | **10 / 54, the floor, intact** |
| D2b `npx vitest run acceptance` | 5 / 59 | **5 / 63** |
| D2c `npx vitest run scripts` | 8 / 111 and the sums | 8 / 111, sums **54 + 63 + 111 = 228**, 10 + 5 + 8 = 23 |
| D8 `npm run test:property` | 11 / 95 | **14 / 141** |
| D3-D7, D9, D10 | | unchanged; D5 is still 26 |

The reconciliation this pass owes is therefore smaller than the last one: four numbers, no file list.
The Coder's fourth-pass table is still owed on top of it if the tree has not been reconciled since -
D1 22 -> 23 and D2 gaining `acceptance/assertions.spec.ts` are its part, and this pass's D1 and D2b
supersede its numbers. `e2e/toolchain-commands.spec.ts` carries D1, D2b, D2c and D5 as literals; I did
not touch `e2e/`, and its `24 -> 26` edits are still outstanding alongside these.

**Left for the Hardener**

- **New core surface to mutate:** `scriptArgv` and the private `declaredScripts` in
  `acceptance/inspection.ts`. Both are covered by the unit spec and by properties in all four
  directions (declared, undeclared, blank, whitespace-separated), so equality-, message- and
  regex-mutants should die in the unit or property tier.
- `viteBundler` is gone from `acceptance/commands.ts` and `executable` is now exported. `commands.ts`
  is a shell, so `modulesIn('core')` does not name it and Stryker's mutate set is unaffected.
- **The three new `property/` files are already in the mutation tier's judge set** -
  `vitest.mutation.config.ts` includes `property/**/*.property.ts` - so `assertions.ts`, `report.ts`
  and `mutation-jobs.ts` mutants are now judged by 40 more properties than the last run saw. Expect
  survivors to fall rather than rise; if one of those three files' recorded results changes, that is
  the property tier reaching mutants the examples missed.
- `.mutation/` is untouched. The two staleness items handed over by the Coder and the Cleaner are
  unchanged, and my pass moves the same two hashes again and adds no third: the gherkin manifest's
  `implementation_hash` (`steps.ts` is unchanged but `fixtures.ts` and `commands.ts` are not) and
  `test-tier.json`'s `tier_hash`, which the three new property files move.

**Findings I did not fix, and who owns them**

1. **`src/selectors/index.ts` and `src/middlewares/callapimiddleware.ts` import `RootState` from
   `src/containers/index.ts`** - domain policy and an IO adapter depending on the UI barrel. Still
   true, still `tasks/04-hooks-replace-connect.md`'s by the ruling on the first Architect pass. The
   `src` half of the boundary check remains "imports nothing outside `src`", which passes; task 04 is
   when `src` becomes a fourth entry in `PACKAGES` with a real layer map.
2. **The UI re-walks facts the domain already knows.** `components/MainSection.tsx` still derives
   `activeCount = todosCount - completedCount` and "all complete" as `completedCount === todosCount`
   from two counts the container passes, while `reducers/todos.ts` answers the same question itself
   for `COMPLETE_ALL_TODOS`, and no selector owns either observable. Task 04, unchanged.
3. **`acceptance/assertions.ts` exports a type named `Response`,** which shadows the platform
   `Response` inside `fixtures.ts` - at exactly the point where the adapter translates one into the
   other. It is correct today and type-only, but the rename that would make it read right
   (`ObservedResponse`) touches `hardening/assertions.hardening.ts`, which is the Hardener's tier, and
   this pass had no other reason to enter it. Small, safe, and better done by whoever next has that
   file open.
4. **`observedResponse` is exported but reached in production only by its own siblings.** The
   hardening tier imports it, so de-exporting it would redden another role's tier for a cosmetic gain.
   Same disposition as the first pass gave `resolveArgument` and `matchStep`: part of the module's
   stated contract rather than accidental API.
5. **`startDevServer` and `startPreviewServer` still drive Vite's Node API rather than `npm run dev`
   / `npm run preview`, and that is right.** The same "ask the owner" argument that moved the build
   does not carry: those scenarios need the server's ephemeral URL handed back, which a spawned npm
   script cannot give, and the API starts the same server the script starts. Recorded so the
   asymmetry with the build is not read as a job half done.
6. **`scripts/crap/tiers.ts` and `acceptance/layout.ts` were assessed for properties and left.**
   `tiers.ts` is a data declaration plus two path joins, and `tiers.spec.ts` already asserts the one
   relation that matters - a tier measuring the same sources has to be listed. `layout.ts`'s round
   trip is already a property in `property/generator.property.ts`. After this pass every core module
   in the three packages has property coverage or a written reason not to.
7. **A later task that changes `package.json`'s `build` script now changes what the acceptance tier
   builds,** by design. That is the point of the fix, but it is worth knowing before task 06 touches
   the script surface: if `build` ever needs shell syntax rather than a plain command and its
   arguments, `scriptArgv` refuses to guess and the tier fails loudly rather than building something
   else.

**Left for QA**

- Nothing new. The boundary rules and the new judgments all run inside `npm test` and
  `npm run test:property`, which procedure D already covers at D1/D2b and D8.

**Open questions**

None.


### Project manager rulings on the Architect handoff

Verified independently: `npx tsc --noEmit` exits 0; `npm test` 15 files / 119 tests;
`npx vitest run src` holds the D2a floor at 10 / 54; `npm run test:property` 6 files / 60
properties; `npm run test:acceptance` 21 scenario executions; `src/`, `features/` and `qa/`
untouched. Accepted.

For the avoidance of doubt: adding `test:property` is not a breach of the earlier ruling that
fixed this task's script surface. That ruling refused a `typecheck` script because `PLAN.md`
section 5 assigns it to task 06. `test:property` is mandated by `PLAN.md` section 4 and by the
Architect brief's requirement to run properties as a separate command, and the Specifier's
`toolchain dependencies 2` already anticipates it being added by a later task.

The Architect's two open questions are settled as follows.

1. **Yes, `scripts/crap.mjs` must merge coverage across the deterministic tiers.** A gate that
   reads only the unit tier reports 182.0 for `executing`, which the property tier in fact covers
   completely. That is a false signal, and the next role to act on it is the Hardener, whose brief
   ends with a CRAP gate on changed files; left uncorrected it would push the Hardener into writing
   redundant unit tests to satisfy an instrument that is measuring the wrong thing. The Architect
   was right not to change another role's tool. A fresh Cleaner is being spawned to fix it, since
   `scripts/crap.mjs` is the Cleaner's.

   The Architect is not re-run afterwards. `scripts/crap.mjs` is a measurement instrument, not
   production code; nothing the Architect produced imports it or depends on its output, and the
   Architect's own verification (typecheck, four test tiers, byte-identical generated artifacts)
   is unaffected by how coverage is aggregated. Re-running it would buy nothing.

2. **Yes, the `RootState` relocation waits for task 04.** `tasks/04-hooks-replace-connect.md`
   already names it in scope. The Architect's reading was right, and the precedent it cited holds.

Two further findings from the Architect are dispositioned here rather than left loose:

- **`errorMessage`'s state parameter infers as `null` from its default,** so the reducer cannot be
  handed back the message it stored. Task 04 must derive `RootState` from the real root reducer, so
  it would inherit this defect into the derived type. `tasks/04-hooks-replace-connect.md` is amended
  to name it.
- **`implementationHash`'s `path\0content\0` separator is ambiguous for NUL-bearing content.**
  Accepted as a known limitation and deliberately not fixed: the input is project source files, the
  case is unreachable in practice, and any change rewrites every recorded hash. Recorded here so a
  later role does not rediscover it and "fix" it at that cost.


### Project manager rulings on the Cleaner CRAP correction

Verified independently: `node scripts/crap.mjs --reuse --all` reports 2 functions over the gate,
down from 5; `node scripts/crap.mjs acceptance` (the files this task changed) reports 0 over the
gate across 50 functions; `npm test` 15 files / 119 tests and `npx vitest run src` 10 / 54 are
both unmoved, so QA procedure D needs nothing from this pass. Accepted.

Declining to merge the acceptance tier is accepted, and accepted specifically because it was
measured rather than assumed: that tier's covered statements are a strict subset of the unit
tier's, so merging it would move no number while making the gate depend on the bootstrapped Go
binaries.

The two open questions are settled as follows, both without a further Cleaner pass.

1. **The gate does not need to mechanize the CRAP exception, and must not try on a targeted
   correction.** The Hardener and QA briefs both run the gate on *changed files*. `src/reducers/apis.ts`
   is not a file this task changes, and the changed-file run is already clean at 0 over the gate, so
   `executing` reading 13.0 blocks nothing here. The exception in the shared definitions is a judgment
   about whether a function is a single `cond`/`case` answering one question; the role reading the
   report applies it and records that it did so in its handoff note. Inferring it mechanically is new
   instrument behavior, and the Cleaner was right not to add it under a narrow correction.

   `tasks/04-hooks-replace-connect.md` is the first task that changes `src/reducers/apis.ts`. If the
   gate's inability to record an exception actually obstructs that task, its Cleaner may add an
   explicit waiver list carrying a named function and a written reason. A waiver that has to be
   justified in the file is reviewable; a heuristic that silently forgives a switch statement is not.

2. **The move to `coverage/<tier>/` needs no follow-up.** `.gitignore` already ignores `coverage`,
   which covers the per-tier subdirectories, and nothing in `qa/`, `README.md` or `features/` names a
   coverage path. Recorded so the observation is not rediscovered.


### Hardener

Done. Mutation hardening: Stryker for language mutation, a runner adapter for the APS
`gherkin-mutator`, and the tests that took the survivors out. Nothing committed. `features/`,
`qa/` and `src/` untouched.

**Split before mutating (the mixed-job hint)**

`acceptance/steps.ts` was the source the Cleaner and the Architect both routed to me: excluded
from coverage as wiring, and the one place a wrong assertion would go unnoticed by anything but
the acceptance tier. It was doing three jobs - map step text to an action, reach the
environment, and judge what came back. Only the middle one is environmental.

- `acceptance/assertions.ts` (new, core) owns the third job: the `World` a scenario accumulates
  and every judgment a step makes about it - `statusIs`, `bodyContains`, `bodyExcludes`,
  `bodyEquals`, `everyAssetRespondsWith`, `nothingReferences`, `scriptIsAvailable`,
  `compilationSucceeded`, `majorVersionIsAtLeast`, plus the three "you have not observed that
  yet" guards. No filesystem, no network, no runner.
- The HTTP client moved into `acceptance/fixtures.ts` as `requestPath` / `requestPaths`, where
  the servers it talks to already live; `serverUrl` stopped being exported because only they
  need it.
- `acceptance/steps.ts` is now the handler table and nothing else: 16 patterns, each one line
  of fixture call and/or assertion call. Same 18 step texts, same behaviour, same messages.

**Language mutation (`npm run test:mutation`)**

- `@stryker-mutator/core@10` and `@stryker-mutator/typescript-checker@10` added;
  `stryker.config.json`, `vitest.mutation.config.ts` and `scripts/mutation.ts` added.
- The mutated set is the testable core of `acceptance/`: `assertions`, `generator`,
  `inspection`, `layering`, `layout`, `mutation-jobs`, `runtime`. The adapter shells are the
  same list `vitest.coverage.ts` excludes, for the same reason, and the reason is written in the
  config.
- The mutants are judged by the unit-tier acceptance specs, the property tier and the hardening
  tier together, via `vitest.mutation.config.ts`. That config is not a new tier: it collects
  tests the other commands already run.
- The **typescript checker** is on. `'core' -> ""` in the layer map, or dropping the
  `member !== undefined` filter, are mutants the project's own `tsc --noEmit` rejects; 118 of
  437 mutants are in that class, and reporting them as survivors would have been noise.
- `.mutation/stryker-incremental.json` is the manifest, `incremental: true`,
  `thresholds.break: 100`. I mutated one file at a time, in sequence, differential against it.
- **`scripts/mutation.ts` exists because the manifest cannot see a test change.** See finding 2.

**Acceptance mutation (`node scripts/acceptance-mutation.ts`)**

- `acceptance/mutation-worker.ts` (shell) is the persistent runner adapter the mutator spec
  requires: newline-delimited JSON jobs on stdin, one response per line on stdout, diagnostics
  on stderr. For each job it puts the mutated IR at the path the generated entry point's
  metadata records and runs that entry point.
- `acceptance/mutation-jobs.ts` (new, core) holds the adapter's judgments so they are not buried
  in a shell: `jobTimeout`, `classify` (a run that never reached a verdict is
  `infrastructure_error`, never `test_success` - reporting it as success would record a mutant as
  survived on a test run that did not happen) and `responseLine`.
- `scripts/acceptance-mutation.ts` runs `gherkin-mutator --level soft`, one feature at a time,
  passing the implementation hash from the generated metadata.
- **`features/` is never written to.** The mutator keeps its scenario manifest in a comment
  block inside the feature file, and PLAN section 4 puts mutation manifests under `.mutation/`.
  So each run stages a copy of the feature under `build/acceptance-mutation/features/` with the
  stored manifest prepended, and lifts the manifest back out into
  `.mutation/gherkin/<slug>.manifest` afterwards. The staged path is project-relative, so the
  manifest the mutator writes matches on any checkout, not only the one that wrote it.
- `acceptance/layout.ts` gained the mutation directories, so the path convention still has one
  owner; `vitest.acceptance-mutation.config.ts` reads the glob from it.

**Results**

Language mutation, `npm run test:mutation`, from a forced full run:

| | |
| --- | --- |
| mutants | 437 across 7 files |
| killed | 310 |
| survived | **0** |
| timed out | 0 |
| rejected by the compiler | 118 |
| ignored, with a written reason | 9 |

Acceptance mutation, `node scripts/acceptance-mutation.ts`, five features:

| Feature | total | killed | survived |
| --- | --- | --- | --- |
| `api-proxy` | 4 | 2 | **2** |
| `development-server` | 4 | 4 | 0 |
| `production-build` | 3 | 3 | 0 |
| `toolchain-dependencies` | 8 | 8 | 0 |
| `typescript-compilation` | 0 | 0 | 0 |

The two survivors are finding 3. **This stage is not green, and I could not make it green
without editing `features/`.**

**The nine ignored mutants, and why**

Each carries a `// Stryker disable next-line <mutator>: <reason>` comment in the source, so the
waiver is reviewable where the code is - the shape the PM's ruling on CRAP waivers asked for.

- `acceptance/inspection.ts` `VERSION_BANNER` (6). The banner's patch digits are matched but
  never read, so `\.\d+` -> `\.\d` cannot change an answer. A line-scoped disable is the only
  granularity Stryker has, so five killable regex mutants on that line are ignored with it; they
  were killed before I added the comment, and the tests that killed them are still there.
- `acceptance/layering.ts` `importCycles` (3). Seeding the walk path with a non-module name and
  keeping non-members in the edge list both take a longer route to the same answer: a cycle is
  reported from the first repeated module, and a specifier that is not a module has no edges of
  its own. The second costs one real kill for the same line-granularity reason.

**Hardening tests: a separate tier, and QA procedure D does not move**

`hardening/` holds 7 files and 92 tests, run by `npm run test:hardening`
(`vitest.hardening.config.ts`), and added to `TIERS` in `scripts/crap.mjs` so the gate sees
their coverage - the wiring the Cleaner's note described. Nothing went into `src/` or into
`acceptance/*.spec.ts`, so:

| Command | Files | Tests | vs. the Architect's handoff |
| --- | --- | --- | --- |
| `npm test` | 15 | 119 | unchanged |
| `npx vitest run src` | 10 | 54 | unchanged - D2a floor intact |
| `npx vitest run acceptance` | 5 | 65 | unchanged |
| `npm run test:property` | 6 | 60 | unchanged |
| `npm run test:hardening` | 7 | 92 | new tier, outside `npm test` |
| `npm run test:acceptance` | 5 features | 21 scenario executions | unchanged |

**D1, D2, D2a and D2b all still read true.** The Specifier pass scheduled between me and QA
needs nothing from my test counts. What it may want is the script surface: `toolchain
dependencies 2` and QA step E3 list five commands, and there are now eight - `test:property`
(the Architect's), `test:hardening` and `test:mutation`. `toolchain dependencies 2` stays green
either way, because it only asserts that the scripts it lists exist.

**Scripts and dependencies**

- Added `test:hardening` and `test:mutation`. PLAN section 4 names `npm run test:mutation` for
  language mutation; `test:hardening` is the separate command my brief requires for hardening
  tests, and the CRAP gate needs it to be a tier it can run.
- `node scripts/acceptance-mutation.ts` deliberately has **no** npm script, following the
  `scripts/crap.mjs` precedent the Cleaner set: PLAN section 4 names no command for acceptance
  mutation, and the task's script surface is not mine to widen further.
- devDependencies: `@stryker-mutator/core`, `@stryker-mutator/typescript-checker`. I installed
  `@stryker-mutator/vitest-runner` first and removed it again when it turned out not to work
  (finding 1); reinstalling it is the first step if anyone revisits that.

**DRY pass**

- `vitest.generated-tests.ts` (new) owns how a run of generated entry points is executed - node
  environment, one file at a time, 120s timeouts. `vitest.acceptance.config.ts` and
  `vitest.acceptance-mutation.config.ts` were otherwise the same file twice.
- `acceptance/pipeline.ts` (new, shell) owns driving the APS tools over this project:
  `bootstrapTools`, `featureFiles`, `parseFeature`, `generateEntrypoints`, `emptyDirectories`,
  `runTool`, `announce`. `scripts/acceptance.ts` had all of it and
  `scripts/acceptance-mutation.ts` was about to have a second copy; both are now the part that
  differs. `scripts/acceptance.ts` is 27 lines, down from 45, and its behaviour is unchanged -
  same clean-tree run, same printed lines.
- `acceptance/layout.ts`: `generatedEntrypointGlob` and `mutationEntrypointGlob` come from one
  `entrypointGlob(directory)`.
- `vitest.mutation.config.ts` names the tier's test directories and suffixes once;
  `scripts/mutation.ts` reads the same list rather than restating the globs.

**One production simplification**

`acceptance/generator.ts` `metadataFileName` trimmed with `/^-+|-+$/g`. The preceding replace
collapses every run of non-alphanumerics, so a doubled hyphen cannot reach the trim and both
quantifiers were dead - which showed up as two unkillable mutants. It is `/^-|-$/g` now, with a
comment saying why. Same output for every input: the generated entry points and metadata are
byte-identical, implementation hashes included.

**What I verified**

- `npx tsc --noEmit` exits 0 with no output, after `rm -rf node_modules && npm ci` (exit 0).
- All six test commands at the counts tabulated above, 0 failing, 0 skipped.
- `npm run test:acceptance` from `rm -rf bin build`: bootstrap builds the three Go binaries, 5
  features parse, 5 entry points generate, **21 scenario executions pass**.
- The generated entry points and metadata are byte-identical to the Architect's and Cleaner's
  output, implementation hashes included, so the `layout.ts` and `generator.ts` changes moved no
  artifact.
- `npm run build` exits 0 and emits the same content hashes every role since the Cleaner has
  recorded: `index-BPxiUVWS.js`, `index-xAQXB6NR.css`. The third-party lightningcss warning is
  unchanged.
- `react-scripts` count is 0 in `package.json` and `package-lock.json`.
- **CRAP.** `node scripts/crap.mjs acceptance` (the package this pass changed): 7 files, 71
  functions, **0 over the gate**; every measured function is at 100% statement coverage and the
  worst is `classify` at 5.0. Whole project, `node scripts/crap.mjs`: 33 files, 165 functions, 2
  over the gate - `src/reducers/apis.ts` `executing` at 13.0 and
  `src/middlewares/callapimiddleware.ts` at 30.0. Both are pre-existing `src/` code this task's
  Out of scope bars me from, both are already dispositioned (the first is the CRAP exception
  verbatim - one `switch` answering one question, fully covered; the second is IO), and neither
  is a file this task changes. **I am applying the exception to `executing` and recording that I
  did, as the PM's ruling requires.**
- The mutation instruments bite, checked rather than assumed. Weakening one hardening assertion
  (`expect(IR_DIR).toBe('build/acceptance/ir')` -> `expect(typeof IR_DIR).toBe('string')`) turns
  that mutant from Killed to Survived and `npm run test:mutation` exits 1; restoring the
  assertion turns it back. Removing `server.proxy` from `vite.config.ts` still turns both
  `api proxy 1` rows red.
- **That negative check found a defect in `scripts/mutation.ts` and it is fixed.** Stryker
  rewrites the manifest whether mutants survived or not, so stamping only successful runs left a
  failed run's results recorded under the previous tier's stamp, and the next run reused them as
  if the tests had never changed. The stamp is now written whenever Stryker reached a verdict,
  and the wrapper exits with Stryker's own status instead of throwing. Re-verified: the stamp and
  the manifest move together, and a stale pair cannot form.
- Differential reuse works in both directions: a second `npm run test:mutation` reuses 428 of
  437 recorded results, and a second `node scripts/acceptance-mutation.ts` skips every clean
  scenario (`skipped_scenarios=1/1/2/2`, `skipped_mutations=4/3/8/0`) and re-runs only
  `api-proxy`, which has survivors.
- `git status --short features/ qa/ src/` is empty. `git status --porcelain --ignored` shows
  `bin/`, `build/`, `coverage/`, `dist/`, `node_modules/` ignored and nothing
  untracked-but-unignored. `.mutation/` is untracked and is meant to be committed (1.5 MB, most
  of it Stryker's per-mutant records).

**Findings**

1. **Stryker's Vitest runner does not work on Vitest 5, and silently reports false survivors.**
   With `testRunner: "vitest"`, mutants Stryker activates at runtime - every function body -
   never run a single test and come back `Survived`; only statically activated mutants (module
   level, activated through `__STRYKER_ACTIVE_MUTANT__` in the environment) are really tested.
   `acceptance/runtime.ts` scored 3.64% that way with 53 "survivors", every one of which dies
   when the same mutation is applied by hand and the same tests are run. I confirmed injection
   itself is fine (`mode`, `activeMutant` and per-test coverage all arrive) and that no test
   executes for those mutants, so it is the filtered mutant run, not the instrumentation. The
   configuration ships with `testRunner: "command"` running the mutation-tier vitest command,
   which is correct and version-independent at the cost of running the whole tier per mutant
   (437 mutants in about 7 minutes). **Do not switch back to the vitest runner without checking
   that a function-body mutant actually dies.**
2. **The command runner makes the manifest blind to test changes**, because it reports one
   anonymous test, so Stryker records `testFiles: {"": {"tests": 1}}` and would reuse a stale
   `Survived` after a test that kills it was added. `scripts/mutation.ts` closes that: it hashes
   the mutation tier's test files into `.mutation/test-tier.json` and passes `--force` when the
   hash has moved, writing the new stamp whenever Stryker reached a verdict. Only the tests are
   hashed;
   a source change is Stryker's own to notice. `--force` keeps the other files' recorded results,
   which I checked before relying on it.
3. **`api proxy 1`'s `body` column drives both the stub and the assertion, so mutating it cannot
   fail.** `Given the todo backend on port 4000 replies to <path> with <body>` and `Then the
   response body equals <body>` read the same cell; the mutator rewrites it once and both sides
   move together, so the scenario still passes and still tells the truth. These are equivalent
   mutations in the APS sense, and the spec puts equivalent-mutation filters in the mutator,
   which the Go fallback does not expose - so they cannot be filtered from the adapter side. The
   fix is in `features/api-proxy.feature`, which I must not edit. See open question 1.
4. **`scripts/crap.mjs` is not mutated and has no tests.** It is outside the coverage `include`
   (the Cleaner's open question 3, never ruled on) and Stryker cannot judge mutants no tier
   exercises. It is the instrument the gate depends on, and its complexity computation is real
   logic. I left it alone rather than widen my own pass into the tool the previous role owns.
5. **The adapter shells are not mutated:** `commands`, `fixtures`, `generate-entrypoints`,
   `mutation-worker`, `pipeline`, `project-files`, `steps`. Mutating them needs the acceptance
   tier - the bootstrapped Go binaries, a production build and live servers - inside Stryker,
   per mutant. After the `steps.ts` split every judgment they used to make lives in a mutated
   core module, so what is left is translation. This is the same boundary `vitest.coverage.ts`
   draws and the PM accepted.

**Left for the next role**

- **The Specifier pass:** my test counts need no reconciliation (table above). Two things do
  want a decision: the three added script rows for `toolchain dependencies 2` / QA step E3, and
  finding 3.
- **QA:** `node scripts/acceptance-mutation.ts` exits 1 today, on finding 3 alone. Everything
  else is green. It is not one of the task's done criteria and no QA procedure names it.
- `hardening/` is a tier of its own on purpose: `npm test` does not run it, and `scripts/crap.mjs`
  does. If a later task adds a tier that measures the same sources, add it to `TIERS` too.
- Everything earlier roles left standing still stands: the Vitest isolation hint, the
  third-party lightningcss warning, CI wiring for `test:acceptance`, `test:property`,
  `test:hardening` and `test:mutation` (task 06), the missing Playwright driver for
  `qa/todo-app-regression.md`, and the `console.log` in `src/reducers/apis.ts` (task 06 by PM
  ruling).

**Open questions**

1. **Who fixes `api proxy 1`, and how?** The scenario is "what the backend replies with comes
   back through the proxy unchanged", and expressing it with one example column is why the
   mutation survives. Two ways out, both the Specifier's: give the step pair separate columns
   holding the same value, so a mutation to either breaks the equality; or accept the two
   survivors as equivalent mutations and record that, in which case `scripts/acceptance-mutation.ts`
   needs a project-side skip list naming those two cells and a reason - which is a filter the
   APS spec locates in the mutator, so I did not invent one on my own initiative.
2. **Is `.mutation/stryker-incremental.json` at 1.5 MB acceptable to commit?** PLAN section 4
   says mutation manifests are committed and never hand-edited, and it will grow as later tasks
   mutate `src/`. It is Stryker's own format, so trimming it would be hand-editing.
3. **Should `scripts/crap.mjs` be tested and mutated (finding 4)?** It gates every later task,
   and it is the one piece of project logic with no tier over it. Covering it means widening the
   coverage `include` to `scripts/**`, which changes what the gate measures - the Cleaner's
   decision, not mine, on the precedent of the CRAP-tool rulings.


#### Second pass: the two `api proxy 1` survivors are dead, and the gate's own core is mutated

Done. Both stages green: language mutation 0 survivors, acceptance mutation 0 survivors and exit 0.
Nothing committed. `src/`, `features/` and `qa/` untouched.

**The two survivors this chain was resumed for are killed**

`node scripts/acceptance-mutation.ts` exits **0**. Run against emptied manifests so every candidate
was really tested rather than reused:

| Feature | candidates | killed | survived |
| --- | --- | --- | --- |
| `api-proxy` | **6** | **6** | **0** |
| `development-server` | 4 | 4 | 0 |
| `production-build` | 3 | 3 | 0 |
| `toolchain-dependencies` | 11 | 11 | 0 |
| `typescript-compilation` | 0 | 0 | 0 |

The four cells that matter each died on their own: `stub_body` row 1 and row 2, `expected_body` row 1
and row 2. Both `path` mutants died as before, so leaving `path` as one column is still carrying its
weight. The Specifier's split is what did it - no handler, runtime or step-text change was needed,
and I made none.

**The total is 24, not 28.** The second Specifier note adds 19 + 2 + 3 and records 28; 6 + 4 + 3 + 11
+ 0 is 24, and 24 is what the mutator generated. Nothing depends on the number except that note.

**The instrument bites in both directions, checked rather than argued.** Weakening `bodyEquals` in
`acceptance/assertions.ts` to compare with whitespace and case stripped - the two things the mutator
dithers - turns all four `stub_body`/`expected_body` mutants **Survived** and the run exits 1. The
`path` mutants still die, because they change a route and not a body. Restoring the assertion returns
the run to 24 killed. `acceptance/assertions.ts` is byte-identical to `HEAD`; the manifests were
snapshotted before the check and restored after.

No skip list was added, per the ruling. There is nothing to skip.

**Language mutation now covers the gate and the boundary check**

The wiring both the Cleaner and the Architect routed to me is in:

- `mutationTierTests` gains `{ directory: 'scripts', suffix: '.spec.ts' }`, so the two packages whose
  specs live under `scripts/` are judged by them. The mutation tier is 35 files / 383 tests, all of
  them tests the other commands already run.
- The mutated set goes from 8 files to **14**: the 6 acceptance cores, `scripts/crap`'s 6, and
  `scripts/architecture`'s 2.

| | first pass | now |
| --- | --- | --- |
| files mutated | 8 | **14** |
| mutants | 437 | **726** |
| killed | 310 | **514** |
| timed out | 0 | 1, genuine - see below |
| **survived** | 0 | **0** |
| rejected by the compiler | 118 | 202 |
| ignored, with a written reason | 9 | 9, the same nine |

**29 survivors were found and killed.** Five new hardening files, 300 lines, `hardening/` only:

| Module | survivors | what nothing was pinning | killed by |
| --- | --- | --- | --- |
| `scripts/crap/score.ts` | **17** | every boundary of `contains` and every shape `spanSize` orders - the two together decide which function a covered statement is charged to | `hardening/score.hardening.ts` |
| `scripts/architecture/packages.ts` | 5 | what a layer answers with, whether the package list covers the tooling tree, and whether a granted pure dependency is one a core module actually imports | `hardening/packages.hardening.ts` |
| `scripts/crap/tiers.ts` | 3 | that a tier is named, so its report goes below the coverage root and not into it | `hardening/tiers.hardening.ts` |
| `scripts/crap/complexity.ts` | 2 | the `(module)` label, and which parser a file gets from its extension | `hardening/complexity.hardening.ts` |
| `scripts/crap/report.ts` | 2 | the separators - the report's columns and the paths a refusal names | `hardening/report.hardening.ts` |
| the 6 `acceptance/` cores, `layering.ts`, `coverage.ts`, `options.ts` | 0 | - | already pinned |

Three of those are worth naming, because they were not cosmetic:

- **`score.ts`'s 17.** Every example and property placed statements comfortably inside a function,
  which is the one region where every plausible boundary rule agrees. A statement sitting on the
  function's first character, its last, one column either side of each, or on an earlier line further
  along it, told the fourteen `contains` mutants apart. The three `spanSize` mutants needed spans
  whose orderings disagree: two spans on one line, a short span ending far along its line against a
  tall one ending at column 1, and a short span far down inside a long one.
- **`packages.ts`'s `PACKAGES = []`.** `packages.spec.ts` iterates `PACKAGES`, so an empty list checks
  nothing and passes - the same defect class the Cleaner found in `TIERS`. The new test derives the
  answer from the tree instead: every source under `acceptance/` and `scripts/` is either declared in
  a package or named as a CLI wrapper in the coverage config. It also closes a gap nobody had:
  a whole undeclared package directory was previously invisible to the check.
- **`architectureRules.pureExternals: []` -> `["Stryker was here"]`.** A pure dependency is a
  permission. Granting one no core module imports widens what the check accepts with nothing in the
  tree changing, so the test now reads each package's granted list against the specifiers its core
  modules actually import. That is derived, not restated, and it catches a stale entry too.

**A finding that made two kills look like something else: the timeout ceiling was too tight**

`complexity.ts` came back with 2 `Timeout`s under Stryker's default ceiling - 5s plus 1.5x the initial
run - while the mutation tier itself takes about 4s. Both mutants die by hand in 3.6s
(`setParentNodes` `true` -> `false`, and the `visit` body emptied), so those verdicts were the clock,
not a hang.

A Timeout scores as detected, which is what makes this dangerous rather than merely untidy: **a mutant
that would have survived is recorded as killed if it happens to run slow.** `timeoutMS` is 60s now,
with the reason in the config; both mutants are recorded `Killed`, and the one remaining Timeout in
the whole run is `index -= 1` in `readOptions`' argv loop, which genuinely does not terminate.

**Mutation counts, and what they say about the mixed-job hint**

Scanned before mutating, on the sources this chain changed - `scripts/crap/*` (Cleaner) and
`scripts/architecture/*` (Architect):

| Module | mutants | Module | mutants |
| --- | --- | --- | --- |
| `acceptance/assertions.ts` | 98 | `scripts/architecture/packages.ts` | 50 |
| `scripts/architecture/layering.ts` | 89 | `scripts/crap/report.ts` | 48 |
| `scripts/crap/score.ts` | 64 | `acceptance/mutation-jobs.ts` | 40 |
| `scripts/crap/options.ts` | 60 | `scripts/crap/coverage.ts` | 20 |
| `acceptance/generator.ts` | 59 | `acceptance/layout.ts` | 19 |
| `acceptance/inspection.ts` | 58 | `scripts/crap/tiers.ts` | 14 |
| `acceptance/runtime.ts` | 55 | | |
| `scripts/crap/complexity.ts` | 52 | | |

**I split nothing, and that is the finding.** Both roles had already decomposed their package one job
per module, with the job written at the top of each file, and the counts agree: the two largest are
`assertions.ts` (one judgment per step vocabulary entry) and `layering.ts` (one fault per rule), which
are long because their one job has many cases, not because they have two jobs. Splitting either to
lower a count is what the hint explicitly forbids. `steps.ts` - the source my first pass did split -
stayed split and needed nothing.

**Configuration: `stryker.config.json` is now `stryker.config.mjs`, and the core list has one owner**

`mutate` was the third copy of the core-or-shell decision, after `acceptanceRules.layers` and
`vitest.coverage.ts`'s `exclude`. The Architect left it as the one copy that could not import the
list, because JSON cannot import. A `.mjs` config can:

```js
import { modulesIn } from './scripts/architecture/packages.ts'
export default { /* ... */ mutate: modulesIn('core'), /* ... */ }
```

Declaring a module a shell in its layer map now takes it out of the CRAP gate *and* out of mutation,
once, in one place. This is the DRY stage's one substantive change, and it is the option the Architect
offered - taken through the config rather than through `scripts/mutation.ts --mutate`, so a bare
`npx stryker run` still mutates the right set instead of falling back to Stryker's `src/**` default.
Verified equal before switching: the JSON's 14 paths and `modulesIn('core')` are the same set, and the
run after the switch instruments the same 726 mutants with the same per-file counts. The `_comment`
keys became real comments; nothing else in the configuration moved but `timeoutMS`.

`node scripts/mutation.ts` needed no change: it hashes the mutation tier's *test* files, and the
stryker config is not one of them.

**What I did not DRY, deliberately.** `hardening/packages.hardening.ts` reads the tree the way
`scripts/architecture/packages.spec.ts` does, so `isSource` and a `ts.preProcessFile` import reader
exist twice. Extracting them would put a module in the architecture package that no production code
calls - the Architect's finding 4 disapproved of exactly that - and the two copies are in different
tiers, like the property tier's own helpers. Same judgment as the duplicated `projectRoot` the PM
accepted. Recorded rather than done; if a third copy appears, that changes the answer.

**What I verified**

- `npx tsc --noEmit` exits 0 with no output; `npx tsc --version` is 5.9.3.
- `npm run test:mutation` exits 0: 726 mutants, 514 killed, 1 timeout, **0 survived**, 202 compile
  errors, 9 ignored. Mutated **one file at a time, in sequence**, each with `--force` because the tier
  hash had moved and a reused result from the old tier would not have been evidence; then once more
  over all 14 files, which reused all 726 recorded results in 9 seconds.
- `node scripts/acceptance-mutation.ts` exits 0, tabulated above. A second run skips all 24 mutations
  across all 7 scenarios, so differential reuse still works.
- **The language-mutation instrument bites.** Moving `hardening/tiers.hardening.ts` aside brings its
  3 survivors back and the run exits 1; putting it back returns `tiers.ts` to 100% and exit 0.
- All six test commands, run directly, 0 failing and 0 skipped:

| Command | Files | Tests | vs. the Architect's second pass |
| --- | --- | --- | --- |
| `npm test` | 22 | 214 | unchanged |
| `npx vitest run src` | 10 | 54 | **unchanged - the D2a floor, intact** |
| `npx vitest run acceptance` | 4 | 49 | unchanged |
| `npx vitest run scripts` | 8 | 111 | unchanged |
| `npm run test:property` | 11 | 95 | unchanged |
| `npm run test:hardening` | **12** | **128** | was 7 / 92 |
| `npm run test:acceptance` | 5 features | 24 scenario executions | unchanged |

- **CRAP.** `node scripts/crap.mjs acceptance scripts` - what mutation touched: 14 files, 124
  functions, **0 over the gate**, and every one of the 124 at 100% statement coverage. Whole project:
  40 files, 218 functions, 2 over - `src/reducers/apis.ts` `executing` at 13.0 and
  `src/middlewares/callapimiddleware.ts` at 30.0, the same two every pass since the Cleaner's merge.
  Both are pre-existing `src/` code this task's Out of scope bars me from. **I am applying the CRAP
  exception to `executing` and recording that I did**: one flat `switch` answering one question, at
  100% coverage, so its 13.0 is cc alone. The other is IO at 0% coverage.
- `npm run build` exits 0 and emits `index-BPxiUVWS.js` and `index-xAQXB6NR.css` - the same content
  hashes every role since the first Cleaner pass has recorded. Worth checking because a root config
  now imports a package module; it does not reach the build.
- `git status --short src features qa` is empty. `git status --porcelain --ignored` shows `bin/`,
  `build/`, `coverage/`, `dist/` and `node_modules/` ignored and nothing untracked-but-unignored
  except the six sources I added. `.mutation/` is modified, never hand-edited: every file in it is
  what a tool wrote.
- The five feature files were not opened for writing at any point, and `qa/` was not touched.

**For the Specifier pass scheduled before QA**

- **One number moves: D9.** `npm run test:hardening` is **12 files / 128 tests**, was 7 / 92. D2's
  file list is unaffected - `hardening/` is not in the unit run - and D1, D2, D2a, D2b, D2c, D5, D8
  and D10 all read true against the tree today, at the values the Architect's table records.
- D10 still holds in both directions: no `hardening/` or `property/` file appears in `npm test`, and
  no `scripts/` spec appears in D8 or D9.
- E3 and E4 are unaffected. I added no npm script and renamed none; `package.json` still declares the
  same eight, `README.md` still documents the same eight, and `Other checks` still names two script
  files that exist. `README.md` needed no edit at all: its `test:mutation` entry already says "over
  the testable core the packages declare", which is now literally how the config computes it.
- The `28` in your second note is `24`. No feature file or procedure restates it.

**Left for QA**

- `node scripts/acceptance-mutation.ts` and `npm run test:mutation` both exit **0** now. Neither is a
  done criterion and no QA procedure names them, which is still right - they are instruments.
- Nothing else moved for you. `qa/todo-app-regression.md` still needs the browser driver and the
  `test:e2e` script that PM ruling 2 authorises you to add.

**Left for later tasks**

- `hardening/` is a tier of its own and `scripts/crap.mjs` runs it. A later task that adds a tier
  measuring the same sources adds it to `MEASURING_TIERS`, and `tiers.spec.ts` fails if it does not.
- When a later task mutates `src/`, `src` becomes a fourth entry in `PACKAGES` with a real layer map
  and `mutate` follows automatically. Nothing has to be added to the Stryker config for it.
- Everything earlier roles left standing still stands: the Vitest isolation hint, the third-party
  lightningcss warning from `todomvc-app-css`, CI wiring for the six test commands (task 06), and the
  `console.log` in `src/reducers/apis.ts` (task 06 by PM ruling).

**Findings**

1. **A tight timeout ceiling silently converts survivors into kills.** Recorded above. The general
   point outlives this project: with a command runner, Stryker's default ceiling is calibrated on a
   single test file, not on a whole tier, and a Timeout is scored as detected. Any project running
   mutation through a command runner should raise `timeoutMS` well above its tier time and then treat
   a remaining Timeout as a real non-terminating mutant, which is what the one left here is.
2. **Stryker's Vitest runner is still not usable on Vitest 5**, and the workaround still ships. I did
   not re-test it: nothing in this pass changed the runner, Vitest, or the finding's premise, and my
   first pass recorded how to re-test it (check that a mutant inside a function body actually dies)
   before anyone switches back.
3. **The adapter shells are still not mutated:** `commands`, `fixtures`, `generate-entrypoints`,
   `mutation-worker`, `pipeline`, `project-files`, `steps`, and the three CLI wrappers under
   `scripts/`. That boundary is now declared in exactly one place - the layer maps - and both the
   gate and the mutation set read it from there.
4. **`.mutation/stryker-incremental.json` is 3.4 MB**, up from 1.4, because it now records 726 mutants
   across 14 files instead of 437 across 8. The PM's ruling to commit it and never trim it stands and
   I followed it; recording the new size because the ruling was made against the smaller number and
   later tasks mutating `src/` will grow it again.

**Open questions**

None.

#### Third pass: `production build 4` is dead, and the acceptance manifest can no longer hide a weakened implementation

Done. Both stages green: language mutation 754 mutants / **0 survived**, acceptance mutation 26
candidates / **26 killed** / exit 0. Nothing committed. `src/`, `features/`, `qa/` and `e2e/` are
untouched.

**The two candidates this chain resumed for are killed**

`node scripts/acceptance-mutation.ts`, run against emptied manifests so every candidate was really
tested rather than reused:

| Feature | candidates | killed | survived |
| --- | --- | --- | --- |
| `api-proxy` | 6 | 6 | 0 |
| `development-server` | 4 | 4 | 0 |
| `production-build` | **5** | **5** | 0 |
| `toolchain-dependencies` | 11 | 11 | 0 |
| `typescript-compilation` | 0 | 0 | 0 |

`production build 4`'s two rows died on their own:
`Minified React error -> Minified React eRror` and
`act(...) is not supported in production builds of React. -> act(...) is not supporTed ...`. The
total goes from 24 to **26**, matching the Specifier's estimate for the first time in this task.

**It bites, checked in the failing direction.** Weakening `responseContains` in
`acceptance/assertions.ts` to compare with case folded - case is one of the two things the mutator
dithers - turns **4 of production-build's 5** candidates `Survived` and the run exits 1: both
`production build 4` rows and the two `production build 1` rows whose dither is a case flip. The
row that still dies is `id="root" -> idx"root"`, which is not a case change. Restoring the
assertion returns the feature to 5 killed. So the new scenario is reading the bundle it claims to
read, and the marker is what kills the mutant.

I also re-checked the implementation side, because a mutant dying says nothing about a regression
in an unmutated shell: putting the fixture's `NODE_ENV` back to `test` reddens exactly
`production build 4/example_1` and `example_2` and leaves that file's other five executions
passing. Restored, and `dist/` rebuilt to the production artifact (167,067 bytes,
`index-BPxiUVWS.js` / `index-xAQXB6NR.css`, `Minified React error` count 1) so nothing downstream
inherits the development bundle that check leaves behind.

**The finding: the acceptance manifest cannot tell one implementation from another**

Three handoff notes and a PM ruling record that `.mutation/gherkin/production-build.manifest` keys
its reuse on an `implementation_hash` that `steps.ts` has moved. **It does not, and that is worse
than the staleness everyone expected.** The hash is `hash_scope: generated_files` over the
generated entry point, and that entry point is a seventeen-line loader naming its feature and its
IR path: no step handler, assertion or fixture reaches it, so nothing this chain changed moved it.
The recorded hash before my run and the hash my run computed are the same `sha256:2907db0f...`.
And at `--level soft` - the level my brief directs - a moved hash would not force a re-test anyway,
because soft reuses on the scenario and background hashes. `production build 4` re-ran because it
was a scenario with no recorded result, not because a hash moved.

That is a live blind spot, demonstrated rather than argued: with the manifests in place and
`responseContains` weakened exactly as above, `node scripts/acceptance-mutation.ts` skipped all 26
candidates and exited **0**. The instrument reported green over an implementation that no longer
kills four of its own mutants.

**The fix is the same shape as the one the language side already carries.** `scripts/mutation.ts`
hashes the mutation tier's test files because the command runner makes Stryker's manifest blind to
test changes; `scripts/acceptance-mutation.ts` now records what the step implementation looked like
when the manifests were written, in `.mutation/acceptance-implementation.json`, and stages the
features **without** their stored manifests once that has moved - which tests every candidate
against the implementation the result will be reported for. The hash is `implementationHash` from
`acceptance/generator.ts` over every non-spec `acceptance/*.ts`, so no second sha256 was written
and over-inclusion errs toward testing more. The stamp is written whenever every feature reached a
verdict, for the reason `scripts/mutation.ts` states: the mutator rewrites a manifest whether its
mutants survived or not, and a feature the mutator never finished can leave a partial one.

Verified in all three directions: with no stamp the run tests all 26 and kills all 26; a second run
reuses and skips all 26; and the `responseContains` weakening now moves the hash, re-tests
everything and reports **7 survivors with exit 1** where the same weakening was silently green
before. Restored, the run is back to 26 killed and exit 0.

`features/` is still never opened for writing, and no skip list exists anywhere - this change only
ever causes more candidates to be tested.

**Language mutation: 0 survivors, and nothing needed killing**

`npm run test:mutation`, the 14 core modules `modulesIn('core')` names, mutated **one file at a
time, in sequence**. Each ran with `--force`, because the tier hash had moved -
`acceptance/assertions.spec.ts` is new and three property files were added since the manifest was
written - and a result recorded under the old tier would not have been evidence. A final run over
all 14 reused all 754 recorded results in 10 seconds and exits 0.

| | second pass | now |
| --- | --- | --- |
| files mutated | 14 | 14 |
| mutants | 726 | **754** |
| killed | 514 | 537 |
| timed out | 1 | 1, the same genuine one |
| **survived** | 0 | **0** |
| rejected by the compiler | 202 | 207 |
| ignored, with a written reason | 9 | 9, the same nine |

The 28 new mutants are all in the two cores this chain changed: `acceptance/assertions.ts` 98 ->
**113** and `acceptance/inspection.ts` 58 -> **71**. Every one of them was killed by tests that
already existed when I arrived - the Coder's `acceptance/assertions.spec.ts` and the ten unit tests
around `referencedScripts` / `responseContains` / `scriptReferencedByResponse`, and the Architect's
24 properties over `assertions.ts` and 5 over `inspection.ts`. **So I wrote no hardening tests this
pass**, and `hardening/` stays at 12 files / 128 tests. There were no survivors to kill and no
uncovered statement to cover: all 130 measured functions under `acceptance/` and `scripts/` are at
100% statement coverage.

**That is a claim about the instrument as much as the tests, so I checked it.** Skipping the
`scriptArgv` describes in `acceptance/inspection.spec.ts` and `property/inspection.property.ts`
brings **9 survivors** back in `scriptArgv` and its private `declaredScripts` - the dropped
`.trim()`, the optional chain, all three forms of the guard, the emptied block and the message -
and the run exits 1. Restored and re-recorded with `--force`: `inspection.ts` back to 100%, 0
survivors. The new core surface is genuinely reached by mutation, not merely reported as clean.

**Mixed-job hint: scanned, and nothing split**

Mutant counts on this chain's changed and new sources, read off the manifest rather than estimated:

| Module | mutants | | Module | mutants |
| --- | --- | --- | --- | --- |
| `acceptance/assertions.ts` | **113** | | `scripts/crap/score.ts` | 64 |
| `scripts/architecture/layering.ts` | 89 | | `scripts/crap/options.ts` | 60 |
| `acceptance/inspection.ts` | **71** | | `acceptance/generator.ts` | 59 |
| `acceptance/runtime.ts` | 55 | | `scripts/crap/complexity.ts` | 52 |
| `scripts/architecture/packages.ts` | 50 | | `scripts/crap/report.ts` | 48 |
| `acceptance/mutation-jobs.ts` | 40 | | `scripts/crap/coverage.ts` | 20 |
| `acceptance/layout.ts` | 19 | | `scripts/crap/tiers.ts` | 14 |

`assertions.ts` is the largest and gained the most, and it stays one file. Its job is what a
scenario has observed and whether an observation satisfies its step; `responseContains` is the
judgment `bodyContains` always made with the world lifted out, and `scriptReferencedByResponse`
answers the same question about the observed page that `assetsReferencedByResponse` does. Splitting
extraction from judgment would put two halves of one scenario's world in two files to lower a
count, which the hint forbids. `inspection.ts` gained `scriptArgv`, which shares its private
`declaredScripts` parse with `availableScripts`; it still reads facts out of project text, which is
the one job the Cleaner declared for it and the PM accepted. The shells this chain changed -
`commands.ts`, `fixtures.ts`, `steps.ts` - were all assessed by the Cleaner one pass earlier and
its refusal to split `fixtures.ts` is right for the reason it gave: the only candidate half reads
module-private mutable state.

**CRAP gate**

- Changed measured files, `acceptance/assertions.ts` and `acceptance/inspection.ts`: **32
  functions, 0 over the gate.**
- Everything mutation touched, `node scripts/crap.mjs acceptance scripts`: 14 files, **130
  functions, 0 over the gate**, every one at 100% statement coverage.
- Whole project: 40 files, 224 functions, **2 over** - `src/reducers/apis.ts` `executing` at 13.0
  and `src/middlewares/callapimiddleware.ts` at 30.0, the same two every pass since the Cleaner's
  merge. **I am applying the CRAP exception to `executing` and recording that I did**: one flat
  `switch` on `action?.type` answering one question, at 100% coverage, so its 13.0 is cc alone. The
  other is IO at 0% coverage; this task's Out of scope and the D2a floor both bar the fix.
- **The file I changed is not measured.** `scripts/acceptance-mutation.ts` is a CLI wrapper
  `vitest.coverage.ts` excludes, so `node scripts/crap.mjs scripts/acceptance-mutation.ts` reports
  no measured files and exits 2 - the same answer QA got for `e2e/`. Measured with the project's
  own `complexityByFunction` instead: highest cyclomatic complexity **4** (the module body), every
  named function 3 or less, against 5 for the module body of `scripts/mutation.ts` beside it.

**DRY**

- The new hash is `implementationHash` from `acceptance/generator.ts`, not a second sha256 written
  in the wrapper. It is already a mutated core with tests and properties over it.
- `.mutation` was named twice in `scripts/acceptance-mutation.ts` after my change; it is one
  `MUTATION_DIR` now, with the manifest directory and the stamp both derived from it.
- **What I did not DRY, deliberately.** `.mutation/test-tier.json` and
  `.mutation/acceptance-implementation.json` are now the same idea - hash a set of files, compare
  it with what was recorded, rewrite it when the run reached a verdict - in two CLI wrappers. Two
  copies, different subjects (the tests that judge language mutants; the implementation that judges
  acceptance mutants), and merging them means a tested `scripts/mutation/` package plus a stamp
  format both files share, which invalidates the recorded `tier_hash` and forces a full 754-mutant
  re-run to get back to where the tree already is. Recorded rather than done, the same disposition
  the second pass gave the duplicated `isSource`; if a third stamp appears, that changes the answer.
  See open question 1.

**What I verified**

Every number read off a command I ran, in the tree as I leave it.

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` / `--version` | exit 0, no output / `Version 5.9.3` |
| `npm test` | 23 files / 228 tests, 0 failing, 0 skipped |
| `npx vitest run src` | **10 / 54 - the D2a floor, intact** |
| `npx vitest run acceptance` | 5 / 63 |
| `npx vitest run scripts` | 8 / 111 |
| `npm run test:property` | 14 / 141 |
| `npm run test:hardening` | 12 / 128 |
| `npm run test:acceptance` | 5 features parse, 5 entry points generate, **26 scenario executions pass** |
| `npm run test:mutation` | exit 0, 754 mutants, 537 killed, 1 timeout, **0 survived**, 207 compile errors, 9 ignored |
| `node scripts/acceptance-mutation.ts` | exit 0, **26 candidates, 26 killed**, 0 survived |
| `npm run build` | exit 0, `index-BPxiUVWS.js` 167,067 bytes and `index-xAQXB6NR.css` - the same content hashes every role since the first Cleaner pass has recorded |
| `npx vitest run scripts/architecture` | 2 / 21 - the boundary rules still hold with the wrapper importing a core |

- 54 + 63 + 111 = 228 and 10 + 5 + 8 = 23, so D1 is still exhaustively split.
- **No test count moved in this pass.** D1, D2, D2a, D2b, D2c, D5, D8 and D9 read exactly as the
  Architect's third pass left them, so the reconciliation the Specifier owes is that table and
  nothing of mine.
- `git status --short src features qa e2e` is empty. `git status --porcelain --ignored` lists
  `bin/ build/ coverage/ dist/ node_modules/ test-results/` as `!!` and nothing as `??` but the one
  new manifest below, so QA E1 still reads true.
- `README.md`'s `Available Scripts` documents the nine scripts `package.json` declares and
  `Other checks` still names two script files that exist, so E3 and E4 are unaffected by the
  paragraph I added under `node scripts/acceptance-mutation.ts`.

**What I changed**

`scripts/acceptance-mutation.ts` and a paragraph of `README.md`. That is the whole source diff;
everything else in the working tree is `.mutation/`, and every byte of it was written by a tool.

**`.mutation/acceptance-implementation.json` is new and needs committing** with the rest of
`.mutation/`, under the PLAN section 4 rule that mutation manifests are committed and never
hand-edited. `.mutation/stryker-incremental.json` is now **4.3 MB**, up from 3.4, because it
records 754 mutants instead of 726.

**Left for the Specifier pass scheduled before QA**

- Nothing from me. Every count in procedure D reads true against the tree at the values the
  Architect's third pass recorded, and I moved none of them.
- For the record, since two notes now carry an estimate: the acceptance-mutation tier presents
  **26** candidates and all 26 are killed.

**Left for QA**

- `e2e/toolchain-commands.spec.ts` still carries the counts the Coder's and Architect's passes
  moved, as literals: `22 passed (22)` / `214 passed (214)` at D1, `4 passed (4)` / `49 passed (49)`
  at D2b, `54 + 49 + 111 = 214` and `10 + 4 + 8 = 22` at D2c, `24` in three places at D3 and D5, and
  `11 passed (11)` / `95 passed (95)` at D8. The tree reads 23 / 228, 5 / 63, 54 + 63 + 111 = 228,
  10 + 5 + 8 = 23, 26, and 14 / 141. D2a (10 / 54), D2c's own 8 / 111 and D9 (12 / 128) are still
  true. I did not touch `e2e/`; recording the list so the pass that owns it does not have to find
  them.
- `npm run test:mutation` and `node scripts/acceptance-mutation.ts` both exit 0. Neither is a done
  criterion and no QA procedure names them, which is still right - they are instruments.

**Findings**

1. **A differential acceptance-mutation run proves nothing about an implementation the manifest
   never hashed.** Recorded above with the demonstration and the fix. The general point outlives
   this project: `--level soft` deliberately reuses across implementation changes, so the driver
   around the mutator has to decide when a stored result stopped being evidence. Nothing in the
   mutator can do it, because the hash the spec gives it covers generated files.
2. **The one decision that makes the acceptance tier build a production bundle is still unmutated.**
   `NODE_ENV: 'production'` lives in `acceptance/fixtures.ts`, a shell that neither mutation stage
   reaches - language mutation because shells are out of `modulesIn('core')`, acceptance mutation
   because it rewrites example cells. What guards it is `production build 4` failing, which I
   verified by hand above and which the stamp now re-verifies automatically whenever `acceptance/`
   moves. Worth knowing before a later task decides the shells are safe because both stages are
   green.
3. **A tight timeout ceiling still silently converts survivors into kills**, and the ceiling is
   still 60s with the reason in the config. The single remaining `Timeout` is `index -= 1` in
   `readOptions`' argv loop, which genuinely does not terminate. Unchanged from the second pass and
   restated because a later task mutating `src/` will be tempted to lower it.
4. **Stryker's Vitest runner is still not usable on Vitest 5** and the command-runner workaround
   still ships. Not re-tested: nothing in this pass changed the runner, Vitest or the finding's
   premise, and the first pass records how to re-test it.
5. **The stamp decision lives in an untested CLI wrapper**, exactly as `scripts/mutation.ts`'s
   does. See open question 1.

**Open questions**

1. **Should the two mutation stamps become a tested `scripts/mutation/` package?** PLAN section 4
   says project self-checks live under `scripts/` as tested packages alongside the CLI shells that
   invoke them, and the ruling on my first pass' finding 4 said the same thing about
   `scripts/crap.mjs`: logic the gate depends on should be judged by a tier. Both stamps are now
   logic no tier judges. I followed the `scripts/mutation.ts` precedent rather than widening my own
   pass into a new package, because the extraction costs a stamp-format change that invalidates
   `.mutation/test-tier.json` and forces a full 754-mutant re-run, and because a package that only
   the two wrappers import is the shape the Architect's finding 4 disapproved of. If the answer is
   yes, the natural owner is the Cleaner, and the cheap moment to do it is a task that is paying
   for a full re-run anyway.

### Project manager rulings on the Hardener handoff

Verified independently: `npx tsc --noEmit` exits 0; `npm test` 119, `npx vitest run src` 54
(the D2a floor, intact), `npx vitest run acceptance` 65, `npm run test:property` 60,
`npm run test:hardening` 92, `npm run test:acceptance` 21 scenario executions; CRAP on the
changed files 7 files / 71 functions / 0 over the gate; `features/`, `qa/` and `src/` all
untouched. `node scripts/acceptance-mutation.ts` does exit 1 on `api-proxy.feature`, exactly as
reported. Accepted.

Shipping Stryker with `testRunner: "command"` is accepted. A mutation runner that reports 53
phantom survivors on a file whose mutants never execute is worse than no runner, and the note
records both the symptom and how to re-test the assumption before switching back. That is the
right way to leave a workaround behind.

The three open questions are settled as follows.

1. **`api proxy 1` gets separate stub and assertion columns. The skip list is refused.**
   Of the Hardener's two options, the first is correct: give the step pair its own columns holding
   the same value, so mutating either side breaks the equality and the mutant dies. That is not a
   redundant column in the sense the Specifier brief prunes: the brief prunes columns constant
   across all rows, and both of these vary by row. The two columns are what makes the scenario
   actually assert pass-through rather than assert a value against itself.

   The skip list is refused on principle. The survivor is not an equivalent mutant; it is acceptance
   mutation correctly reporting that the scenario cannot fail. Suppressing it would convert a true
   finding into a permanent blind spot and would teach every later task that a survivor is something
   to be filtered. No project-side skip list is to be added to `scripts/acceptance-mutation.ts`.

2. **Yes, commit `.mutation/stryker-incremental.json`, and never trim it.** `PLAN.md` section 4
   says mutation manifests are committed and never hand-edited, and the Hardener is right that
   trimming Stryker's own format would be hand-editing. 1.5 MB growing over six tasks is a cost
   worth paying for differential mutation, which the brief requires. If it ever stops being worth
   paying, the remedy is a plan-level decision to stop committing the manifest and accept full
   runs, made explicitly. It is never a silent trim.

3. **Yes, `scripts/crap.mjs` should be tested and mutated, and the Cleaner decides how.** The
   Hardener's reasoning is right: it is the one piece of project logic with no tier over it, and it
   gates every later task. Widening the coverage `include` to `scripts/**` changes what the gate
   measures, which is the Cleaner's call. This is assigned to the Cleaner pass in the resumed chain
   below.

**The chain resumes from the Specifier.** Fixing `api proxy 1` changes the Gherkin, which changes
the step vocabulary the handlers implement, so this is not a `qa/`-only edit that a single Specifier
pass can close out. Every downstream role runs again as a fresh agent: Specifier (fix the scenario,
and reconcile procedure D's counts against the tree, which now also carries the `hardening/` tier),
then Coder, Cleaner, Architect, Hardener, QA. The Hardener re-run is what proves the two survivors
are dead.


### QA

Done. The E2E QA procedures are executable and every one of them passes, along with every other
tier. Nothing committed; `features/` and `src/` are untouched.

**Verdict: task 01 passes QA.** One finding is recorded below for a later task, and it fails no
done criterion.

**What I added**

- `@playwright/test`, pinned `~1.56.1`, and `"test:e2e": "playwright test"`, under ruling 2 on the
  second Specifier pass. The pin is not a preference: `/opt/pw-browsers` holds Chromium build
  **1194**, which is what Playwright 1.56.x asks for. 1.57 wants 1200 and 1.55 wants 1193, so a
  caret range would put the browser out of reach on the next minor and the only fix would be
  `playwright install`, which the ruling forbids. Checked by reading `browsers.json` out of the
  packed tarball of each candidate version, then launching the browser.
- `README.md`: a `### npm run test:e2e` heading under `Available Scripts`, so E3's set equality
  still holds at nine scripts, plus an `e2e/` row in the layout table and a corrected `qa/` row -
  the old one said the procedures are executed by hand.
- `playwright.config.ts`: `testDir: e2e`, one worker, not parallel. The procedures bind port 4000,
  start dev and preview servers and edit a source file; none of that survives being run twice at
  once.
- `e2e/toolchain-commands.spec.ts` and `e2e/todo-app-regression.spec.ts`: **one test per procedure,
  one `test.step` per lettered row, named after it**, so a failure names the row rather than a line
  number. 11 tests, 58 seconds.
- `e2e/harness.ts` (run a command, start `npm run dev`/`npm run preview` and read the URL it
  prints, hold a backend on port 4000, see whether a port is still bound), `e2e/reports.ts` (pure
  parsing of what those commands print) and `e2e/todo-api-stub.ts` (the stub contract, as route
  interception).
- `.gitignore`: `test-results/` and `playwright-report/`. Playwright writes `test-results/` on every
  run, and E1 fails on generated output that is untracked but not ignored - the check working, and
  I am the role that added the generator.
- `tsconfig.json`: `e2e` and `playwright.config.ts` added to `include`. Every other directory of
  TypeScript in this tree is compiled by D6; leaving the QA tier out would have made it the one
  place where a type error is invisible. `npx tsc --noEmit` still exits 0.

**Nothing imports a project module.** The QA tier parses `npm run` output and README headings
itself rather than calling `acceptance/inspection.ts`, which does similar work. That is deliberate
duplication, not a DRY miss: a procedure that asks the project whether the project is right about
itself cannot fail when it is wrong.

**Where a procedure had to change to become executable**

Procedure and test moved together; the point of each row is unchanged, and no row got weaker.

| Row | Change | Why |
| --- | --- | --- |
| A1, A2 | `rm -rf node_modules` and `npm ci` run in a scratch directory holding copies of the two manifests | Deleting this project's `node_modules` deletes the runner executing the procedure. A3-A5 still read the checkout. |
| C2 | `ls dist` -> `ls -R dist` | Vite writes the JS and CSS to `dist/assets/`; `ls dist` shows a directory, and the row asks about the files in it. |
| D2, D10 | note that a file list needs `-- --reporter=verbose` through a pipe | Vitest prints one line per file in a terminal and only the summary through a pipe, so the row was unreadable exactly where a QA run happens. |
| D5 | says how to get the per-scenario breakdown: re-run the generated entry points with `npx vitest run --config vitest.acceptance.config.ts --reporter=verbose` | `npm run test:acceptance` forwards no reporter flag, so D3's own output carries the total but not the split D5 asks for. |
| E1 | run `git status --porcelain --ignored` before A-D **and** after, and compare | The old wording asked a human to tell generated paths from hand-edited ones by eye, which a test cannot do and a human does badly. Comparing the tree against itself needs no list, which is the property the fourth Specifier pass gave E1 and which this keeps. |

`qa/todo-app-regression.md` needed one line: the executable form serves the app with
`npm run preview`, so F1 sees one initial `GET api/todos/`. The row still accepts one or two, per
PM ruling 6.

**That the procedures bite, checked by breaking things rather than by argument**

Each change applied alone, the tier re-run, then reverted; `git status --short src features
vite.config.ts README.md` is empty afterwards.

| Break | Result |
| --- | --- |
| `TodoTextInput` stops trimming the new-todo text | **G3 red**, naming the POST body it got |
| the toggle-all `<label>` loses its `onClick` | **H3 red** |
| `Footer` always says `items` | **F5 red** |
| `vite.config.ts` loses `server.proxy` | **B5 red**. B4 stays green, because the dev server answers 200 with the SPA index page for an unproxied path - which is why B5 compares the bytes the backend served and B4 alone is not enough |
| a `###` heading in `Available Scripts` renamed | **E3 red** |
| `dist/` removed from `.gitignore` | **E1 red** |

**What I verified**

Every command run directly, in the tree as it stands, after the changes above.

| Command | Result | Covers |
| --- | --- | --- |
| `npm run test:e2e` | 11 passed (6 regression procedures, 5 toolchain procedures), 58s | done criterion 7 |
| `npm test` | 22 files / 214 tests, 0 failing, 0 skipped | D1 |
| `npx vitest run src` | 10 / 54 - the D2a floor, intact | D2a |
| `npx vitest run acceptance` | 4 / 49 | D2b |
| `npx vitest run scripts` | 8 / 111; 54 + 49 + 111 = 214 | D2c |
| `npm run test:acceptance` | 5 features parse, 5 entry points generate, 24 scenario executions pass | D3, D5 |
| `npx tsc --noEmit` / `--version` | exit 0, no output / `Version 5.9.3` | D6, D7 |
| `npm run test:property` | 11 / 95 | D8 |
| `npm run test:hardening` | 12 / 128 | D9 |
| `npm ci` from the lockfile into an empty tree | exit 0, no `react-scripts` in the output | criterion 1 |

The per-scenario D5 split was re-counted off the test names, not carried forward: 4 + 2 +
(3+1+1) + (3+8) + (1+1) = 24. `npm run test:mutation` and `node scripts/acceptance-mutation.ts`
were not run: procedure D excludes them by design and they are the Hardener's instruments.

**CRAP gate and DRY**

- `node scripts/crap.mjs e2e playwright.config.ts` reports **no measured files** and exits 2, which
  is exactly what `node scripts/crap.mjs property` does. The coverage include reaches `src/`,
  `acceptance/` and `scripts/`, so the QA tier sits where `property/` and `hardening/` sit. I did
  not widen the include: what the gate measures is the Cleaner's call, and the ruling on the third
  Cleaner pass already settled that test code is judged by whether it kills mutants of the code
  under test, not by tests over the tests.
- Because the gate cannot score it, I measured my own sources with the project's own
  `complexityByFunction` instead: the highest cyclomatic complexity anywhere in `e2e/` is **5**
  (`answer` in `todo-api-stub.ts`, a four-way dispatch on HTTP method - one job), and nothing else
  exceeds 4. Even at zero coverage that is a shape the gate would pass on complexity alone.
- Full tree for context: `node scripts/crap.mjs --reuse --all` is 40 files / 218 functions / **2
  over the gate**, unchanged - `executing` at 13.0, where the CRAP exception applies (one `case`
  answering one question) and which this task does not touch, and `callapimiddleware` at 30.0, IO
  outside this task's scope. Both are already ruled on.
- DRY: `plain()` is defined once in `reports.ts` and used by the harness; B3 and C5 share
  `expectTodoPage`, so C5's "renders exactly as it did in B3" is literally the same assertions;
  the regression spec's locators and its two call-count helpers are each defined once.

**One finding, for a later task, failing nothing here**

`npm run test:acceptance` leaves `dist/` holding a **development** React bundle, and the
`production build` scenarios are what put it there. `acceptance/fixtures.ts` builds with Vite's
JS API from inside Vitest, where `NODE_ENV` is `test`, so `react-dom` resolves to its development
entry: the artifact is 372,861 bytes and contains `react-stack-bottom-frame` and the other dev-only
strings, against 167 kB and none of them for `npm run build`. Nothing is red - those scenarios
assert status codes and asset references, which hold either way - and done criterion 3 is met,
because QA procedure C runs `npm run build` itself and checks that artifact. But a scenario named
`production build` is not building the production bundle, and anyone who runs `npm run preview`
after the acceptance tier is previewing a development one. **Owner: the Coder**, in whichever task
next touches the pipeline; the fix is to pin the mode or build to an outDir of its own so the
tier stops clobbering `dist/`. I did not fix it: nothing failed, and the fixture is not mine.

**Left for the next role**

- **Specifier, task 02:** `test:e2e` now exists in `package.json` and in `README.md`, and it wants
  a row in `toolchain dependencies 2`. I did not add one - `features/` is yours, and per the ruling
  on the fourth Specifier pass a row for a script that did not yet exist would have reddened the
  tier. The scenario is at 8 rows and would go to 9, taking the feature total from 24 scenario
  executions to 25; procedure D5 and D3's counts move with it.
- Nothing else is routed. `qa/` now has an executable form beside it, and the two change together
  from here on: a later task that changes a procedure changes its `test.step`, and a task that
  changes app behaviour changes both.

**Open questions**

None.


### Project manager rulings on the second Coder pass

Accepted, and accepted as a no-change pass. The Coder confirmed the Specifier's conclusion from the
mechanism rather than from the earlier note: it read the parsed IR, the handler patterns and
`runExecution`'s capture resolution, then proved the split bites in both directions by staging a
dithered copy outside `features/`, and separately proved the scenario is still wired to the proxy by
deleting `server.proxy` and watching both rows go red. That is what running a role with nothing to do
is supposed to look like. Adding no unit test for code it did not write is correct.

The Coder's open question is a real deadlock and is settled here.

**QA step E3 is too brittle to survive its own authorized change, and the Specifier fixes it.**
E3 requires the README to document "exactly the eight scripts `package.json` declares, and no
others", naming all eight. The `test:e2e` script that ruling 2 authorizes QA to add would fail E3
whatever the README says, and the Coder was right to flag it rather than edit either side.

This is not a one-off. `tasks/06-lint-typecheck-ci.md` adds `lint` and `typecheck`, so a frozen
literal list would fail again there. E3 is to be re-expressed as a set equality evaluated against the
tree at the time QA runs it: the scripts documented in the README and the scripts `package.json`
declares must be the same set, with neither side hardcoded into the procedure. That keeps the check's
teeth, which are that the README neither omits a script nor invents one, while removing a number that
goes stale every time any task adds a command.

**A targeted Specifier correction runs now, and the chain then continues from the Cleaner.** The
Coder is not re-run. The earlier resume from the Specifier was warranted because changing example
columns changes the parsed IR and therefore the step vocabulary the handlers implement. Rewording a
Markdown verification procedure changes no feature file, no IR, and no code, so there is nothing a
fresh Coder could reach a different conclusion about, and its immediately preceding pass already
verified every tier against the current tree.


### Project manager rulings on the fourth Specifier pass

Verified independently: only `qa/` and this task file changed; the `Available Scripts` section
documents exactly the eight scripts `package.json` declares, so E3 holds; `git status --porcelain
--ignored` lists `bin/ build/ coverage/ dist/ node_modules/` as ignored with nothing untracked, so
E1 holds. Accepted.

The pass did more than the ruling asked, correctly. It was spawned for E3's false-failure trap and
found that **E1 carried the mirror defect**: it named a frozen list of generated directories that
had already gone stale, so a `coverage/` directory left untracked-but-unignored would have passed
E1 silently. A verification step that cannot fail is worse than one that fails wrongly, because
nothing surfaces it. Deriving the paths from `git status --porcelain --ignored` fixes the cause both
steps shared, which is a snapshot of the tree frozen into a procedure. Its reasoning for leaving E2
and E4 alone is also right: E2's literals are a negative check on names this task removed for good,
and E4 already asserts only documented-implies-present, the direction that does not false-fail.

Procedure E's fail clause now fails in both directions, which closes the same hole: a declared
script the README never documents used to be a silent pass.

One item is carried forward rather than fixed here. When QA adds `test:e2e`, it must add the script
to `package.json` and a heading under `Available Scripts`, and must **not** add a row to
`toolchain dependencies 2`, because `features/` is the Specifier's. Nothing fails as a result:
`toolchain dependencies 2` only asserts that the scripts it lists exist, so an unlisted ninth script
reddens nothing. It is a coverage gap, not a defect. QA records the script in its handoff note and
the Specifier pass at the start of task 02 adds the row.

**The chain continues from the Cleaner.** The Coder is not re-run, for the reason already recorded:
this pass changed no feature file, no IR and no code.


### Project manager rulings on the third Cleaner pass

Verified independently: `npx tsc --noEmit` exits 0; `npm test` 21 files / 209 tests;
`npx vitest run src` holds the D2a floor at 10 / 54; `npx vitest run scripts` 6 / 90;
property 60; hardening 92; `npm run test:acceptance` 24 scenario executions; the gate on
`scripts` is 6 files / 48 functions / 0 over; `scripts/crap.mjs` is 77 lines against 291.
`features/`, `qa/` and `src/` untouched. Accepted.

Ruling 3 is discharged, and discharged the right way. Testing the tool through its CLI would have
pinned its output rather than its judgments; splitting the four jobs out of the shell first and
testing those is what makes the gate's own logic reviewable. Proving old and new produce
byte-identical output over six invocations including every error path is the correct evidence that a
split of this size preserved behavior. Widening the include to `scripts/**/*.ts` rather than
`scripts/**` is also right: it is opt-out, so a new module lands inside the gate by default, while the
CLI shells stay excluded with the other adapters.

Two of its findings are worth recording. The dead branch in `functionName` was an unkillable mutant,
so removing it makes a later mutation score honest rather than merely tidier. And `TIERS` living where
nothing could read it is the same defect class that caused the earlier correction pass: a tier that
measures but is never merged. A spec asserting that the tier list is every root config importing
`measuredCoverage`, checked to go red when a tier is dropped, closes the class rather than the
instance.

Applying the CRAP exception to `executing` and recording it is exactly the disposition the earlier
ruling called for. No waiver list was needed, as expected.

The two open questions are settled as follows.

1. **The tool's unit tests stay in the unit tier.** `npx vitest run scripts` already separates them,
   and a D2c step makes them attributable the same way D2a and D2b do for `src` and `acceptance`.
   Attribution comes from the split, not from a tier boundary; inventing a fourth command to keep
   `npm test` at a smaller number would buy nothing and cost a command.

2. **`hardening/` and `property/` being judged by nothing is not a gap to close.** Test code is
   judged by whether it kills mutants of the code under test, which is what the mutation tier already
   does. Adding tests over the tests is an infinite regress that buys no signal. Recorded so it is not
   raised again as an open item.

**Procedure D's reconciliation stays deferred to the single Specifier pass scheduled between the
Hardener and QA,** as already ruled. The Architect and Hardener will both move those counts again;
reconciling now would be the third reconciliation of the same numbers in one task. The Cleaner is
right that it is the one thing that fails QA as written, and that pass is what fixes it.

The Cleaner's two routed items stand: the Architect covers `scripts/crap/`'s unenforced core/shell
split with the machinery `acceptance/layering.ts` already has, and the Hardener adds
`scripts/crap/*.ts` to Stryker's `mutate` and a `scripts` entry to `mutationTierTests`.


### Project manager rulings on the second Architect pass

Verified independently: `npx tsc --noEmit` exits 0; `npm test` 22 files / 214 tests, split
54 src + 49 acceptance + 111 scripts, which is exhaustive; `npx vitest run src` holds the D2a floor
at 10 / 54; property 95; hardening 92; `npm run test:acceptance` 24 scenario executions;
`src/`, `features/`, `qa/` and `.mutation/` untouched. Accepted.

Moving the layering checker out of `acceptance/` is accepted, and it improves conformance with the
plan rather than bending it: `PLAN.md` section 4 says `acceptance/` holds project-written *pipeline*
parts, and a checker that governs the whole tree was never one. Having it govern from outside
everything it governs, including itself, is the right shape. Collapsing the core/shell decision to a
single owner is the same correction the Cleaner made to `TIERS`, applied one level up.

The two open questions are settled as follows.

1. **`scripts/architecture/` is the right home. Keep it.** In this repository `scripts/` already
   means the project's own tooling: the CRAP gate, the acceptance runner, the mutation runner. A
   self-check is tooling, and `scripts/crap/` set the precedent for a tested core living there. A
   top-level `architecture/` would read as application architecture rather than as a checker, and it
   would cost a config glob in three files plus a fourth QA attribution bucket in a procedure that has
   already absorbed more count churn than anything else in this task. Promoted to a shared convention
   in `PLAN.md` section 4 so no later task relitigates it.

2. **`vitest.coverage.ts` importing `scripts/architecture/packages.ts` is correct. Keep it.** The
   Architect's reading is right: a config is a shell, and a shell asking policy what the shells are
   is the dependency pointing inward. The alternative it names, two lists plus a spec requiring they
   agree, is precisely the duplication this task has spent three passes removing, and the `TIERS`
   defect showed what a restated derived fact costs when nothing reads the restatement.

Findings 1 to 5 in the Architect's note are already dispositioned: 1 and 2 to task 04, 3 to task 04
by the earlier ruling that amended its scope, 4 accepted as a known limitation, 5 judged correctly
as runtime contract rather than accidental API. Nothing new is needed.

Test counts moved again, as expected, and stay deferred to the single Specifier pass scheduled
between the Hardener and QA. The Architect recorded them in a table for that pass, which is what the
ruling asks for.


### Project manager rulings on the second Hardener pass

Verified independently, including the thing this pass existed to prove. `node
scripts/acceptance-mutation.ts` exits 0. Because a differential run skips what the manifest already
records as killed, I forced a full run by removing `.mutation/gherkin/api-proxy.manifest` and
re-running: **6 candidates, 6 killed, 0 survived**, then restored the manifest. The two `api proxy 1`
survivors are genuinely dead, not skipped. Also verified: `npx tsc --noEmit` exits 0; `npm test`
22 files / 214 tests; `npx vitest run src` holds the D2a floor at 10 / 54; property 95; hardening
12 files / 128 tests; `git status --short src features qa` is empty. Accepted.

Three things in this pass are worth recording beyond the result.

1. **A tight timeout ceiling silently converts survivors into kills.** Stryker scores a `Timeout` as
   *detected*, so a mutant that would have survived is recorded as killed whenever it happens to run
   slow. Two `complexity.ts` mutants came back `Timeout` under the default ceiling and die by hand in
   3.6 seconds. Raising `timeoutMS` to 60s with the reason in the config is the right fix, and this
   belongs in the project's institutional memory: a mutation score is only as honest as its slowest
   legitimate mutant. Later tasks that mutate `src/` should not lower it without measuring.

2. **`PACKAGES = []` was a live survivor, and it made `packages.spec.ts` pass vacuously.** A test
   that iterates an empty list and asserts nothing is the failure mode that mutation testing exists
   to catch, and it was sitting in the architecture checker added one role earlier. That is the
   third time in this task that the instrument, not the product, carried the defect.

3. **`stryker.config.json` became `stryker.config.mjs` with `mutate: modulesIn('core')`.** That
   retires the third and last restatement of the core/shell decision, after the layer map and the
   coverage exclude. Declaring a module a shell now removes it from the CRAP gate and from mutation
   in one edit. Verified equal before the switch and instrumenting the same 726 mutants after.

Splitting nothing under the mixed-job hint is accepted: the note records per-file mutant counts and
argues the two largest sources are long because one job has many cases, which is exactly the
distinction the hint draws.

**One correction for the Specifier pass that follows.** The measured acceptance-mutation candidate
count is **24**, not the 28 the previous Specifier note estimated. Nothing in `features/` or `qa/`
carries the wrong number, so nothing is broken, but the Specifier pass should not propagate 28 into
a procedure. The only QA count this pass moves is D9, `npm run test:hardening`, from 7 / 92 to
12 / 128.

**Next: the single Specifier pass to reconcile QA procedure D against the tree, then QA.**


### Project manager rulings on the QA handoff

QA's own verification is accepted and its work is good. It converted both procedure files into
executable tests, pinned `@playwright/test` to `~1.56.1` after reading `browsers.json` out of each
candidate tarball to find the one matching the Chromium build already on disk (a caret range would
eventually demand `playwright install`, which is forbidden here), and it proved the procedures bite
rather than assuming it: dropping `.trim()` reddens G3, removing the toggle-all `onClick` reddens H3,
deleting `server.proxy` reddens B5, un-ignoring `dist/` reddens E1. Measuring its own sources with
`complexityByFunction` when the coverage-based gate reports "no measured files" is the right
substitute rather than skipping the check.

**Task 01 does not close yet.** QA's finding is more serious than "failing nothing here", and I
verified it directly: `npm run build` produces a 167,067-byte bundle, while `npm run test:acceptance`
leaves a 372,861-byte one containing development-mode React warnings. QA named
`react-stack-bottom-frame` as the marker and that string is absent, but the substance is confirmed by
size and by seven occurrences of `Warning:` in the acceptance-built artifact.

The reason this blocks is not the stale `dist/`. It is that **`production build 1/2/3` cannot fail
for the reason it exists.** Every one of its assertions - a bundle is served, referenced assets
return 200, the index does not reference `/src/index.tsx` - holds equally of a development bundle.
The scenario is named for a distinction it cannot detect. That is the same defect class as
`api proxy 1` asserting a value against itself, which this task already refused to suppress, and it
would be inconsistent to accept it now because the tier happens to be green.

**The chain resumes from the Specifier**, because both halves need fixing and they belong to
different roles:

- The Specifier strengthens `features/production-build.feature` so the scenario can tell a production
  bundle from a development one, asserting something only the production build exhibits. It should
  choose the observable itself; size ratio and the presence of development-mode warning text are both
  available, and the numbers above are measurements it can re-take rather than values to copy.
- The Coder then fixes `acceptance/fixtures.ts`, which drives Vite's JS API from inside Vitest where
  `NODE_ENV=test`, so `react-dom` resolves to its development entry.

Then Cleaner, Architect, Hardener and QA run again as fresh agents. The Hardener re-run matters
here for the same reason it did last time: acceptance mutation is what will confirm the strengthened
scenario actually kills a mutation of whatever new observable the Specifier picks.

**Carried to the task-02 Specifier:** `test:e2e` now exists and wants a row in
`toolchain dependencies 2`. QA correctly did not add it.


### Project manager rulings on the sixth Specifier pass

Verified independently: `features/production-build.feature` gains `production build 4` with two
marker rows; `npm run test:acceptance` reports `2 failed | 24 passed (26)`, both failures the new
rows; only `features/`, `qa/` and this task file changed. Accepted.

Two things in this pass are worth recording as standing guidance.

1. **Asserting presence rather than absence is the right call, and the reason generalizes.** The
   Specifier's argument is that "contains no development warning text" cannot be mutation tested,
   because the mutator rewrites one example cell at a time and a dithered copy of an absent string is
   still absent, so every such row would survive by arithmetic. That is the `api proxy 1` defect
   class seen from the other side, and the same objection kills size thresholds. Any later task
   tempted to specify an absence should read this first.

2. **Appending as scenario 4 rather than renumbering** keeps `1/2/3` on their stable indices and
   leaves the stored mutation manifest's recorded kills reusable, with `Background` untouched so its
   hash holds. That is the manifest-preservation rule applied correctly without hand-editing
   anything.

Letting the dry checker settle the wording, rather than defending a first draft that drew a real
`placeholder-variant` and a 0.545 `possible-synonym`, is the tool being used as intended.

**One requirement on the Coder, which the current red state does not yet satisfy.** The two failing
rows currently fail with `unsupported step text`, not because the marker is absent. That proves the
step is unimplemented; it does not yet prove the scenario detects a development bundle. The Coder
must therefore demonstrate the intermediate state explicitly: after adding the step handler but
before fixing `acceptance/fixtures.ts`, `production build 4` must fail *because the markers are
missing from the artifact*, and only then does the fixture fix turn it green. That ordering is the
evidence that the scenario discriminates rather than merely passing once the fixture changes. Record
both observations in the handoff note.


### Project manager rulings on the fourth Coder pass

Verified independently: `npm run test:acceptance` is green at 5 files / 26 scenario executions; the
artifact the acceptance tier leaves in `dist/` is **md5-identical** to what `npm run build` produces,
167,067 bytes carrying the production marker; `npx tsc --noEmit` exits 0; `npx vitest run src` holds
the D2a floor at 10 / 54. Accepted.

The ordering requirement is met, and met exactly. With the handler added and the fixture untouched,
the two rows failed on the marker being missing from the body rather than on `unsupported step text`;
the fixture fix then turned them green; and putting the child's `NODE_ENV` back to `test` reddens
precisely those two rows and no others. That sequence is what distinguishes a scenario that
discriminates from one that merely passes.

The root cause is worth recording, because it is not obvious and it will outlive this task:
**Vite decides production-ness from `process.env.NODE_ENV`, not from `mode`,** and Vitest sets
`NODE_ENV=test`. The Coder measured this rather than assuming it: `--mode production` changes nothing,
while `NODE_ENV=test npx vite build` emits the 372,861-byte development bundle. Any later task that
drives a Vite build from inside a test runner will hit the same trap.

Lifting the judgment out of `bodyContains` into `responseContains` so a fetched bundle can be judged
without clobbering the Background's index response is the right shape, and keeping the message text
unchanged is why the hardening tier still passes untouched. Failing on none *and* on more than one
script, rather than guessing, is the correct treatment of an ambiguous world.

Nothing is routed back. Counts moved as expected and are recorded for the reconciliation that
precedes QA; `.mutation/` is deliberately untouched, so the gherkin manifest's `implementation_hash`
and `test-tier.json`'s `tier_hash` are stale by construction for the Hardener's re-run, which is the
correct state to hand over rather than something to fix by hand.


### Project manager rulings on the fourth Cleaner pass

Verified independently: `npx tsc --noEmit` exits 0; `npm test` 23 files / 224 tests;
`npx vitest run src` holds the D2a floor at 10 / 54; `npm run test:acceptance` 26 scenario
executions; six changed files, all under `acceptance/` and all files the Coder's pass touched;
`features/`, `qa/`, `e2e/`, `src/`, `.mutation/` and every config untouched. No test count moved,
so procedure D needs nothing from this pass. Accepted.

The `runCommand` change is the one that matters: its third parameter is now *overrides* merged onto
`process.env` inside the function rather than a whole replacement environment. The caller previously
had to know that a child process must inherit the parent environment, which is knowledge a caller
asking for one variable should not need to carry. That is the right kind of local coupling to remove,
and checking it in the failing direction - flipping `NODE_ENV` back to `test` and confirming exactly
the two `production build 4` rows redden and nothing else - proves the merge actually applies the
override rather than silently keeping the parent value.

Its three refusals are all correct and worth recording, because each is a case where the obvious
cleanup would have been wrong:

- The `compilationSucceeded` / `runProductionBuild` failure judgments stay duplicated. Same shape,
  different knowledge: one is a step assertion, the other a fixture refusing to continue. Merging
  them would couple a spec judgment to a fixture's control flow.
- `CommandResult` and `Compilation` stay as two names for the same shape, for the same reason.
- `fixtures.ts` was not split, because the only candidate half reads module-private mutable state, so
  the split would widen shared mutable state to lower a count. That is precisely what the mixed-job
  hint forbids: never split a one-job source to lower counts.

CRAP on changed measured files is 0 over the gate across 30 functions. The two whole-project
offenders are the same pre-existing `src/` functions dispositioned several passes ago, with the
documented exception applied to `executing` and recorded.


### Project manager rulings on the third Architect pass

Verified independently: `npx tsc --noEmit` exits 0; `npm test` 23 files / 228 tests;
`npx vitest run src` holds the D2a floor at 10 / 54; `npm run test:property` 14 files / 141;
`npm run test:acceptance` 26 scenario executions; renaming `scripts.build` to `bundle` reddens the
tier with `package.json declares no "build" script to run`, naming the scripts it did find;
`src/`, `features/`, `qa/`, `e2e/`, `.mutation/` and every config untouched. Accepted.

**The find is the same defect class that reopened this task, caught one level further out.** The
fixture ran `node_modules/.bin/vite build` while `package.json` declares `"build": "vite build"`: two
statements of how this project produces a production bundle, agreeing by coincidence. In the
acceptance tier that coincidence is load-bearing, because `production build 1-4` assert about the
bundle this project *ships*. Change the declared script and the tier would have stayed green while
testing an artifact nobody deploys. Having the fixture ask `package.json` what the build command is
converts the coincidence into a dependency, which is what the tier needed to mean what it claims.

Leaving `typescriptCompiler` a constant is correct and correctly reasoned: `tsc --noEmit` has no npm
script to ask, and an earlier ruling bars adding one in this task because task 06 owns it. Deriving
one call site and not the other would have been consistency for its own sake.

On the property tier: aiming it at `assertions.ts` first is the right priority, since that is where
every acceptance step's verdict is decided and where this chain added two judgments. And the
generator that initially let `crap > max` survive as `>=` was fixed in the *generator*, not the code
under test. That is the correct response to a surviving mutant in a property test - the property was
not exercising the boundary, so the property was wrong, not the boundary.

Counts moved and are recorded for the reconciliation pass that precedes QA: D1 228, D2b 63, D8 141,
with 54 + 63 + 111 = 228 still exhaustive. D2's file list does not move, since no spec file was added
or renamed.


### Project manager rulings on the third Hardener pass

Verified independently: a forced acceptance-mutation run against emptied manifests gives
**26 candidates, 26 killed, exit 0**, with `production build`'s 5 among them; `npx tsc --noEmit`
exits 0; `npx vitest run src` holds the D2a floor at 10 / 54. Accepted.

**The main finding is correct, it is the most consequential in this task, and it corrects me.**
The gherkin manifest's `implementation_hash` never covered the implementation: it hashes the
generated entry point, a short loader naming its feature and IR path, so nothing in `steps.ts`,
`assertions.ts` or `fixtures.ts` reaches it. Three handoff notes and one of my own rulings asserted
that this hash had gone "stale by construction" and would therefore force a re-test. It would not
have. I verified the blind spot and the fix in both directions: with manifests present and
`responseContains` weakened to fold case, the run skipped all 26 and exited 0; with the new
`.mutation/acceptance-implementation.json` stamp in place, the same weakening re-tests and reports
7 survivors with exit 1.

That is the third instance in this task of an *instrument* carrying the defect rather than the
product, after the property tier measuring coverage that was never merged and `PACKAGES = []` making
a spec pass vacuously. The pattern is now established well enough to state as standing guidance:
**a check that cannot fail is worth less than no check, because it also suppresses the search for
one.** Every later task should test its instruments in the failing direction before trusting a green
result from them.

Writing no hardening tests is correct: all 28 new mutants were already killed by the Coder's unit
spec and the Architect's properties, and the Hardener confirmed the instrument reaches the new code
by skipping the `scriptArgv` tests and watching 9 survivors return. Adding tests that kill nothing
would be noise.

**The open question is answered, but not here.** The two mutation stamps do hold logic no tier judges,
and the precedent set when `scripts/crap.mjs` was brought under test says they should be. It is not
reopened in task 01: the stamp is new, the Hardener has demonstrated it working in both directions,
and it bears on none of this task's done criteria. It is recorded as carried work in `PLAN.md`
section 4 and named in `tasks/02-testing-library-suite.md`, owned by that task's Cleaner.

**Next: the Specifier reconciliation pass over QA procedure D, then QA.**


### Project manager rulings on the seventh Specifier pass

Verified independently: `npm test` 23 files / 228 tests; `npx vitest run src` holds the D2a floor at
10 / 54; `npx vitest run acceptance` 5 / 63; `npm run test:property` 14 / 141;
`npm run test:acceptance` 27 scenario executions; `src/`, `e2e/`, `.mutation/`, `acceptance/` and
every config untouched. Accepted.

**Finding 2 is the one that mattered.** Procedure C carried a caveat telling QA that `npm run
test:acceptance` may replace `dist/` with a build C1 did not make, and to re-run C1. That was written
when the fixture built a development bundle, and it instructed QA to paper over *precisely the defect
`production build 4` was added to catch*. A verification procedure that tells the verifier to work
around a real difference is worse than one that omits the check. Turning it into a finding when the
two readings differ is the correct inversion, and hashing `dist/` before and after to prove they are
now byte-identical is the right evidence.

**Finding 1 corrects the record, including my own.** The third-Architect ruling states that D2's file
list did not move; `acceptance/assertions.spec.ts` is in the tree and in the `npm test` list, so it
did. And D9 was recorded as moving but had not. Reconciling by running the commands rather than by
copying numbers out of handoff notes is exactly why that instruction was given, and it caught two
errors that would otherwise have reached QA as false failures.

**The mutation state left by the feature change is verified, so no Hardener re-run is ordered.**
Adding a row to `toolchain dependencies 2` moves that scenario's IR hash, which the Specifier
correctly predicted would retire its recorded kills. I ran `node scripts/acceptance-mutation.ts`
myself: it re-tested exactly that scenario's **9 candidates and killed all 9**, while skipping the
scenarios whose hashes are unchanged. That is both the prediction confirmed and independent evidence
that the manifest mechanism the Hardener rebuilt discriminates at the right granularity.

**Next: QA. This is the third time task 01 has reached it.**

