# Task 05: TypeScript 3.9 to 5.x and modern tsconfig

**Track:** Tooling
**Chain:** coder -> QA
**Status:** pending

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
- `npm run typecheck` passes with zero errors everywhere, not merely under `src/`. Task 04 had to scope its gate to the project's own sources because TypeScript 3.9 cannot parse the `.d.ts` files that `@reduxjs/toolkit`, `react-redux`, `vitest`, `@types/react` and `@types/node` ship; that is around 1800 parse errors inside `node_modules`, and clearing them is the main reason this task exists. Widen the gate back to everything once the compiler can read them.
- `npm run typecheck` passes on TypeScript 5.x with `strict` on and no new `any`, no `@ts-ignore`, and no `@ts-expect-error` introduced. If one is unavoidable, it carries a comment naming the reason and appears in the handoff.
- `npm test` passes with the same test count.
- `npm run build` compiles.
- The regression suite from `qa/procedures/` passes.
- No application logic changed. The only source edits are type annotations and removed `React` imports.

## Handoffs

### Coder

### QA
