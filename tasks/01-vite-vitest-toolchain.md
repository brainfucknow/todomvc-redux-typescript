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

### Architect

### Hardener

### QA
