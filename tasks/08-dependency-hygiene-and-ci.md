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

Committed on top of `c386004`, which is where the branch stood when I started
and it did not move under me: `86240bb` carries this note's work and `a7b9548`
the follow-up below. No file under `src/` or `qa/` changed.

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
  `/opt/pw-browsers` and pointed at by `PLAYWRIGHT_BROWSERS_PATH`, the only
  Playwright variable this environment sets; there is no install hook to skip.
  Either way the E2E runs above prove the suite works *given* a browser, not
  that the install step obtains one.
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

#### Follow-up: the project manager's ruling on the four questions

Applied on top of the note above, and committed as `a7b9548`. Where the two
disagree, this section wins: the dependency table's `@types/classnames` row and
question 4 are both superseded here.

One bookkeeping note: the ruling names my committed work as `08d5477`, but no
such object exists in this clone. The commit carrying it here is `86240bb`,
"Wire every gate into CI and test the typecheck gate", on top of `c386004`.
Nothing was reset or forced; I mention it only so the hash in the ruling is not
taken as a missing commit.

**1. `reselect` - left alone, routed to task 13.** No change.

**2. `classnames` 2.2.6 -> 2.5.1, `@types/classnames` deleted.** The bump is
behavior-neutral, checked four ways rather than assumed:

- All three call sites (`Link`, `TodoItem`, `TodoTextInput` - the ruling says
  two) pass a single object literal of booleans, `classnames({ selected })`.
  That form has been the same since 2.x; 2.5.1's additions are `toString`
  handling on objects and array flattening, neither of which these reach.
- `npm run typecheck` is 0 with `@types/classnames` gone: the three TS7016s I
  predicted do not appear, because 2.5.1 ships `index.d.ts` and an `exports`
  map that names it.
- The built bundle differs in exactly one place. Comparing the JS before and
  after byte by byte: a common prefix of 212,803 bytes, a common suffix of
  9,301, and one differing region of 268 -> 432 bytes, which is the classnames
  implementation itself (2.2.6's single loop replaced by 2.5.1's
  `classNames`/`parseValue`/`appendClass`). Nothing else in 222 kB moved. The
  CSS is byte-identical.
- `test:unit` 55 passing (those specs assert rendered `className` strings),
  `test:e2e` 22 passed, `test:e2e:dev` and `test:e2e:preview` 21 passed / 1
  skipped each.

**3. Dependency classification fixed.** `dependencies` is now exactly the eight
the browser bundle needs - `@reduxjs/toolkit`, `classnames`, `react`,
`react-dom`, `react-redux`, `redux`, `reselect`, `todomvc-app-css` - and
`typescript`, `@types/node`, `@types/react`, `@types/react-dom` moved to
`devDependencies`.

The sanity check as specified cannot pass, and the reason is not about this
change. `npm ci --omit=dev` succeeds (exit 0), but `npm run build` then fails
with `sh: 1: vite: not found`: the build toolchain is itself a devDependency,
as it was before this task, so a runtime-only install has nothing to build
with. Nor is there a production install to protect - `vite build` inlines
every dependency into `dist/`, which is served as static files and reads no
`node_modules` at all; the E2E suite has been proving that all along, since the
stub serves `dist/` directly. For this project the two lists say what ends up
in the bundle, not what a deployment installs.

So I ran the two checks that do carry the meaning:

- After `npm ci --omit=dev` in a throwaway copy: 0 vulnerabilities, and the only
  populated top-level packages are the eight and their transitives (`@types/`
  holds just `react` and `use-sync-external-store`, both pulled in by
  `react-redux`; the `@eslint`, `@playwright`, `@vitejs` and `@vitest`
  directories are empty shells npm leaves behind).
- Every bare specifier imported by shipped `src/` - `@reduxjs/toolkit`,
  `classnames`, `react`, `react-dom/client`, `react-redux`, `redux`,
  `reselect`, `todomvc-app-css/index.css`, with the specs and test-support
  excluded - resolves inside that runtime-only install. Nothing I moved to
  `devDependencies` is reachable from the bundle.

**4. `pull_request` added, `push` narrowed.** The workflow now runs on every
pull request and on pushes to `master`, so a branch with an open PR is checked
once rather than twice, and a branch without one is checked the moment a PR
opens. `master` is this repository's only long-lived remote branch, which is
what I took as the default; if the default branch is ever renamed, that list is
the one line to change.

**Clean room, re-run end to end after all of the above.** Rebuilt from
`git ls-files` plus untracked-not-ignored into an empty directory, `npm ci` from
the lockfile, then the workflow's steps in order:

