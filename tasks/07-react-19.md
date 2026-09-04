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

**Verdict: pass.** Every gate green, every one of the five things I was asked to
scrutinize checked independently, nothing left for another role.

**State of the branch**

The coder's note says the changes are uncommitted; they are not. Branch tip is
`896b186 Move to React 19 and delete the propTypes blocks`, which carries exactly
the files the note lists plus the note itself. The branch did not move while I
worked (`896b186` at start and finish) and the tree was clean before and after
everything below. I committed nothing and reset nothing.

**Gates, re-run from a clean tree**

| gate | result |
| --- | --- |
| `npm run lint` | exit 0 |
| `npm run format:check` | exit 0 |
| `npm run typecheck` | 0 errors, both projects |
| `npm test` | 10 files / 55 tests |
| `npm run build` | compiles, 222.37 kB raw / 71.00 kB gzipped, byte-identical hash across two clean builds |
| `npm run test:e2e` | 22 passed |
| `npm run test:e2e:dev` | 21 passed, 1 skipped |
| `npm run test:e2e:preview` | 21 passed, 1 skipped |

No procedure in `qa/procedures/` changed and no test in `qa/tests/` changed: this
task altered no observable behavior, so there was nothing to convert or re-word.
The one skip is procedure 20 under a proxy, documented in the test itself.

**1. The browser really is running React 19, and not a stale artifact**

I did not take the suite's word for it. I installed a stub
`__REACT_DEVTOOLS_GLOBAL_HOOK__` before page load and read back what react-dom
injects into it:

- stub-served built app: `{version: "19.2.8", pkg: "react-dom", bundleType: 0}` (0 = production)
- dev server: `{version: "19.2.8", pkg: "react-dom", bundleType: 1}` (1 = development)

The bundle the browser loaded was `index-BLn6sN3d.js`, the same hash a fresh
`npm run build` produces, and every `test:e2e*` script builds first. The stub also
refuses to start without `dist/index.html`. Staleness is ruled out three ways.

**2. `propTypes` removal is invisible to the gates - confirmed, with one refinement**

Reproduced the coder's experiment and two more, restoring the file each time:

| planted in `Footer.tsx` | typecheck | lint | `npm test` | `npm run build` |
| --- | --- | --- | --- | --- |
| `Footer.propTypes = { activeCount: 0, nonsense: 'x' }` | 0 errors | exit 0 | 55 pass | compiles |
| `const planted: number = Footer` | TS2322, exit 1 | - | - | - |
| the same block *with* `import PropTypes from 'prop-types'` | TS7016, exit 1 | - | - | compiles |

So the gates are live and `propTypes` alone is simply not a typed construct. The
refinement for task 08: a regression that brings the *import* back is caught, but
only incidentally - `prop-types` is still resolvable in the tree via
`eslint-plugin-react` and ships no types, so it trips `noImplicitAny`; were it
absent entirely it would trip TS2307 instead. A bare `X.propTypes = {...}`
assignment, which is the shape a copy-paste regression actually takes, passes
every gate. Note also that the third row *builds*: with the import back, Vite
bundles `eslint-plugin-react`'s copy of `prop-types` into the browser bundle
(+0.8 kB) without a word. A grep guard is worth its CI step; I would grep for
both `propTypes` and `from 'prop-types'` in `src/`. `grep -rn "propTypes\|prop-types" src qa scripts` is empty today.

**3. Class-field lowering - verified independently, and it is also covered by tests**

Confirmed at the artifact, not the source. `npx tsc --showConfig` reports
`useDefineForClassFields: true` (implied by `target: es2022`, still unpinned), and
the emitted bundle carries native class-field syntax for both classes:
`class extends v.PureComponent{state={editing:!1};handleDoubleClick=()=>{...}}` and
`class extends v.PureComponent{state={text:this.props.text||""};...}` (the minifier writes the empty string as a backtick template literal). So the
lowering did not move, and `[[Define]]` is what runs, as it did before this task.
The conditions under which the two semantics agree still hold: I checked React 19
itself, not just the source - `react.production.js` calls `Object.defineProperty`
nowhere, and the dev build defines accessors on `Component.prototype` for exactly
`isMounted` and `replaceState` (`react.development.js:660`), neither of which
these classes touch.

