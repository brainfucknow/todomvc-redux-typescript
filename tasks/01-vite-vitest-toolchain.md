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

### Project manager rulings on the Specifier handoff

The Specifier handoff is accepted. Its assumptions and open questions are settled as follows.
These are now part of the task, not open items.

1. **QA procedures live in `qa/`.** Accepted and promoted to a shared convention in `PLAN.md` section 4.
2. **Build output is `dist/`.** Accepted; it is Vite's default and matches the `.gitignore` line this task's scope asks for.
3. **Done criterion 6 is checked with `npx tsc --noEmit`.** Correct. `PLAN.md` section 5 assigns the `typecheck` script to task 06. If the coder adds a `typecheck` script anyway, that is a scope violation for this task, not a reason to add an example row.
4. **Dev and preview ports are the coder's to configure.** No scenario or QA step pins one, and none should.
5. **Scenario-name comment placement.** The current reading stands: a comment line carrying the scenario name immediately before each `Scenario:`. Promoted to a shared convention in `PLAN.md` section 4 so later tasks match.
6. **StrictMode firing `GET api/todos/` twice in development.** QA procedure F is right to accept both counts here. This task must not change application behavior, and `tasks/03-react-19.md` already owns the question of whether StrictMode produces a duplicate load. Do not assert an exact count in task 01 and do not "fix" the double fire in task 01.


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

### Hardener

### QA
