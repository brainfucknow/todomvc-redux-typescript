# Task 08: Dependency hygiene and CI release checks

**Track:** Tooling
**Chain:** coder -> QA
**Status:** in progress

## Why this task is now the most load-bearing one left in the tooling track

Tasks 04, 05 and 06 built four gates: `lint`, `format:check`, `typecheck` and
the E2E suite. CI runs **none** of them. It still runs `npm ci`, `npm run build`
and `npm test` on `actions/checkout@v1`.

Task 06's QA put the consequence plainly: a gate nobody runs automatically is
close in effect to one that cannot fail. `typecheck` has been in that position
since task 05, and the whole point of task 05 was that the project had been
passing a typecheck that checked nothing. Wiring these up is the difference
between this project having been modernized and merely appearing to have been.

## Goal

Close out the tooling track: remove dependencies nothing uses, and make CI run every check the project now has.

## Context

`.github/workflows/nodejs.yml` runs `actions/checkout@v1` and `actions/setup-node@v1`, both long superseded, on a single-entry Node 22 matrix. It runs `npm ci`, `npm run build`, and `npm test`. It does not lint, does not typecheck, and does not run the E2E regression suite.

Dependency debt still standing after tasks 02 through 07:

- `redux-thunk` is a direct dependency but nothing imports it. Redux Toolkit's `configureStore` includes thunk in its default middleware.
- `reselect` is a direct dependency; `@reduxjs/toolkit` re-exports `createSelector`.
- `@types/classnames` is present, but `classnames` has shipped its own types for years.
- `@types/jest` and `@types/node` may be unused after task 03 and task 05.

`README.md` still documents `npm run eject` and describes the project as a Create React App template.

## Scope

- Consider a guard against `propTypes` returning. Task 07 deleted all three blocks and dropped `prop-types`, but found that `@types/react` 19 still declares `propTypes?: any`, so a block that crept back would be dead code that React 19 ignores and **no gate catches**. It proved this by planting one: typecheck reported zero errors, while a real type error in the same file was caught immediately. The gate is live; `propTypes` simply is not a typed construct. Task 07's QA refined this: a block written *with* its `prop-types` import does fail typecheck, but only incidentally, as TS7016, because `prop-types` is still resolvable through `eslint-plugin-react` and ships no types. It still builds, and it bundles prop-types back into the browser for about 0.8 kB. The dangerous shape is therefore the **bare assignment** with no import, which passes typecheck, lint, tests and build alike. Target that. A grep in CI is the only thing that works, and it is cheap. Decide whether it earns a step.
- Remove every dependency nothing imports. Verify by search, not by assumption, and name what you checked in the handoff.
- Rewrite the workflow: current `actions/checkout` and `actions/setup-node` majors, npm caching, and steps running install, lint, format check, typecheck, unit tests, production build, and the E2E regression suite against the built app.
- The E2E command CI must run is `npm run test:e2e`. QA also added supplementary dev-server and preview-server suite configs in task 04; those are optional in CI, and procedure 20 is annotated as excluded there because a transport failure cannot be delivered through an HTTP proxy. If you do wire them in, confirm they are green first and say why you included them.
- Choose the Node version matrix deliberately and say why in the handoff.
- `scripts/typecheck.mjs` has no test, and task 04's repairing coder judged that adding one there would have moved the unit suite's file and test counts, which that task's done criteria pinned. It belongs here: its own Vitest project in a Node environment, separate from the jsdom unit suite, driving the script's failure conditions. Add it, and keep the two projects' counts reportable separately so a later task can still pin either.
- `scripts/typecheck.mjs` must be trustworthy before CI depends on it. Task 04's architect found it returns a false green when `tsc` never runs: its error branch catches only a failure to spawn `npx`, so if `npx` spawns but cannot resolve `tsc`, that stderr is counted as a dependency diagnostic and the script reports `0 error(s) under src/` and exits 0. A repair landed before task 04 closed: the script now resolves the compiler through `typescript/package.json` and spawns it directly, so `npx` is out of the pipeline and cannot masquerade as a diagnostic, and it refuses to report success unless it parsed a complete report. Confirm it holds under CI's environment, where a missing binary is far likelier than it is locally.

  Task 05 additionally fixed a cwd-relative classification bug that made the gate exit 0 from any subdirectory. Verify that holds in the workflow, and never set a `working-directory:` on the typecheck step without re-proving it.

  One hole is known and named rather than closed: a `typescript` that resolves, runs, exits 0 and prints nothing is indistinguishable from a clean compile from outside the process. Closing it needs a canary fixture, which a stub could also fake. Decide whether CI warrants that; if not, say so and leave it.
