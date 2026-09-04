# Task 05: TypeScript 3.9 to 5.x and modern tsconfig

**Track:** Tooling
**Chain:** coder -> QA
**Status:** in progress

## Goal

Move the project to the current TypeScript 5.x line with a compiler configuration that matches a modern bundler.

## Context

`typescript` is pinned at `^3.9.2`, released 2020. The current `tsconfig.json` targets `es5`, uses `"jsx": "react"`, and `"moduleResolution": "node"`.

`react-scripts` is gone as of task 04, so nothing constrains the compiler version any more.

Known type debt that the bump will surface:

- `@types/react` is pinned to 18.0.0 through a `resolutions` field that npm ignores.
- `tsconfig.json` gained `"types": ["vitest/globals"]` in task 03 so the specs' global test API resolves. Keep that working.
- `@types/react-redux` is an explicit dependency, but react-redux 9 ships its own types.
- `src/middlewares/callapimiddleware.ts` imports `AnyAction` and `Dispatch` from `redux`; `AnyAction` is deprecated in Redux 5 in favour of `UnknownAction`. It also types the middleware's `action` parameter as `any`.
- `src/containers/index.ts` hand-declares `RootState` with only `todos` and `visibilityFilter`, while the root reducer also combines `errorMessage` and `exec`.

## Scope

- Bump `typescript` to the current 5.x release.
- Update `tsconfig.json`: a modern `target` and `lib`, `"jsx": "react-jsx"`, `"moduleResolution": "bundler"`, and keep `strict` on.
- With `react-jsx`, the default `React` import is no longer required for JSX. Removing those now-unused imports is in scope for this task; it is a mechanical consequence of the compiler option and moves no logic.
- Fix type errors the bump surfaces, with the narrowest change that keeps behavior identical.
- Remove the ineffective `resolutions` field.
- Remove `@types/react-redux` if react-redux's own types suffice. Leave `@types/node` alone: task 03 raised it from `^13.13.6` to `^22.19.1` and `npm ci` fails with `ERESOLVE` below that. Task 03's QA reproduced the range from scratch and established that the binding floor is **Vitest**'s peer range of `^22.0.0 || >=24.0.0`, not Vite's `^20.19.0 || >=22.12.0`; Vite alone would have accepted `^20`. It is excluded from automatic inclusion by the `types` array and no source imports it, but removing it breaks install resolution.
- `qa/` sits outside `tsconfig.json`'s `include` because TypeScript 3.9 cannot parse Playwright's type definitions, and Playwright transpiles the specs without typechecking them. TypeScript 5 can. Bring `qa/tests/` under a typecheck, in its own project reference or its own config rather than by widening the app's `include`, so the app's compilation stays free of test types. Fix any type error this surfaces in the test sources. Do not change what any test asserts; if a type error can only be resolved by changing an assertion, stop and report it.

## What task 04's architect already established

It ran a throwaway TypeScript 5.9 against the current `tsconfig.json`, without
installing it into the repository. The whole program reports **exactly one
error**: `src/test-support/fetch.ts(4,4): TS2304: Cannot find name 'global'`.

Two things follow. Zero errors everywhere is reachable, so treat any larger
number as a signal you configured something differently rather than as work to
grind through. And it confirms `vite-env.d.ts` genuinely replaces what
`react-scripts` used to declare, since the `todomvc-app-css` import resolves.

## Out of scope

- Correcting `RootState` to match the real store shape. That is task 12, and it is structural.
- Replacing `AnyAction` usage as part of a redesign of the middleware. If a mechanical rename to `UnknownAction` keeps the code compiling with identical behavior, do it; if it forces a redesign, leave it and say so.
- Any change that moves logic between modules.
- Adding or removing behavior. If a type error can only be fixed by changing what the code does, stop and report it.

## Done criteria

