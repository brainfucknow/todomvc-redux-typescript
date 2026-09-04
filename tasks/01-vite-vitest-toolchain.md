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

