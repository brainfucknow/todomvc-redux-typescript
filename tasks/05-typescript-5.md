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
- Remove `@types/react-redux` if react-redux's own types suffice. Leave `@types/node` alone: task 03 raised it from `^13.13.6` to `^22.19.1` because every Vite version declares it as an optional peer with a floor far above 13, and `npm ci` failed with `ERESOLVE` until it moved. It is excluded from automatic inclusion by the `types` array and no source imports it, but removing it breaks install resolution.
- `qa/` sits outside `tsconfig.json`'s `include` because TypeScript 3.9 cannot parse Playwright's type definitions, and Playwright transpiles the specs without typechecking them. TypeScript 5 can. Bring `qa/tests/` under a typecheck, in its own project reference or its own config rather than by widening the app's `include`, so the app's compilation stays free of test types. Fix any type error this surfaces in the test sources. Do not change what any test asserts; if a type error can only be resolved by changing an assertion, stop and report it.

## Out of scope

- Correcting `RootState` to match the real store shape. That is task 12, and it is structural.
- Replacing `AnyAction` usage as part of a redesign of the middleware. If a mechanical rename to `UnknownAction` keeps the code compiling with identical behavior, do it; if it forces a redesign, leave it and say so.
- Any change that moves logic between modules.
- Adding or removing behavior. If a type error can only be fixed by changing what the code does, stop and report it.

## Done criteria

- `npm run typecheck` passes on TypeScript 5.x with `strict` on and no new `any`, no `@ts-ignore`, and no `@ts-expect-error` introduced. If one is unavoidable, it carries a comment naming the reason and appears in the handoff.
- `npm test` passes with the same test count.
- `npm run build` compiles.
- The regression suite from `qa/procedures/` passes.
- No application logic changed. The only source edits are type annotations and removed `React` imports.

## Handoffs

### Coder

### QA
