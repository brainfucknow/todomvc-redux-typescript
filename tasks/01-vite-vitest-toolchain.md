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

### Cleaner

### Architect

### Hardener

### QA