| Step | Result |
| --- | --- |
| `npm ci` | exit 0, 296 packages, 0 vulnerabilities, `classnames` 2.5.1, no `@types/classnames` |
| `npm run lint` | exit 0 |
| `npm run format:check` | exit 0 |
| `npm run typecheck` | exit 0, `0 error(s) in tsconfig.json, qa/tsconfig.json` |
| `npm test` | exit 0, 11 files / 71 tests (`unit` 10/55, `scripts` 1/16) |
| `npm run build` | exit 0 |
| the propTypes grep, verbatim, under `bash -e` | exit 0 |
| `CI=true npm run test:e2e` | exit 0, 22 passed |

The workflow file was re-parsed as YAML after the trigger edit:
`{'push': {'branches': ['master']}, 'pull_request': None}`.

Unchanged from the note above: what I could not verify is still everything
specific to a GitHub runner - the action majors, the npm cache, the Playwright
browser install, the failure-only artifact upload, and any Node but 22.22.2.

### QA

**Re-appended.** My original note was written into this file, uncommitted, and
then destroyed by a `git stash push` / `git checkout stash@{0} -- .` outside this
session; the project manager has taken that on themselves and confirmed it is
not recoverable from any object in this clone. I checked too: nothing in
`git log --all -S` over `tasks/` matches its text, and the two dangling commits
hold only the cleanup coder's first two file edits. So this is written from my
own session context rather than from anyone's summary. The verification below is
the work I did at `a7b9548`, unchanged; where a finding has since been closed I
say so at the finding, and the last section records everything that moved in the
tree after I checked it.

Nothing changed but this note. No file under `src/`, `qa/`, `scripts/` or
`.github/` was edited by me — every plant below was reverted and diffed clean.

**The branch moved under me three times, and I left it alone each time.** It
stood at `a7b9548` while I did the work. Since then: `d16224f`, whose message
describes my findings but whose diff is only the cleanup coder's `browserslist`
and `.gitignore` edits; `7a20210`, the tooling tsconfig; and `c74dcae`, which
records the first one's message as misleading. I have not committed, amended or
reset anything.

One bookkeeping correction I raised and the cleanup coder has since applied to
the `### Coder` note above: it said the work was "working tree only, nothing
committed". It was committed, as `86240bb` and `a7b9548`.

#### Baselines, all reproduced

At `a7b9548`: `lint` 0, `format:check` 0, `typecheck` 0 (`0 error(s) in
tsconfig.json, qa/tsconfig.json`), `npm test` 11 files / 71 tests with
`test:unit` 10 / 55 and `test:scripts` 1 / 16, `build` compiles, `test:e2e` 22
passed, `test:e2e:dev` and `test:e2e:preview` 21 passed / 1 skipped each.
`npm run preview` serves `dist/` on 4173 and returns the built `index.html`
naming the current hashed assets.

`test:e2e:preview` failed on my first attempt — *"http://localhost:4173/ is
already used"*. A `vite preview` process from 19:13, before my session, was
still holding the port. Killed it, re-ran, green. Not a defect, but worth one
line: `reuseExistingServer: !process.env.CI` means a run *without* `CI=true`
silently reuses whatever is already on 4173, which may be serving a stale
`dist/`. I ran all three suites with `CI=true` for that reason.

#### 1. The workflow, read as a document

Read against `package.json` and the filesystem rather than by re-running the
coder's clean room.

- Every `run:` names a script that exists: `npm ci`, `lint`, `format:check`,
  `typecheck`, `test`, `build`, `test:e2e`. Order is install -> static gates ->
  tests -> build -> grep -> browser -> E2E -> failure-only upload. Correct.
- **The `if: failure()` upload path is right, and I stopped guessing about it.**
  `qa/suite-config.ts` sets `outputDir: './.artifacts/test-results'` and the
  HTML reporter's `outputFolder: './.artifacts/report'`, both relative to
  `qa/`, so `path: qa/.artifacts/` is exactly it. I then forced the case the
  coder could not: in a throwaway clean room I appended a deliberately failing
  spec and ran `CI=true npm run test:e2e`. Exit 1, and `qa/.artifacts/` held 21
  files / 2.2 MB — the HTML report, the trace viewer, the retained trace zip,
  and `test-results/<test>/error-context.md`. The upload will have content.
  When an *earlier* step fails the directory does not exist yet;
  `upload-artifact@v4` defaults to `if-no-files-found: warn`, so that step
  warns and the job's verdict still comes from the step that failed.
- **Nothing is referenced that a runner would not have.** `bash`, `grep`, `npm`,
  `npx`, and the `sudo` `--with-deps` uses are all standard on `ubuntu-latest`.
  `cache: npm` has a root `package-lock.json` to key on.