- Rewrite `README.md` to describe the actual stack and the actual commands.

## Out of scope

- Adding a hosting deployment. The repository has none today and adding one is new behavior.
- Upgrading dependencies that are merely not-newest. This task removes the unused; it does not chase versions.
- Bumping ESLint to 10. Task 06 established with evidence that two plugins cap at 9 today: `eslint-plugin-react` 7.37.5 declares `^9.7` and `eslint-plugin-jsx-a11y` 6.10.2 declares `^9`, both at their latest published versions, and neither has a usable prerelease. The other four lint packages already accept `^10`. Reaching 10 now would need `--legacy-peer-deps` or an `overrides` entry, which bakes an untested claim into every `npm ci`, and a plugin that fails to load leaves `npm run lint` exiting 0. If you find on this task that both plugins have published support, say so; the bump then wants its own task with its own falsification pass, not a quiet version edit here.
- Any change under `src/` beyond deleting imports of removed dependencies.

## Done criteria

- Every remaining dependency is imported somewhere, or is a tool invoked by a script, and the handoff says which.
- The workflow runs lint, format check, typecheck, unit tests, build, and the E2E suite, and passes.
- All local commands pass: `npm run lint`, the format check, `npm run typecheck`, `npm test`, `npm run build`, `npm run preview`, and the regression suite.
- `README.md` contains no reference to Create React App, `react-scripts`, or `eject`, and every command it documents exists.

## Handoffs

### Coder

Working tree only, nothing committed. Branch still at `c386004`; it did not move
under me. No file under `src/` or `qa/` changed.

#### What changed