- **The typecheck gate is weaker than it looks right now, and this task is what fixes it.** Task 04's coder established that while the TypeScript 3.9 parse errors in `node_modules` stand, `tsc` withholds semantic diagnostics program-wide: a planted syntax error under `src/` fails the gate, but a planted *type* error passes it. So the project has had no real type checking since the dependency graph modernized. Once the compiler can parse its dependencies, the same script becomes a genuine type gate with no change to it. Before you finish, prove that: plant a type error under `src/`, confirm the gate now catches it, and revert. Say so in your handoff.
- **Fix the second false green in that script while you are in it.** Task 04's QA found the gate classifies a diagnostic by `file.startsWith('src/')`, but `tsc` prints paths relative to the working directory while searching ancestors for `tsconfig.json`. Run from any subdirectory, a real `src/` syntax error is counted as a dependency error and the script exits 0. Reproduced: from the repository root a planted error gives `1 error(s) under src/` and exit 1; from `src/` the same error gives `0 error(s) under src/, 314 in dependencies` and exit 0. Resolve diagnostic paths against the directory holding `tsconfig.json` rather than against the working directory, and prove the planted error is caught from both. This matters because task 08 wires the script into CI, where a `working-directory:` key would silently disarm it.
- `npm run typecheck` passes with zero errors everywhere, not merely under `src/`. Task 04 had to scope its gate to the project's own sources because TypeScript 3.9 cannot parse the `.d.ts` files that `@reduxjs/toolkit`, `react-redux`, `vitest`, `@types/react` and `@types/node` ship; that is around 1800 parse errors inside `node_modules`, and clearing them is the main reason this task exists. Widen the gate back to everything once the compiler can read them.
- `npm run typecheck` passes on TypeScript 5.x with `strict` on and no new `any`, no `@ts-ignore`, and no `@ts-expect-error` introduced. If one is unavoidable, it carries a comment naming the reason and appears in the handoff.
- `npm test` passes with the same test count.
- `npm run build` compiles.
- The regression suite from `qa/procedures/` passes.
- No application logic changed. The only source edits are type annotations and removed `React` imports.

## Handoffs

### Coder

**Changed**

`package.json`: `typescript` `^3.9.2` -> `^5.9.3`. Dropped the `resolutions` field
and `@types/react-redux`; a direct `import ... from 'react-redux'` resolves to the
package's own types before `@types/`, so v7's declarations were never in play.
`@types/node` untouched, and `npm ci --dry-run` still resolves with no `ERESOLVE`.

`tsconfig.json`: `target` `es5` -> `ES2022`, `lib` -> `ES2022` / `DOM` /
`DOM.Iterable`, `moduleResolution` `node` -> `bundler`, `jsx` `react` ->
`react-jsx`. `strict`, `types: ["vitest/globals"]` and `include: ["src"]` are
unchanged.

`qa/tsconfig.json` is new: the QA specs' own project, `strict`, `types: ["node"]`,
`include: ["tests", "*.ts"]`. The `*.ts` entry picks up `suite-config.ts` and the
three Playwright configs, which the specs import from. It reports zero errors as
written, so no QA source needed a change and no assertion was touched. The app's
project still includes only `src`, so no Playwright types reach the app's
compilation.

`src/test-support/fetch.ts`: `(global as any).fetch` -> `globalThis.fetch`, with
the stub promise typed `Promise<Response>`. `global` was the single TS2304 task
04's architect predicted, and this removes an `any` rather than adding one.

Ten now-unused `import React from 'react'` lines removed;
`src/components/TodoItem.tsx` keeps only its named `PureComponent` import. The
eight files that still name `React.` something - `FunctionComponent`, `useEffect`,
`StrictMode`, the DOM event types, `ReactElement` - keep the import.

**`scripts/typecheck.mjs`: both false greens closed**

Widened. The gate filtered on `file.startsWith('src/')` because 3.9 could not
parse the `.d.ts` files its dependencies ship. TypeScript 5 parses all of them, so
the filter is gone: a diagnostic from any file in either project fails the gate.