- **The Playwright install step is load-bearing, not belt-and-braces.** Neither
  `playwright` nor `@playwright/test` declares an `install`/`postinstall`
  script in this lockfile, so `npm ci` downloads no browser and the suite would
  fail without that step. `npx playwright --version` resolves the locally
  installed CLI (1.56.1, from `node_modules/.bin/playwright`), and
  `playwright install --help` on that version lists both `--with-deps` and
  `chromium` as valid. `qa/suite-config.ts` declares exactly one project and it
  is chromium.
- **The header comment's version claims are exact**, which matters because
  nobody will re-derive them: installed `vite` declares
  `node: ^20.19.0 || >=22.12.0` and `vitest` declares
  `^22.12.0 || ^24.0.0 || >=26.0.0`. The matrix reasoning holds.
- **Action majors: still unverifiable here, and I confirmed why.** I tried the
  GitHub API through the MCP tool as well as the coder's route; it refuses any
  repository other than this one ("Allowed repositories:
  brainfucknow/todomvc-redux-typescript"). I concur with `checkout@v5`,
  `setup-node@v5` and the deliberate `upload-artifact@v4` from knowledge, and
  neither of us has looked it up. This is the one thing in the file that a first
  red run must confirm — see the trigger consequence in finding F7.

#### 2. The propTypes grep, including the third case

Extracted verbatim from the YAML and driven under
`bash --noprofile --norc -e`, which is what GitHub runs, and again with
`-o pipefail`:

| Case | Result |
| --- | --- |
| clean tree, no match | grep 1, step exits 0 |
| bare `Footer.propTypes = {...}` planted | grep 0, `::error::` printed, step exits 1 |
| `src/` absent (grep status 2) | `::error::grep failed with status 2`, step exits 2 |
| `grep` not on `PATH` (status 127) | `::error::grep failed with status 127`, step exits 127 |

A grep error is not treated as a pass. The `found=0` initialization is the part
that carries case 1 and it is right: `||` short-circuits on a match, so `found`
stays at its initial 0, and 0 means matched.

With the bare assignment planted in `src/components/Footer.tsx`: `lint` 0,
`format:check` 0, `typecheck` 0, `test:unit` 55 passing, `build` 0 — five green
gates and only the grep red. The premise holds independently. File restored,
`git status` clean.

#### 3. The 16 gate tests do not encode the bug list

Twelve mutations, each applied to the real file, each run through
`npm run test:scripts`, each reverted and diffed clean. **Every one was
caught, and every one of the 16 tests is killed by at least one mutation**, so
none is passing vacuously.

The coder's five reproduce exactly, with the same counts: drop the stderr check
-> 2; project-level diagnostic treated as noise -> 1; report paths as tsc
printed them -> 2; drop the non-zero-exit-with-empty-report check -> 1; drop the
unreadable-output check -> 1.

Seven more of my own: `resolveCompiler` falling back to a PATH `tsc` -> 1;
drop the `run.error` check -> 1; drop the `run.signal` check -> 1; elaborations
no longer attaching -> 1; `errorCount` hard-wired to 0 -> 4; the summary line
dropping project names -> 5.

On the three false greens specifically:

1. *Compiler never ran, complained on stderr.* Killed by two tests, and the
   pair matters: the non-zero-exit variant would still be caught by the
   empty-report check, so only the **status-0-with-stderr** test pins the
   stderr check itself.
2. *Compiler ran and compiled nothing.* Killed by the TS18003 test. Note it is
   the only test holding that check: with the check removed the run still
   throws, but on the wrong ground, and only the message assertion catches it.
3. *Verdict depended on the working directory.* I reproduced the original shape
   at the entry point rather than in the extracted module: setting
   `scripts/typecheck.mjs`'s `ROOT` to `process.cwd()` turns *"gives the same
   verdict from a subdirectory as from the root"* red. So that test is not the
   weak clean-tree tautology it looks like. The path-rooting itself is pinned
   twice more, once against a stand-in and once against the real compiler over
   a throwaway project one directory below its root.

The only branch in either new module with no test is `resolveCompiler`'s "the
installed typescript declares no `tsc` binary", which fires on a corrupt
`typescript` package. Not worth a test; recorded so nobody thinks it was
missed.

I agree with leaving the known hole open. A canary would have to be compiled by
the same spawn it is meant to vouch for.

#### 4. classnames 2.2.6 -> 2.5.1

Verified without reference to the coder's numbers, then compared.

- **Behavior.** Unpacked 2.2.6 and ran both implementations side by side over
  every shape the three call sites can produce — `{selected}`,
  `{edit, 'new-todo'}`, `{completed, editing}`, all boolean combinations — plus
  `undefined`, `null`, `0`, `''`, `NaN`, `1`, `'x'` in case a prop ever goes
  optional. **All 16 identical.** All three sites pass a single object literal;
  2.5.1's additions (`toString` on objects, array flattening) are unreachable
  from that form.
- **Types.** 2.2.6 ships no `index.d.ts`; 2.5.1 does. That is the whole reason
  `@types/classnames` was load-bearing before and is gone now. It is absent
  from `package.json`, from `package-lock.json` and from `node_modules/@types/`.
- **Bundle.** Built both, diffed byte by byte: common prefix **212,803**, common
  suffix **9,301**, one differing region of **268 -> 432** bytes, and the region
  is 2.2.6's single loop replaced by 2.5.1's `classNames`/`parseValue`/
  `appendClass`. Nothing else in 222 kB moved. CSS byte-identical. The coder's
  figures are exact.

#### 5. Dependency classification

- **Nothing shipped is missing from `dependencies`.** The bare specifiers
  imported by shipped `src/` (specs and `test-support/` excluded) are exactly
  `@reduxjs/toolkit`, `classnames`, `react`, `react-dom/client`, `react-redux`,
  `redux`, `reselect`, `todomvc-app-css/index.css` — a bijection with the eight
  `dependencies`. `index.html` adds only `/src/index.tsx`.
- **`npm ci --omit=dev` in a throwaway copy: exit 0, 0 vulnerabilities.** All
  eight resolve there, and so does `react/jsx-runtime`, which the automatic JSX
  transform needs and which no source names.
- **Every dependency is load-bearing, and the four with no textual reference
  were falsified rather than argued.** Moving each aside in a clean room:
  `@types/node` -> TS2688 "Cannot find type definition file for 'node'";
  `@types/react` -> TS7016/TS7026 on `react/jsx-runtime` and JSX intrinsics;
  `@types/react-dom` -> TS7016 on `react-dom/client`; `@testing-library/dom` ->
  `Cannot find module`, unit suite dies at 14 of 55. Each restored to green.
  The other 24 are named directly in `src/`, `qa/`, `scripts/`,
  `eslint.config.js`, `vite.config.mts` or a script body.
- **Lockfile and manifest agree** for both lists, so `npm ci` is in sync — which
  the successful `--omit=dev` install proves independently.

**On the `npm ci --omit=dev && npm run build` argument: I accept it.** Not on
the coder's say-so — I checked the claim it rests on. `git show
c386004:package.json` puts `vite` in `devDependencies` *before* this task, so
that command was already impossible and this change did not break it. I
reproduced the failure (`sh: 1: vite: not found`, exit 127) and it is exactly
that. With `private: true`, no deployment, and `vite build` inlining everything
into a `dist/` served as static files, the two lists here document what reaches
the browser rather than what a deployment installs. That is a fair thing for
them to mean. The residual, recorded in F11, is that nothing enforces it.

#### 6. Looking back across tasks 02-08

Nothing contradicts anything else and `README.md` documents the stack
accurately: no CRA / `react-scripts` / `eject` reference, and every command it
names exists (`dev`, `start`, `build`, `preview`, `test`, `test:unit`,
`test:scripts`, `lint`, `format`, `format:check`, `typecheck`, `test:e2e`,
`test:e2e:dev`, `test:e2e:preview`) — checked against `package.json` one by one.
Versions in the stack table match what is installed: Vite 8.2.2, React 19.2.8,
Redux 5.0.1, TypeScript 5.9.3, ESLint 9.39.5.

The ESLint-10 exclusion still holds, re-derived from installed metadata:
`eslint-plugin-react` 7.37.5 caps at `^9.7` and `eslint-plugin-jsx-a11y` 6.10.2
at `^9`; the other four accept `^10`. No bump to report.

Confirmed absent rather than invented: no Gherkin or `.feature` file, no
acceptance pipeline, no APS tooling, no property tests, no such package in
either dependency list. APS is first needed at task 09. The E2E suite is 21
procedures and 21 spec files, 1:1 by filename, 22 tests (procedure 21 carries
two). Untouched by me.

I also rebuilt a clean room of my own, from `git ls-files` only (124 files; `git
ls-files --others --exclude-standard` is empty, so nothing needed is untracked
or gitignored): `npm ci` 296 packages / 0 vulnerabilities, then lint 0,
format:check 0, typecheck 0, `npm test` 11/71, build 0, the grep step 0, and
`CI=true npm run test:e2e` 22 passed.

**Findings. None blocks this task; F1-F4 are the ones that stay wrong forever if
the project manager does not rule on them now.**

- **F1. `browserslist` is still in `package.json` and task 04 routed it here by
  name.** Task 04's coder wrote: *"`browserslist` stays in `package.json` and is
  now read by nothing: Vite targets through esbuild. It is dead config, not a
  dependency, so I left it for task 08's hygiene pass."* Task 08 did not take it
  and does not mention it. I proved it is dead: deleting the field and
  rebuilding gives byte-identical JS **and** CSS (same md5 on both). Owner:
  coder. One line, no behavior. — **Closed since, in `d16224f`.**
- **F2. `.gitignore` still lists `dist` twice** — line 83 in the inherited Nuxt
  section and line 107 as `dist/`. Task 04's architect called the duplicate
  "task 08 hygiene, not worth a commit now". Cosmetic, but this was its task.
  Owner: coder. — **Closed since, in `d16224f`.**
- **F3. The gate that this whole task is about is the one file no type gate
  checks.** `tsconfig.json` includes only `src`, so `vite.config.mts`,
  `eslint.config.js`, `prettier.config.js` and all of `scripts/*.mjs` sit
  outside every tsconfig. Task 05 left this here explicitly: *"Left for task 08,
  with its own config if it wants one."* Task 08 instead added two more files to
  that set — `typecheck-gate.mjs` and its spec — without bringing any of them
  under the type gate, and the coder's note does not raise it. They are covered
  by lint and by Prettier (I falsified both: an unused const in each new file
  turns `npm run lint` red, a formatting violation turns `format:check` red), so
  this is a gap in typing, not in review. Owner: coder, if the PM wants a third
  tsconfig project; otherwise close the thread deliberately, because after this
  task nothing revisits tooling. — **Closed since, in `7a20210`, with the third
  project. Re-verified below.**
- **F4. `qa/stub/**` is still unchecked JavaScript.** Task 05's QA measured it —
  `checkJs` reports 89 diagnostics, nearly all implicit-any on parameters — and
  called it *"a reasonable candidate for task 08's dependency and CI hygiene"*.
  Task 08 did not make room. It is mine, `qa/` is my file, and I am **not** doing
  it here: 89 JSDoc annotations across nine files is its own task and none of
  this task's done criteria ask for it. Recorded as still open so it is not lost
  when the tooling track closes. Owner: QA, on a task the PM creates. **Still
  open.**
- **F5. One premise in the coder's note is factually wrong, harmlessly.** It
  says this environment sets `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD`. It does not —
  only `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`. The conclusion survives for
  a better reason: there is no install hook to skip, which is also why the
  workflow's install step is genuinely required. — **Corrected since, in the
  `### Coder` note above.**
- **F6. Bookkeeping**, above: the work is committed, not "working tree only". —
  **Corrected since.**
- **F7. Narrowing `push` to `master` means this branch now gets no CI at all
  until a pull request opens.** That is the intended trade, but it has a
  consequence worth naming: the first evidence that the workflow parses, that
  `checkout@v5` / `setup-node@v5` / `upload-artifact@v4` resolve, that
  `cache: npm` works and that the browser install succeeds all arrives at the
  same moment, on the PR that carries the whole modernization. Nothing before
  then can be red. Not a defect — but it is why F1-F4 have to be decided now.
- **F8. `npm run test:scripts` is not hermetic.** The *"gate as a command"* test
  asserts the repository's own typecheck is clean (`fromRoot.status === 0` and
  an exact `0 error(s)` stdout). So a real type error anywhere in `src/` or
  `qa/` fails the `scripts` project as well as `npm run typecheck`. It fails
  safe — no false green — but the structural tasks starting at 09 will move code
  and should expect two red suites for one cause. Recorded, not a fix request.
  **Now larger: the third project widens it to the tooling files as well.**
- **F9. Minor:** CI builds twice — the `npm run build` step, then `npm run
  test:e2e`, which begins with `npm run build`. About 0.3s; harmless.
- **F10. Minor:** the grep matches the string `propTypes` anywhere under `src/`,
  a comment included, so a future comment mentioning it turns CI red with a
  misleading message. Fails safe, and the alternative is a fragile pattern.
  Noting the shape only.
- **F11. The dependency split is documentation, not a contract.** Now that
  `dependencies` means "reaches the browser", nothing would catch a shipped
  import landing in `devDependencies` or the reverse. Correct today (verified
  above). Residual risk, not a defect. The cleanup coder's extension of this to
  tsconfig membership is the same shape and I agree with it.

Also confirmed still present and still deliberate: `src/reducers/apis.ts:22`'s
`console.log('action', action)`, a `PLAN.md` baseline defect that tasks 09-10
own. `RootState` still omits `errorMessage` and `exec` (task 12). `reselect`
stays, routed to task 13 by the project manager's ruling.

#### CRAP and DRY on the changed files

No coverage provider is installed, and adding `@vitest/coverage-v8` to measure
would add a dependency to the task whose subject is removing them, so this is by
inspection and I say so plainly. Highest cyclomatic complexity in the new code
is `readReport` at about 7, with every branch — blank line, located diagnostic,
elaboration, project-level, unreadable — driven by a test; `readOutcome` about
5, all four branches driven; `resolveCompiler` about 4 with one untested branch
(the corrupt-package case), which at that complexity stays far under 10 even at
two thirds coverage. `typecheck.mjs` is about 4 and its happy path is driven as
a subprocess. Nothing approaches the gate and nothing needs the `cond`/`case`
exception.

DRY: the split between `typecheck.mjs` and `typecheck-gate.mjs` removes
duplication rather than adding it — the project paths, the compiler and the exit
code exist once each, and the spec re-implements none of the gate's logic. The
only repetition is between the workflow's step comments and `README.md`'s CI
section, which is documentation for two audiences and should stay.

#### What moved in the tree after I checked it, and whether any of it invalidates the above

Re-checked on re-appending, because three of the files I mutation-tested have
been edited since.

- **The build output is byte-identical to what I measured at `a7b9548`** — same
  two md5s, `97686c7f…` for the JS and `bb27882d…` for the CSS, and the same
  content-hashed filenames. So removing `browserslist` changed nothing, exactly
  as my F1 evidence predicted, and every bundle figure in section 4 still
  describes the artifact this repository builds today.
- **My mutation evidence transfers, and I did not assume it.** I re-ran all
  twelve mutations against the post-cleanup `typecheck-gate.mjs` and
  `typecheck.mjs`, plus a thirteenth for the new project: **all thirteen still
  caught, by the same named tests.** Two small differences worth recording:
  dropping the `run.error` check now kills two tests rather than one, and the
  new mutation — removing `tsconfig.tools.json` from `PROJECTS`, the exact
  "added a config, forgot to run it" shape — is caught by *"gives the same
  verdict from a subdirectory as from the root"*, which confirms the cleanup
  coder's claim about that assertion.
- **One claim in the cleanup note is very slightly overstated**, and I would
  rather say so than let it stand: *"Not one runtime token changed in any `.mjs`
  file"*. Comparing comment-stripped sources against `a7b9548`,
  `typecheck-gate.mjs` gained parentheses from a JSDoc cast — `${cause.message}`
  became `${/** @type {Error} */ (cause).message}` — which is runtime-identical
  but is not literally zero tokens. The other two edits it makes are real code
  and the note declares both elsewhere (the third `PROJECTS` entry, and the
  spec's expected stdout string). The substance is right: gate behavior is
  unchanged, which the thirteen mutations above now demonstrate rather than
  assert.
- **The third project is live in all six files, and I falsified it myself.**
  Planting a type error one at a time in `vite.config.mts`, `eslint.config.js`,
  `prettier.config.js`, `scripts/typecheck.mjs`, `scripts/typecheck-gate.mjs`
  and `scripts/typecheck-gate.spec.mjs` turns `npm run typecheck` red each time,
  TS2322 named against the file and rooted at the repository. Deleting the
  `@ts-expect-error` in `eslint.config.js` restores the TS7016, so the
  suppression is load-bearing rather than decorative. All restored; the eight
  files I touched compare byte-identical to the cleanup coder's versions.
- **Current baselines, at `c74dcae` plus the uncommitted cleanup:** lint 0,
  format:check 0, typecheck 0 naming all three projects, `npm test` 11 files /
  71 tests, `test:unit` 55, `test:scripts` 16.
- **`d16224f` deserves its correction and has it.** Its message describes my
  findings while its diff is two of the cleanup coder's files; `c74dcae` records
  that. Nothing of mine is in either commit.

Nothing here changes a finding or a verdict. F1, F2 and F3 are closed on
evidence I still stand behind, and closed the way I would have wanted them
closed — with the closure falsified rather than asserted.

#### Verdict

Task 08's done criteria are met. Every gate ran, every gate passed, and every
gate was shown to be able to fail. No blocking failure, so there is no fix to
assign to another role.

#### Open questions for the project manager

1. ~~F1, F2 and F3~~ — **answered by events.** All three were routed here by an
   earlier role by name, this task took none of them, and a follow-up coder has
   since closed all three. Nothing left to decide.
2. **F4 stands, and it is the one I still need a ruling on.** `checkJs` over
   `qa/stub/**` is nine files and 89 diagnostics, almost all implicit-any on
   parameters. It is QA's to do, it is not in this task's done criteria, and the
   tooling track ends here — so if it is to happen it needs a task of its own.
   The cleanup coder is right that `tsconfig.tools.json` is the template: a
   project of its own, `checkJs`, JSDoc, and an entry in `PROJECTS` so it
   actually runs. Should that task exist?
3. **F7**: nothing exercises this workflow until the first pull request opens.
   Is that acceptable, given that the three action majors could not be verified
   from this environment by any role?

### Coder (cleanup: routed items)

The three items earlier tasks routed here by name — F1 `browserslist`, F2 the
duplicated `dist` in `.gitignore`, F3 the config files outside every tsconfig —
plus the two bookkeeping corrections to the `### Coder` note above. Nothing
under `src/` or `qa/` was touched, and `checkJs` over `qa/stub/**` (F4) is still
QA's and still open.

**The branch moved under me, and I left it alone.** It stood at `a7b9548` when I
started, with the QA note above uncommitted in the working tree. Partway through
my work something outside this session committed `d16224f`, *"Record task 08 QA:
three routed items were never taken"*, which carries exactly my first two edits —
the `browserslist` deletion and the `.gitignore` line — and nothing else. Two
things follow, and neither is mine to repair:

- **Items 1 and 2 are already committed**, in `d16224f`, not in the working
  tree. I verified their content is what I wrote and nothing else rode along:
  `git show d16224f` is a 2-file diff, `-8/+1` lines.
- **The QA note's body is gone from this file.** The commit's message describes
  QA's findings but its diff does not contain them; a stash commit with the same
  timestamp (`ce6fc7d`, dangling) holds only those same two files. So the ~315
  lines I read under `### QA` at the start of this session — the baselines, the
  grep table, the twelve mutations, findings F1-F11 — are not in `d16224f`, not
  in any commit, and not in the working tree; `### QA` is now a bare heading. I
  did not rewrite it: it is another role's note, I would be reconstructing it
  from memory, and history is the project manager's to fix. **This needs
  restoring from whatever record the PM has.** My note cites F1-F5 and F11 by
  number on the assumption they come back.

#### 1. `browserslist` — removed, and the byte-identical claim re-proved here

Not taken on QA's word. Built at `a7b9548` with the key present, kept the
output, deleted the key, rebuilt: **identical trees**, `diff -r` clean, same
three md5s, and the same content-hashed filenames (`index-85ZV9EKe.js`,
`index-DyNh_Ord.css`) — a hash change is what a content change would look like,
so the filenames are themselves part of the evidence. The clean-room build below,
from a fresh `npm ci` with no `browserslist` key anywhere, produces those same
three md5s again.

The key was read by nothing: no source, config, script or workflow mentions
`browserslist` (grep over every tracked file bar the lockfile). The package of
that name is in `node_modules` only as `eslint-plugin-react-hooks` ->
`@babel/core` -> `@babel/helper-compilation-targets`, which is a lint-time
dependency and not part of `vite build`. Lint is 0 before and after.

#### 2. `.gitignore` — one `dist` line, not two

Deleted line 83, the bare `dist` inherited in the Nuxt block, and kept line 107's
`dist/` under `# Vite build output`, which is the one that names this project's
actual output. Behaviour was already identical and I checked rather than assumed:
`git check-ignore -v dist dist/index.html` attributed both to the *later* rule
before the edit as well as after, so the removed line was never deciding
anything.

#### 3. The tooling now has its own type project

New `tsconfig.tools.json`, a third project alongside `tsconfig.json` and
`qa/tsconfig.json`, covering all six files F3 named: `vite.config.mts`,
`eslint.config.js`, `prettier.config.js`, and `scripts/*.mjs` including
`typecheck-gate.mjs` and its spec. `scripts/typecheck.mjs` runs it, so
`npm run typecheck` — and therefore CI, which already calls it — covers it. No
workflow change was needed or made.

**Why a third project rather than widening one.** Task 05's constraint holds:
these files need `"types": ["node"]`, and putting Node's globals into the app's
compilation is the thing the app/qa split exists to prevent. `qa/tsconfig.json`
is the precedent and this follows it.

**The two choices worth justifying:**

- **`checkJs`, and the files stay JavaScript.** The alternative — `checkJs` with
  `noImplicitAny` off — would have needed no JSDoc at all and checked almost
  nothing inside any function, which on this task would have been a fourth false
  green. So the parameters are annotated: `CompilerRun` and `Diagnostic`
  typedefs in `typecheck-gate.mjs`, `@param`/`@returns` on every function there,
  in `typecheck.mjs` and in the spec. **All of it is comments.** Not one runtime
  token changed in any `.mjs` file; `npm run test:scripts` is 16/16 before and
  after, and the one non-comment edit in the whole item is the third entry in
  `PROJECTS`.
- **`module`/`moduleResolution: nodenext`.** This is what lets one project hold
  both module systems: TypeScript then reads each file the way Node does, so
  `.mts`/`.mjs` are ESM and the extensionless `eslint.config.js` /
  `prettier.config.js` are CommonJS, which is what their own header comments say
  they are. Under `module: ESNext` the two `.js` configs would have been read as
  global scripts, which is both wrong and how their top-level `const`s would
  start colliding with each other.

**One suppression, and it is the self-cleaning kind.** `eslint-plugin-jsx-a11y`
6.10.2 ships no declarations, so its `require` in `eslint.config.js` is TS7016.
I used `// @ts-expect-error` rather than a `declare module` shim: a shim would
silently shadow real types the day the plugin ships them, whereas the expecting
form turns into an error of its own that day and gets deleted. Every other
`require` in that file is checked against real types.

Nothing had to change what it does to come under the gate, so there was nothing
to stop and report.

#### Falsification

- **The new project can fail, in each of its six files.** Planted
  `const planted: number = 'no'` (or its JSDoc equivalent in the `.js`/`.mjs`
  files) in `vite.config.mts`, `eslint.config.js`, `prettier.config.js`,
  `scripts/typecheck.mjs`, `scripts/typecheck-gate.mjs` and
  `scripts/typecheck-gate.spec.mjs`, one at a time. Each turned
  `npm run typecheck` red — exit 1, `1 error(s)`, TS2322 named against the file
  and rooted at the repository. Each file restored, `git diff` clean, gate back
  to 0.
- **A config nothing runs would be caught.** Removing the third entry from
  `PROJECTS` — the exact shape of "added a tsconfig, forgot to run it" — turns
  `npm run test:scripts` red: the *gate as a command* test names all three
  projects in the stdout it expects. I updated that expectation and its comment
  rather than loosening it; the test count is unchanged at 16 because the
  assertion moved, not the test.
- **The suppression is load-bearing, not decorative.** Removing the
  `@ts-expect-error` restores the TS7016 and the gate goes red.

#### Baselines, all reproduced after the changes

`lint` 0, `format:check` 0, `typecheck` 0 —
`0 error(s) in tsconfig.json, qa/tsconfig.json, tsconfig.tools.json` — `npm test`
11 files / 71 tests with `test:unit` 10/55 and `test:scripts` 16/16, `build`
compiles, and the build's three md5s are unchanged from `a7b9548`, so no
application behaviour moved. `CI=true` on all three E2E suites: `test:e2e` 22
passed, `test:e2e:dev` and `test:e2e:preview` 21 passed / 1 skipped each. I used
`CI=true` for the reason QA gave: without it a stale server on 4173 is silently
reused.

**Clean room**, built the way both earlier roles built theirs — `git ls-files`
plus untracked-not-ignored, 125 files, into an empty directory, `npm ci` from the
lockfile (0 vulnerabilities): lint 0, format:check 0, typecheck 0 naming all
three projects, `npm test` 11/71, build 0, and `require('./package.json')
.browserslist` is `undefined`. `tsconfig.tools.json` is in that file list, so a
fresh clone gets it.

#### The two corrections to the `### Coder` note above

Both are edits to statements, not rewrites.

- Its opening said *"Working tree only, nothing committed. Branch still at
  `c386004`"*. The work is committed, as `86240bb` and `a7b9548`; the follow-up
  section's *"still uncommitted"* is corrected the same way. QA's F6 said this
  first and I only applied it. (The note's own later paragraph about the ruling's
  `08d5477` already contradicted the opening.)
- Its *"What I could not verify"* section said this environment sets
  `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD`. It does not — I checked the environment
  myself, and the only Playwright variable set here is
  `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`, with the browsers present. The
  sentence now names that variable and keeps the conclusion, on QA's better
  ground: there is no install hook to skip, which is also why CI's install step
  is load-bearing rather than belt-and-braces.

`README.md` moved with the code: the stack table says three projects, and the
`npm run typecheck` section says what the third one covers and why the three are
separate.

#### What I left

- **Not committed.** Working tree only: `tsconfig.tools.json` (new),
  `scripts/typecheck.mjs`, `scripts/typecheck-gate.mjs`,
  `scripts/typecheck-gate.spec.mjs`, `eslint.config.js`, `README.md` and this
  file. Items 1 and 2 are already in `d16224f` as described above.
- **The QA note needs restoring** — see the top of this note. That is the one
  thing here that a later task cannot recover on its own.
- **F4 stays open.** `checkJs` over `qa/stub/**` is QA's, is nine files and 89
  diagnostics, and is out of scope for me. Note the shape of what I did here is
  exactly what that task would need: a project of its own, `checkJs`, JSDoc, and
  an entry in `PROJECTS` so it actually runs.
- **F11 is unchanged and slightly larger now.** Nothing enforces which tsconfig
  a new file belongs to. A file added at the repository root, or a `.ts` outside
  `src/` and `qa/`, still lands in no project and no gate objects. The three
  `include` lists are the only thing saying otherwise, and after this task
  nothing revisits them.
