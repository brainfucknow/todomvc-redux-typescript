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