Made working-directory independent. tsc no longer searches ancestors for a config
and its output is no longer read relative to the shell's cwd. Each project is
named by an absolute path anchored to the script's own location, tsc runs with cwd
set to the directory holding that config, and every reported path is resolved
against that directory and printed relative to the repository root. A
`working-directory:` key in task 08's CI job cannot change what the gate sees.
Task 04's "never pass by accident" guards are all still there.

**Proof the gate is real**

Planted `const plantedTypeError: number = "not a number"` in `src/models/Todo.ts`.
A *type* error is precisely what task 04 established the old gate passed.

| run from | result |
| --- | --- |
| repository root | `src/models/Todo.ts(7,7): error TS2322`, `1 error(s)`, exit 1 |
| `src/` | identical output, exit 1 |
| `qa/` (now holds its own tsconfig.json, the ancestor-search trap) | identical output, exit 1 |

A planted syntax error in the same file also fails from `src/` (4 errors, exit 1);
under the old script that same case reported `0 error(s) under src/, 314 in
dependencies` and exit 0. A planted type error in `qa/tests/support/screen.ts`
fails with its path printed as `qa/tests/support/screen.ts`, not relative to
`qa/`. Every plant was reverted; `git diff` over `src/` and `qa/` shows only the
React-import and `globalThis` edits.

**Verified**

- `npm run typecheck` -> `0 error(s) in tsconfig.json, qa/tsconfig.json`, exit 0
- `npm test` -> 10 files, 55 tests
- `npm run build` -> compiles, 57.32 kB gzipped against 57.33 before, the removed imports
- `npm run test:e2e` -> 22 passed
- `npm run test:e2e:dev` -> 21 passed, 1 skipped (procedure 20)
- `npm run test:e2e:preview` -> 21 passed, 1 skipped
- No `@ts-ignore`, `@ts-expect-error` or `@ts-nocheck` anywhere in `src`, `qa` or
  `scripts`; `any` under `src/` went from 6 occurrences to 5.
- Branch still at `9bb0f5b`. Nothing committed; everything is in the working tree.

**Left alone deliberately**

`AnyAction`. In `src/middlewares/callapimiddleware.ts` both `AnyAction` and
`Dispatch` are imported and never used, so the mechanical rename the scope permits
is a no-op there and I left the dead imports rather than widen the diff; task 06's
ESLint will flag them and task 10 rewrites the file. The live uses are elsewhere:
`Dispatch<AnyAction>` in `src/containers/MainSection.ts` and
`src/containers/VisibleTodoList.ts`, and `errorMessage(state = null, action:
AnyAction)` in `src/reducers/apis.ts`. That last one is not a rename -
`UnknownAction` types the destructured `error` as `unknown`, which changes
`errorMessage`'s return type and forces assertions at the call site. Line 49 puts
that redesign out of scope.

`RootState` still omits `errorMessage` and `exec` (task 12). Nothing in the bump
forced it; Redux 5 does not object.

`vite.config.mts` is still outside every tsconfig. I probed it: it typechecks clean
under the app's options, but only with `"node"` added to `types`, which pulls
`@types/node` globals into the app's compilation - the same contamination this task
asked me to avoid for test types. Left for task 08, with its own config if it wants
one.

`@types/classnames` remains a dependency although classnames ships its own types.
That is task 08's dependency hygiene, not a type error.

**For QA**

Nothing under `qa/` changed except the new `qa/tsconfig.json`. It does not affect
how Playwright runs the specs - all three suites above were run with it in place.
If the qa project's diagnostics would read better relative to `qa/` than to the
repository root, that is one line in `reportedAt`.

No open questions.

### QA

**The branch moved under me.** The coder's note ends "Branch still at `9bb0f5b`.
Nothing committed; everything is in the working tree." It is not. HEAD is
`8ba915b`, "Give the project real type checking on TypeScript 5.9", and it
carries the whole task. I left it alone: nothing committed, nothing reset. The
tree contents match what the note describes, so I verified the commit as the
delivered work. My one edit below is uncommitted in the working tree.