Better than an argument, the risky initializer has coverage. I mutated
`state = { text: this.props.text || '' }` to `state = { text: '' }`, the exact
failure a `[[Define]]`/`[[Set]]` divergence would produce, and 5 of the 55 unit
tests failed. E2E procedures 05 and 06 would catch it too.

**4. Console criterion - the empty set is real, and StrictMode was in it**

I re-collected rather than trusting the coder's walkthrough, because that
walkthrough was happy-path only and the app's noisiest console paths are the
failure ones. My collector took `page.on('console')` for *every* message type plus
`page.on('pageerror')`, drove add / toggle / edit-by-Enter / edit-by-blur /
toggle-all both ways / all three filters / clear-completed / delete, and then armed
a transport fault and drove the failing add, in both dev and production.

React contributed nothing in either. Full inventory:

- production: 6 `log` (the app's own `console.log('action', ...)` in `reducers/apis.ts`), and on the fault path `net::ERR_EMPTY_RESPONSE` plus `TypeError: Failed to fetch`.
- dev: the same 6 `log`, 4 `debug` from Vite's HMR client, and on the fault path a 502, a JSON parse `SyntaxError`, and two RTK dev-middleware `console.error`s about the non-serializable `SyntaxError` sitting in the action and in `errorMessage`.

Nothing of type `warning`, and no React message of any type. The RTK pair and the
fetch failures are React-version-independent: they come from
`@reduxjs/toolkit`'s serializable check and from `callapimiddleware.ts` reading a
body that is not there. They are the console face of the "failures are silent on
screen" behavior `PLAN.md` records.

StrictMode's double render was genuinely included: dev issues 2
`GET api/todos/` per load and production 1, which I measured directly. The
suite-wide sample agrees - across the whole 21-procedure dev run, the only browser
console output Vite forwards (`console.error`) was 15 lines, all five instances of
those same three fault-path messages, none from React. Vite forwards only
`console.error`, which is why my own collector, which takes `warn` too, is the one
that closes the criterion.

I did not build a React 18 side-by-side. With the React-19 warning set empty under
a full workflow in both bundle types, and the collection method verified above,
nothing a React 18 run produced could make a React 19 warning new.

**5. Bundle growth - nothing unexpected came along**

Built with a sourcemap into a scratch directory and read the module list back. 43
sources: 24 app modules and exactly these packages, one copy each:

`@reduxjs/toolkit`, `classnames`, `react`, `react-dom`, `react-redux`, `redux`,
`redux-thunk`, `reselect`, `scheduler`, `use-sync-external-store`.

The React files are `react/cjs/react.production.js`,
`react-dom/cjs/react-dom.production.js`,
`react-dom/cjs/react-dom-client.production.js`,
`react/cjs/react-jsx-runtime.production.js` and
`scheduler/cjs/scheduler.production.js` - production builds only, no duplicated
copy, no dev-only package. `npm ls react react-dom` shows every consumer deduped
onto the single 19.2.8, and `npm ls` exits 0 with no peer complaint.
`prop-types` survives only under `eslint-plugin-react`, and the bundle contains
the string only three times, all inside `hoist-non-react-statics`'s
known-statics list, which `react-redux`'s `connect` has always pulled in.

**CRAP and DRY on the changed files**

`Footer.tsx`, `TodoItem.tsx`, `TodoTextInput.tsx`: the change is purely
subtractive, no branch was added or removed, every method is complexity 1-3
against 55 unit tests and 22 E2E procedures, so CRAP stays far under 10. DRY
improved rather than regressed: the deleted blocks restated the TypeScript
interfaces. No mixed-job hint applies to a deletion; no manifest exists to
preserve.

**Absences confirmed, not invented**

No Gherkin, no `.feature` file, no APS tooling, no acceptance-pipeline runner and
no property test anywhere in the repository. `gherkin-parser` and the APS pipeline
are named only in the future structural tasks 09-13; task 09 is where the
definitions first require one.

**Left for the next role**

- Nothing to fix. No role owns a follow-up from this task.
- Task 08 should decide on the grep guard, with the refinement in section 2 above: catch the bare assignment, since the import already trips typecheck for an incidental reason.
- `useDefineForClassFields` is still unpinned and still implied by `target`. It survived this task's deletion of the only static field, and task 11 will delete these classes outright, so pinning it is optional - but if anything ever adds a class field without an initializer, or a base class with an accessor, the finding stops being decorative.

**Open questions**

None.