- **`package.json`** - `redux-thunk` removed (nothing imports it; `npm ls`
  confirms it is still installed as `@reduxjs/toolkit`'s own dependency, so
  `configureStore`'s default middleware is unaffected). Two scripts added,
  `test:unit` and `test:scripts`. `npm uninstall redux-thunk` touched exactly one
  line of `package-lock.json`.
- **`scripts/typecheck-gate.mjs`** (new) - the gate's decisions, extracted from
  the script. It raises `GateFailure` instead of calling `process.exit`, and the
  only thing in it that touches a process is `spawnCompiler`.
- **`scripts/typecheck.mjs`** - now the entry point only: the two absolute
  project paths, the compiler, stdout, and the exit code. Same output, same
  exit codes, same cwd independence.
- **`scripts/typecheck-gate.spec.mjs`** (new) - 16 tests, one for each of the
  three false greens plus the surrounding conditions.
- **`vite.config.mts`** - two Vitest projects: `unit` (jsdom, `src/**/*.spec.
  {ts,tsx}`) and `scripts` (node, `scripts/**/*.spec.mjs`). Counts stay
  separately pinnable: `npm run test:unit` -> 10 files / 55 tests, exactly the
  pre-existing numbers; `npm run test:scripts` -> 1 file / 16 tests; `npm test`
  runs both -> 11 files / 71 tests.
- **`.github/workflows/nodejs.yml`** - rewritten. `actions/checkout@v5`,
  `actions/setup-node@v5` with `cache: npm`, then `npm ci`, lint, format check,
  typecheck, unit tests, build, the propTypes grep, the Playwright browser
  install, and `npm run test:e2e`. `permissions: contents: read`,
  `timeout-minutes: 20`, and an `if: failure()` upload of `qa/.artifacts/`.
- **`README.md`** - stack table, the two Vitest projects, the three E2E
  commands and the procedure-20 skip, the browser prerequisite, and a CI
  section. It documented no CRA/`react-scripts`/`eject` reference before this
  task and documents none now; every command it names exists in
  `package.json` (checked one by one).

#### Every remaining dependency, and why it stays

Verified by grep over `src/`, `qa/`, `scripts/`, `index.html` and the root
configs - not by assumption.

| Dependency | Kept because |
| --- | --- |
| `@reduxjs/toolkit`, `react`, `react-dom`, `react-redux`, `redux`, `classnames`, `todomvc-app-css` | imported from `src/` |
| `reselect` | imported by `src/selectors/index.ts` - see the open question below |
| `typescript` | the compiler `scripts/typecheck.mjs` spawns, and what `typescript-eslint` parses with |
| `@types/react`, `@types/react-dom` | the app's React types |
| `@types/classnames` | **load-bearing, contrary to this task's premise.** The lockfile pins `classnames` **2.2.6**, which ships no declarations. Proved it: moving `node_modules/@types/classnames` aside makes `npm run typecheck` fail with three TS7016s, one per importing component; restoring it returns 0. Types have shipped with `classnames` since 2.3.0, so dropping this needs a `classnames` upgrade, which this task's "does not chase versions" rules out. |
| `@types/node` | `qa/tsconfig.json` names it in `types`. Proved it: `tsc --project qa/tsconfig.json --typeRoots /nonexistent` fails TS2688 "Cannot find type definition file for 'node'". |
| `@testing-library/react` | imported by the specs and `src/test-support/` |
| `@testing-library/dom` | peer of `@testing-library/react` 16, which declares it rather than bundling it (`peerDependencies: {"@testing-library/dom": "^10.0.0"}`) |
| `@playwright/test` | imported by `qa/` and run by `test:e2e*` |
| `vite`, `vitest`, `@vitejs/plugin-react`, `jsdom` | build and test runner; `jsdom` is the `unit` project's environment |
| `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `eslint-config-prettier`, `globals` | all required by `eslint.config.js` |
| `prettier` | `format`, `format:check` |

`@types/jest` was already gone before this task. `redux-thunk` is the only
removal.

#### The typecheck gate's tests

The three false greens, each with a test named for the shape rather than the
tool, because the next one will arrive through a different tool:

1. **The compiler never ran and complained on stderr** (`npx` resolving no
   `tsc`; its stderr was merged into the report and counted as a diagnostic
   about something other than the app). Tests: stderr with a non-zero exit,
   stderr with a *zero* exit, `run.error`, `run.signal`.
2. **The compiler ran and compiled nothing** (a project-level diagnostic such
   as TS18003 names no file, so a file-counting gate sees an empty report).
   Tests: TS18003 on stdout; and non-zero exit with an empty report.
3. **The verdict depended on the working directory** (tsc prints paths relative
   to where it started; the gate classified them by a `src/` prefix, so from a
   subdirectory every real error read as somebody else's). Tests: a `qa/`
   project diagnostic must be reported as `qa/tests/...` and not as `tests/...`;
   a real fixture project one directory below its root, compiled by the real
   tsc, must report `qa/subject.ts(1,14)`; and the real `typecheck.mjs` run as a
   subprocess must give byte-identical stdout and the same status from the
   repository root and from `src/`.

Two more cover the resolution step (it finds *this project's*
`node_modules/typescript/bin/tsc`, and it reports a resolution failure rather
than falling back to a PATH lookup), one covers elaboration lines staying with
their diagnostic, and one covers unreadable output.

I did not trust the tests until they failed. Five mutations of
`typecheck-gate.mjs`, each run through `npm run test:scripts`, each red, file
restored and diffed clean afterwards:

| Mutation | Tests failing |
| --- | --- |
| drop the stderr check | 2 |
| treat a project-level diagnostic as noise | 1 |
| report paths as tsc printed them | 2 |
| drop the non-zero-exit-with-empty-report check | 1 |
| drop the unreadable-output check | 1 |

The refactor itself was falsified too: with a planted
`src/planted-error.ts`, `npm run typecheck` exits 1 with the same diagnostic and
the same summary line from the repository root **and** from `src/`; removing the
file returns it to 0.

**The known hole is still open, deliberately.** A `typescript` that resolves,
runs, exits 0 and prints nothing still reads as a clean compile. I did not add a
canary fixture: the canary would have to be compiled by the same spawn the
canary is meant to vouch for, so a stub that prints nothing satisfies it just as
well as a real compiler does, and the cost is a fixture project every future
task has to keep compiling. The gate now says this in its own header, and
`resolveCompiler` is tested to bind to the installed compiler, which is the part
that can actually be checked from outside.

#### CI decisions, and why

- **Node matrix `[22.x]`, one entry.** It is the only Node anything here has
  been run on (this environment is 22.22.2). Vite requires `^20.19 || >=22.12`
  and Vitest `^22.12 || ^24 || >=26`, so 24.x would very likely pass - and
  "very likely" is what this project keeps getting burned by. Adding 24.x is one
  line for whoever can run it; the workflow header says so.
- **Triggers left as `on: [push]`.** Unchanged from the previous workflow, so
  every branch is still checked. Fork pull requests get no run; adding
  `pull_request` fixes that but doubles runs on same-repo branches, which is a
  call for the PM rather than a quiet edit here.
- **The propTypes grep earns its step.** I re-proved the premise in this tree
  rather than inheriting it: appending a bare `Footer.propTypes = {...}` to
  `src/components/Footer.tsx` leaves `npm run lint`, `npm run typecheck`,
  `npm run test:unit` (55 passing) and `npm run build` all green, and only the
  grep goes red. The step is written so that a *broken* grep cannot pass either:
  it captures grep's status, fails on 0 (matched), passes on 1 (no match), and
  fails loudly on anything else. All three branches tested locally with
  `bash -e`, including the status-2 case by pointing it at a missing directory.
  I kept it in the workflow rather than adding an npm script: a portable
  equivalent would be another `scripts/*.mjs`, and this task exists partly
  because the last untested script in there shipped three false greens.
- **`npx playwright install --with-deps chromium` before the E2E step.** The
  runner image carries no Playwright browser, and the suite needs the build that
  matches the pinned `@playwright/test`. Running it through `npx` uses the CLI
  `npm ci` just installed, so client and browser cannot drift apart; `chromium`
  alone because `qa/suite-config.ts` declares exactly one project and it is
  chromium; `--with-deps` because the image does not guarantee the system
  libraries either. I did not cache the browser: the cache key is the Playwright
  version, the install is about a minute, and a stale or partial cache fails in
  a way that looks like a browser bug.
- **The dev- and preview-server E2E suites are not in CI.** Both are green here
  (21 passed, 1 skipped each - procedure 20, annotated as excluded because a
  transport failure cannot be delivered through an HTTP proxy). They re-run the
  same procedures through a second server and a proxy hop: more moving parts per
  unit of new information, and the failure they would catch first is a Vite
  server-mode failure, not an application one. They stay as QA's diagnostic
  tools.
- **ESLint stays at 9** and the task's exclusion still holds unchanged:
  `eslint-plugin-react` is still 7.37.5 with `eslint: ^3 || ... || ^9.7`, and
  `eslint-plugin-jsx-a11y` still 6.10.2 with `... || ^9`, both still latest
  (checked against the registry today). ESLint's latest is 10.10.0.

#### How I convinced myself the workflow is right, having no way to run it

I cannot execute a GitHub Actions workflow here, so I ran what it runs, in its
order, twice: once in this working tree, and once in a clean room.

The clean room was built from `git ls-files` plus
`git ls-files --others --exclude-standard` - exactly the files a fresh clone of
this branch would contain, with no `node_modules`, no `dist`, no
`qa/.artifacts` - unpacked into an empty directory. There, in workflow order:

| Step | Result |
| --- | --- |
| `npm ci` | exit 0, 296 packages from the lockfile, 0 vulnerabilities |
| `npm run lint` | exit 0 |
| `npm run format:check` | exit 0 (it caught my own unformatted spec file on the first pass; I ran Prettier and re-ran everything) |
| `npm run typecheck` | exit 0, `0 error(s) in tsconfig.json, qa/tsconfig.json` |
| `npm test` | exit 0, 11 files / 71 tests (`unit` 10/55, `scripts` 1/16, each checked separately) |
| `npm run build` | exit 0 |
| the propTypes grep, verbatim from the workflow under `bash -e` | exit 0 |
| `CI=true npm run test:e2e` | exit 0, 22 passed |

`CI=true` on that last one is not decoration: `qa/suite-config.ts` reads
`process.env.CI` for `forbidOnly` and for `reuseExistingServer`, so without it
the run would not have exercised the same server startup path the runner takes.

The workflow file was also parsed as YAML and its step list read back, so the
`run:` blocks are the strings I think they are (that check is how I found my
first extraction of the grep step had silently dropped its second `if`).
`npx playwright install --help` confirms `--with-deps` and the `chromium`
browser name are valid for the pinned 1.56.1 - I did not run the install itself,
per this environment's standing rule.

In this working tree, after every change: lint 0, format:check 0, typecheck 0,
`npm test` 11/71 with `test:unit` still 10/55, build 0, `npm run preview` serves
`dist/` (curled `http://localhost:4173/` and got the built `index.html`),
`test:e2e` 22 passed, `test:e2e:dev` 21 passed / 1 skipped, `test:e2e:preview`
21 passed / 1 skipped. The E2E suite was run, never edited.

#### What I could not verify, and why

Everything here that is specific to a GitHub runner:

- **The action majors.** `actions/checkout@v5`, `actions/setup-node@v5` and
  `actions/upload-artifact@v4` are pinned from knowledge, not from a lookup:
  this environment's proxy refuses the GitHub API for any repository other than
  this one, so I could not confirm what the newest majors are today. v5 is the
  current major for the first two as far as I know; `upload-artifact` is pinned
  to v4 deliberately, because v4 is certainly supported whether or not a v5
  exists. First red run should confirm all three resolve.
- **`cache: npm`** restoring and saving a cache.
- **`npx playwright install --with-deps chromium`** actually downloading a
  browser and apt-installing its libraries. Here the browser is preinstalled at
  `/opt/pw-browsers` with `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` set, so the E2E
  runs above prove the suite works *given* a browser, not that the install step
  obtains one.
- **The `if: failure()` artifact upload**, which by definition needs a failing
  run.
- **Any Node other than 22.22.2.**

#### For QA

- The E2E suite is untouched; the three suite commands and their counts are
  above.
- `npm run test:scripts` is new and green (1 file / 16 tests). `npm run
  test:unit` is the old suite unchanged, still 10 / 55, so either can be pinned.
- The falsification I would most want repeated independently: plant a bare
  `propTypes` assignment in a component and confirm that only the workflow's
  grep step objects, and plant a type error and confirm `npm run typecheck`
  fails from a subdirectory as well as from the root.
- `npm run test:e2e` in a fresh clone needs `npx playwright install chromium`
  first; the README says so.

#### Open questions for the project manager

1. **`reselect` stays, and this task could not remove it.** It is imported by
   `src/selectors/index.ts`, and switching that import to `@reduxjs/toolkit`'s
   re-export is a change under `src/` that is not "deleting an import of a
   removed dependency", which this task's Out of scope forbids. Today the tree
   carries two copies: `reselect@4.0.0` direct (what `src/` resolves) and
   `reselect@5.1.1` under `@reduxjs/toolkit`. Task 13 owns the selectors and
   could absorb the one-line switch; it needs a decision, not a quiet edit.
2. **`classnames` 2.2.6 keeps `@types/classnames` alive.** Upgrading to 2.5.x
   would let both the `@types` package and this exception go, but that is a
   version chase this task excludes. Worth its own small task?
3. **CI triggers**: leave `on: [push]`, or add `pull_request` for fork
   contributions and accept duplicate runs on same-repo branches?
4. Minor: `typescript`, `@types/react`, `@types/react-dom`, `@types/classnames`
   and `@types/node` sit in `dependencies` rather than `devDependencies`. It
   costs nothing today - the app is private and there is no deployment that
   installs with `--omit=dev` - so I left the classification alone rather than
   making an untested claim about a deployment that does not exist.

### QA