**The type gate is real. I could not find a third false green.**

I treated the script as guilty and planted twelve errors of six kinds, running
each from seven working directories: repository root, `src/`, `src/components/`,
`qa/`, `qa/tests/`, `scripts/`, and `/tmp`. Exit status was captured through a
temp file, never a pipeline, so `PIPESTATUS` never came into it.

| plant | where | caught |
| --- | --- | --- |
| TS2322 assignment | `src/models/Todo.ts` | 7/7 |
| TS2304 unknown name | `src/models/Todo.ts` | 7/7 |
| strictNullChecks violation | `src/models/Todo.ts` | 7/7 |
| TS1005 syntax error | `src/models/Todo.ts` | 7/7 |
| JSX prop error | `src/components/App.tsx` | 7/7 |
| TS2322 | `qa/tests/support/screen.ts` | 7/7 |
| TS2322 | `qa/tests/03-add-todo.spec.ts` | 7/7 |
| TS2322 | `qa/suite-config.ts` (the `*.ts` include) | 7/7 |
| orphan `.ts` nothing imports | `src/zz-orphan.ts` | 7/7 |
| orphan `.ts` nothing imports | `qa/tests/support/zz-orphan.ts` | 7/7 |
| orphan `.tsx` nothing imports | `src/zz-orphan.tsx` | 7/7 |
| errors in both projects at once | both | reported both, counted 2 |

84 runs, all exit 1, every path printed relative to the repository root and not
to the shell's cwd. The orphan plants matter on their own: they prove the gate
reads `include`, not the import graph, so a new unreferenced file cannot slip
through. Elaboration lines survive; the `.tsx` orphan typechecked JSX with no
React import in the file, which is `jsx: react-jsx` working.

The "never pass by accident" guards fire too. Pointing the qa project's
`include` at a missing directory produces TS18003 and exit 1 rather than a
cheerful zero; deleting `qa/tsconfig.json` produces TS5058 and exit 1; making it
unparseable produces exit 1. Task 04's finding reproduces in the negative: the
old script reported `0 error(s) under src/, 314 in dependencies` and exit 0 for
a `src/` error seen from `src/`, and no plant does that now.

Coverage is exact rather than approximate. I diffed `--listFilesOnly` for both
projects against `git ls-files`: every `.ts` and `.tsx` file in the repository is
in one project or the other, 41 in the app and 28 in qa, with no overlap. The qa
project's `*.ts` entry picks up all three Playwright configs as well as
`suite-config.ts`, which is one more than the coder's note claims.

**The React import removal is exactly what it says.**

`git show HEAD -- src/` is ten deleted `import React from 'react'` lines, one
line changed in `TodoItem.tsx` from `import React, { PureComponent }` to
`import { PureComponent }`, and the `globalThis` edit in `test-support/fetch.ts`.
Nothing rode along. The correspondence is total in both directions: the set of
files naming `React.` and the set importing React default are the same eight
files, so no file uses `React.` without the import and none keeps an import it
no longer needs. No `@ts-ignore`, `@ts-expect-error` or `@ts-nocheck` anywhere in
`src/`, `qa/` or `scripts/`. `any` under `src/` is 5, all pre-existing in
`TodoList.tsx` and `callapimiddleware.ts`; the sixth was the `(global as any)`
this task removed.

**ES2022 changed the shipped JavaScript, and the change is behaviour-preserving.**

The bundle is not the same file. I built `9bb0f5b` in a detached worktree against
the same `node_modules` and diffed: 173,897 bytes before, 173,792 after, and the
difference is entirely class-field lowering in the two `PureComponent`
subclasses. Before, esbuild lowered them to `constructor(...e){super(...e),this.state=...}`
plus a `static{this.propTypes=...}` block. Now it emits native
`static propTypes={...}; state={...}; handleSubmit=e=>{...}`. Two
`constructor(...e){super(...e)` lowerings and two static blocks went to zero.

