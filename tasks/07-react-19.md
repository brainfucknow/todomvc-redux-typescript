# Task 07: React 18 to 19 and remove prop-types

**Track:** Tooling
**Chain:** coder -> QA
**Status:** in progress

## Goal

Move the app to React 19 and drop the `prop-types` runtime checks that React 19 no longer honours.

## Context

React and react-dom are at 18.3.1. `src/index.tsx` already uses `createRoot` and `StrictMode`, so the React 18 root API migration is done.

React 19 ignores `propTypes`. Three components declare them, duplicating their TypeScript prop interfaces: `Footer`, `TodoItem`, `TodoTextInput`.

Task 02 removed `react-shallow-renderer`, which has no React 19 build. That is why this task comes after it.

`@testing-library/react` 14 predates React 19 and will need a bump.


## Inherited: class field semantics changed silently in task 05

Task 05 moved `target` from ES5 to ES2022. TypeScript turns
`useDefineForClassFields` on by default at ES2022, and nothing in this
repository pins it, so class field initialization changed from `[[Set]]` to
`[[Define]]` without anyone asking for it. Task 05's QA found this by diffing
the built bundle: the *entire* byte difference between the two builds was class
field lowering in `TodoItem` and `TodoTextInput`, the only two class components
left.

It is safe as things stand, and QA established why: every field in both classes
has an initializer, neither redeclares `props`, and `React.Component` exposes no
accessor for `state` or `propTypes`. Those are the conditions under which the
two semantics agree. Do not assume they still hold after you change these
classes.

`propTypes` is a static class field on both of these components, and this task
deletes it. That is a change to exactly the construct whose lowering just moved.
Confirm the built output still behaves, do not reason about it from the source
alone.

## Scope

- Bump `react`, `react-dom`, `@types/react`, `@types/react-dom` to 19.
- Bump `@testing-library/react` to a version that supports React 19.
- Delete every `propTypes` declaration and remove the `prop-types` dependency. The TypeScript interfaces already state the same contracts.
- Fix whatever the bump breaks: type changes in `@types/react` 19, any removed API the code touches, any test that asserted on React 18 behavior.

## Out of scope

- Adopting React 19 features. No `use`, no Actions, no `useOptimistic`, no compiler. This task changes the version, not the idioms.
- Converting class components to functions. `TodoItem` and `TodoTextInput` stay classes here; that is task 11.
- Changing state management, data fetching, or component structure.

## Done criteria

- `npm test` passes with the same test count.
- `npm run typecheck`, `npm run lint`, and `npm run build` all pass.
- The regression suite from `qa/procedures/` passes, and the app behaves identically in the browser.
- No `prop-types` import and no `propTypes` assignment remains, and the dependency is gone.
- No console warnings in the browser that were not there on React 18. If any remain, list them in the handoff.

## Handoffs

### Coder

**Changed**

- `react` and `react-dom` 18.3.1 -> 19.2.8; `@types/react` -> 19.2.18, `@types/react-dom` -> 19.2.7.
- `@testing-library/react` 14.3.1 -> 16.3.3. Version 16 takes `@testing-library/dom`
  as a peer dependency rather than bundling it; the repository already had it as a
  direct devDependency, so nothing else moved.
- Deleted the three `propTypes` declarations and their `prop-types` imports
  (`Footer`, `TodoItem`, `TodoTextInput`) and removed `prop-types` from
  `dependencies`. It survives in the tree only under `eslint-plugin-react`, which
  is ESLint's own dependency and not shipped to the browser: `npm ls prop-types`
  shows that single path.

Nothing else needed fixing. No removed React API was in use anywhere in `src/`
or `qa/` (`defaultProps`, `findDOMNode`, `unmountComponentAtNode`,
`ReactDOM.render`, `react-test-renderer` all absent), `src/index.tsx` was already
on `createRoot`, and no spec asserted React 18 behavior: the 55 tests pass
unedited. No test bodies, component structure, or idioms were touched.

**Verified**

| gate | result |
| --- | --- |
| `npm run lint` | exit 0 |
| `npm run format:check` | exit 0 |
| `npm run typecheck` | 0 errors, both projects |
| `npm test` | 10 files / 55 tests |
| `npm run build` | compiles, 222.37 kB (was 173.80 kB - React 19 is bigger) |
| `npm run test:e2e` | 22 passed |
| `npm run test:e2e:dev` | 21 passed, 1 skipped |
| `npm run test:e2e:preview` | 21 passed, 1 skipped |

Baselines were captured on the clean tree first, so each of those is a
before-and-after comparison and not a reading of the number alone.

**On the inherited class-field finding**

I checked the built bundle rather than the source, as the finding asks. Both
class bodies are emitted with native class-field syntax in the React 18 baseline
build and in the React 19 build alike - `state={editing:!1};handleDoubleClick=()=>...` and the minified
form of `state={text:this.props.text||''}` - so the lowering did not move. The
*only* difference between the two emitted class bodies is that the leading
`static propTypes={...}` field is gone. Field order and every initializer,
including the one that reads `this.props`, are otherwise identical modulo
minifier identifiers.

The conditions QA established for `[[Set]]` and `[[Define]]` agreeing still hold
after the deletion: every remaining field has an initializer, neither class
redeclares `props`, and React 19's `Component.prototype` defines accessors for
nothing but the deprecated `isMounted`/`replaceState` warnings in the dev build
(`node_modules/react/cjs/react.development.js:15`) - no accessor for `state`,
`props`, or `propTypes`, and none at all in the production build. Deleting the
classes' only static field cannot break a condition none of these depend on.

**Console**

No new warnings, and in fact none at all. I drove a browser through add, toggle,
edit, all three filters, clear-completed, and delete, collecting every console
message and page error, in both dev (`npm run dev`, StrictMode double-render
included) and against the production `dist/` served by the QA stub. Dev printed
only Vite's connect chatter, React's "Download the React DevTools" info notice,
and the app's own action logs; production printed only the action logs. Nothing
of type `warning` or `error` in either. An empty warning set cannot contain a
warning React 18 did not have, so the criterion holds without a React 18
side-by-side - which is just as well, since reverting the tree to re-measure one
was blocked by the sandbox.

**Finding for QA: the compiler cannot police this deletion**

`@types/react` 19 still declares `propTypes?: any` on `FunctionComponent` and
`ComponentClass` (`node_modules/@types/react/index.d.ts:1066,1127`). I planted
`Footer.propTypes = { activeCount: 0 }` on the React 19 tree and `npm run
typecheck` reported zero errors; a genuine type error planted in the same file
was caught immediately, so the gate is live - `propTypes` simply is not a typed
construct. React 19 ignores the property at runtime and TypeScript ignores it at
compile time, so a `propTypes` block that crept back would be silently dead code
that no gate in this repository fails on. Grep is the only check that works
here; `grep -rn "propTypes" src` is currently empty.

**Left for QA**

- Nothing outstanding. Scope was the version, not the idioms: `TodoItem` and
  `TodoTextInput` are still classes for task 11, and no React 19 feature was
  adopted.
- Changes are in the working tree, uncommitted. Branch `claude/react-modernization-plan-u7dgen`
  did not move under me.
- Modified: `package.json`, `package-lock.json`, and the three components.

**Open questions**

None.

### QA