That is `useDefineForClassFields`, which TypeScript defaults to true at target
ES2022 and false below it. It is not set explicitly in either config, so the
target move flipped it, and field initialization went from `[[Set]]` to
`[[Define]]` semantics. That distinction bites in two situations: a declared but
uninitialized field, which becomes an own `undefined` and wipes what a base
constructor assigned, and a field that shadows an inherited accessor.
`TodoTextInput` and `TodoItem` are the only classes in the app and neither is
exposed. Every field in both has an initializer, neither redeclares `props`, and
`React.Component` defines no accessor for `state` or `propTypes`. `state = {
text: this.props.text || '' }` still reads a `props` that `React.Component`'s
constructor set before field initializers run. So the emitted JavaScript differs
and the observable behaviour does not, which the suite agrees with: procedures
05, 06 and 07 drive `TodoTextInput` through the editor and pass.

Worth naming for whoever changes `target` again: nothing in the repository pins
`useDefineForClassFields`, so it moves silently with `target`. Task 11 converts
both classes to functions and retires the exposure.

**The E2E suite is exercising the new build, not a stale one.**

Verified rather than assumed. All three scripts run `npm run build` first;
`qa/stub/main.js` will only serve `dist` and throws if `dist/index.html` is
missing, so task 04's `build/` trap stays closed; `static-files.js` reads from
disk per request with no cache. I started the stub against the fresh `dist` and
fetched what the browser would get: `index.html` references
`/assets/index-CDl9EqmP.js`, the served bytes md5 to `48c2255...`, identical to
`dist/assets/index-CDl9EqmP.js`, and that response contains `static propTypes=`
and zero occurrences of the old constructor lowering. The dev suite goes through
Vite, which transforms from source under the same tsconfig, so it exercises the
new options too.

**Dependency removals hold from the committed lockfile.**

Not `--dry-run`. I exported HEAD with `git archive` into a clean directory with
no `node_modules` and ran a real `npm ci`: 357 packages, exit 0, no `ERESOLVE`.
In that tree `@types/react-redux` is absent, react-redux 9.2.0 supplies its own
`dist/react-redux.d.ts`, and `@types/react` resolves to 18.3.27, which confirms
the removed `resolutions` field was never pinning 18.0.0 and its removal
regressed nothing. From that clean install `npm run typecheck` exits 0,
`npm test` gives 10 files and 55 tests, and `npm run build` reproduces the same
`index-CDl9EqmP.js`.

**Regression suite and release checks**

| check | result |
| --- | --- |
| `npm run typecheck` | `0 error(s) in tsconfig.json, qa/tsconfig.json`, exit 0 |
| `npm test` | 10 files, 55 tests |
| `npm run build` | compiles, 57.32 kB gzipped |
| `npm run test:e2e` | 22 passed |
| `npm run test:e2e:dev` | 21 passed, 1 skipped |
| `npm run test:e2e:preview` | 21 passed, 1 skipped |
| `npm run lint` | **no such script.** Arrives in task 06. Not skipped, absent. |

The skip is procedure 20 in both proxied suites, and the reason is written into
`qa/tests/20-delete-failure.spec.ts` above the `test.skip`: a proxy converts the
stub's destroyed connection into a well-formed 502, and this client ignores HTTP
status by design, so the condition cannot reach the browser. Deliberate and
documented, as the baseline requires.

21 procedures, 21 spec files, 22 `test()` cases, every spec citing its procedure
by path. No procedure changed, so no procedure/test pair needed converting.

**Absences confirmed, not invented**

No Gherkin anywhere: no `.feature` file in the repository. No acceptance
pipeline: no APS wiring, and `scripts/` holds `typecheck.mjs` and nothing else.
No property tests and no property-testing dependency. No mutation tooling, so
the mixed-job hint has no mutation count to compare; the only changed source
with logic in it is `scripts/typecheck.mjs`, and the rest of the diff is ten
deleted import lines and configuration, so there is no manifest to preserve and
no split to make. None of this is a gap in the task, and none of tasks 09 to 13's
hardener criteria apply to a Tooling task with a coder-to-QA chain.

**CRAP gate and DRY on changed files**

The only changed file containing functions is `scripts/typecheck.mjs`.
Cyclomatic complexity by function: `fail` 1, `reportedAt` 1, `compilerPath` 4,
`check` 4, `runCompiler` 5, `readReport` 7. All under 10, each single-job.
`readReport`'s 7 is one `if`/`else if` chain answering one question, "what kind
of line is this", which is the case the exception protects; `runCompiler`'s
guards are the "never pass by accident" property and folding them into helpers
taking booleans the caller already knew is what the definition forbids. Naming
the limit honestly: the coverage-weighted CRAP number cannot be computed here,
because the project configures no coverage reporting and `scripts/` is outside
both test suites, so the reading above is complexity only.

DRY: `tsconfig.json` and `qa/tsconfig.json` share eleven identical compiler
options. I judged that not worth extracting into a base config. They are two
projects that need to diverge, `extends` replaces rather than merges the `lib`
and `types` arrays so a child would restate most of what it changed anyway, and
`tsconfig.json` is not mine to edit at this stage for a cosmetic reason. No other
duplication in the diff.

**The one thing I changed**

`README.md`, one sentence. Under `npm run typecheck` it still said "Type-checks
the sources under `src/`", which was true of task 04's src-scoped gate and is
false of this one, and it contradicts this task's own done criterion that the
gate passes "everywhere, not merely under `src/`". This is the same class of
defect as commit `6be334e`. It now reads that both projects are checked, the app
sources under `src/` and the specs under `qa/`, and that a diagnostic in either
fails. Ordinarily this belongs to the coder, and I am flagging it rather than
burying it: I am the last role on the task, there is nobody to hand a one-line
documentation correction to, and the correction carries no behavioural risk.
Every check above was re-run after the edit.

**On `qa/tsconfig.json`, which lands in my territory**

It belongs and I am keeping it. The scope directed the coder to give the specs
their own config rather than widen the app's `include`, it changes nothing about
how Playwright runs them, all three suites pass with it in place, and no
assertion was touched. `strict` matches the app. `types: ["node"]` is right,
since `suite-config.ts` and `stub-control.ts` read `process.env`; Playwright's
own types arrive through the `@playwright/test` import, not through `types`.
`moduleResolution: "bundler"` is the correct choice rather than a copied one:
every relative import in the specs is extensionless, which `node16` and
`nodenext` would reject and which matches how Playwright's loader actually
resolves them.

One gap I am recording rather than closing. `qa/stub/` is nine JavaScript files
and the qa project sets no `allowJs`, so the harness the whole suite depends on
is unchecked. I measured what closing it costs: `checkJs` reports 89
diagnostics, almost all TS7006/TS7031 implicit-any on parameters, so it means
JSDoc annotations across all nine files. That is real work on test
infrastructure, this task scoped the qa typecheck to `qa/tests/`, and starting it
at the QA stage of a Tooling task would be the wrong place. It is mine to do
when a task makes room for it, and it is a reasonable candidate for task 08's
dependency and CI hygiene.

**Left for the next role**

Nothing blocking. Task 06 gets the `lint` script, and the coder's dead `AnyAction`
and `Dispatch` imports in `src/middlewares/callapimiddleware.ts` are still there
waiting for ESLint to flag them. `vite.config.mts` and `scripts/typecheck.mjs`
remain outside every tsconfig, which the coder left for task 08. `RootState`
still omits `errorMessage` and `exec`, which is task 12.

**Open questions**

None for the project manager. Nothing in the task file or `PLAN.md` was
ambiguous, no QA procedure conflicted with a unit test, and no verification
failed, so there is no fix to assign to another role.
