# Task 06: ESLint 9 flat config and Prettier

**Track:** Tooling
**Chain:** coder -> QA
**Status:** in progress

## Goal

Give the project a lint and format setup it owns, replacing the one that disappeared with `react-scripts`.

## Context

The repository has no ESLint config file. Linting was whatever `eslint-config-react-app` did inside `react-scripts`, which is gone as of task 04. `eslint-plugin-jsx-a11y` sits in devDependencies unread. There is no Prettier.

`src/components/Link.tsx` renders a click handler on a bare `<a>` with no `href`, which jsx-a11y will flag. That is existing behavior; see out of scope.

`.editorconfig` sets 2-space indent, UTF-8, `trim_trailing_whitespace = false`, `insert_final_newline = false`. Prettier's configuration must not fight it.

## Scope

- Add ESLint 9 with flat config (`eslint.config.js`), `typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, and `eslint-plugin-jsx-a11y`.
- Add Prettier and wire it so it does not conflict with ESLint's formatting opinions.
- Add `npm run lint` and a format check script. Both must be non-interactive and CI-safe.
- Bring the codebase to zero errors. Where an existing rule violation would require a behavior change to fix, disable the rule at that specific line with a comment naming the reason and list it in the handoff, rather than changing the code.

## Out of scope

- Fixing accessibility defects that change what the user sees or how the app responds to input. `Link.tsx` is the known case: making it a real link or a button changes keyboard behavior and the rendered element. Suppress it here and record it; the project manager will decide whether it earns a task.
- Reformatting that changes behavior.
- Adding rules that enforce architecture. Dependency and boundary rules belong to the architect on a structural task.
- Changing test bodies except where a lint rule requires it.

## Done criteria

- `npm run lint` exits zero.
- The format check exits zero.
- `npm test`, `npm run typecheck`, and `npm run build` all pass.
- The regression suite from `qa/procedures/` passes.
- Every rule suppression in the codebase carries a reason and is listed in the handoff.

## Handoffs

### Coder

Added ESLint 9 (`eslint.config.js`, flat) and Prettier (`prettier.config.js`,
`.prettierignore`), plus `npm run lint`, `npm run format`, and
`npm run format:check`. Devdependencies added: `eslint` 9.39.5, `@eslint/js`
9.39.5, `typescript-eslint` 8.69.0, `eslint-plugin-react` 7.37.5,
`eslint-plugin-react-hooks` 7.1.1, `globals`, `prettier` 3.9.6,
`eslint-config-prettier` 10.1.8. `eslint-plugin-jsx-a11y` 6.10.2 was already
here and is now read.

**What each part of the repository gets, and why**

| Area | Lint | Format |
| --- | --- | --- |
| `src/` (the `tsconfig.json` project) | `js.recommended` + `typescript-eslint` recommended + `eslint-plugin-react` recommended and `jsx-runtime` + `react-hooks` + `jsx-a11y` recommended; browser globals plus the Vitest globals the specs rely on (`globals: true` in `vite.config.mts`, and the `globals` package has no Vitest entry) | yes |
| `qa/tests`, `qa/*.ts` (the `qa/tsconfig.json` project) | same TypeScript rules, Node globals, no React and no `jsx-a11y`: nothing there renders JSX | no, see below |
| `qa/stub/` | `js.recommended` only, `sourceType: 'commonjs'`, Node globals. It is plain CommonJS JavaScript in no tsconfig project, so TypeScript rules would be noise | no, see below |
| Root loose files (`vite.config.mts`, `scripts/*.mjs`) | `js.recommended` + `typescript-eslint` recommended, ESM, Node globals. Neither belongs to a tsconfig project; linting them without type information is the point of a non-type-aware setup | yes |
| `eslint.config.js`, `prettier.config.js` | `js.recommended`, `sourceType: 'commonjs'`, Node globals | yes |
| `dist/`, `coverage/`, `qa/.artifacts/` | ignored | ignored |

Linting is deliberately **not type-aware**. `typescript-eslint`'s
`recommendedTypeChecked` set would need a parser project wired to both
tsconfigs plus a default project for the loose files, and it flags patterns in
`callapimiddleware.ts` and the `connect()` containers that tasks 09 to 12 are
scheduled to delete. `npm run typecheck` already covers both projects
whole-program. A question for the project manager rather than a decision I
made: whether type-aware linting earns a task once the structural work lands.

`eslint.config.js` is CommonJS. `package.json` has no `"type": "module"` and
cannot get one while `qa/stub/` uses `require`, so Node reads a bare `.js` at
the root as CommonJS. Every other config here declares its module system in its
extension (`.mts`, `.mjs`); this one declares it by not having one.

**Prettier and .editorconfig**

`prettier.config.js` restates `indent_style`/`indent_size` as
`useTabs: false`/`tabWidth: 2`, so the two files agree in writing rather than by
resolution order. `singleQuote: true` and `semi: false` were chosen by
measurement: they are the house style, and they cut the one-time reformat of
`src/` from 2160 changed lines to 1324.

The two unusual keys do not conflict. Prettier has no option for
`trim_trailing_whitespace` or `insert_final_newline`: it always trims and always
ends a file with a newline. `false` in EditorConfig tells the *editor* to leave
those alone, which is exactly what you want when a formatter owns them - no
editor will re-add the trailing space Prettier removed or strip the newline it
added, so the two never take turns undoing each other. Before this task 3 files
carried trailing whitespace and 4 lacked a final newline; the reformat settled
both, and nothing in the config re-introduces either.

**What the format check does not cover, and why**

`.prettierignore` excludes `qa/` and all Markdown. The E2E suite is QA's:
procedures, specs, and the stub change together and only QA touches them, so
formatting them is QA's call, not this task's. `npm run lint` still reads `qa/`
in full - it reports without rewriting, and it is currently clean. Markdown is
excluded because Prettier reflows tables and lists, which would rewrite
`PLAN.md`, the task files, and `qa/procedures/*.md`. If QA wants the suite
formatted, deleting the `qa/` line and running `npm run format` is the whole
change.

**Suppressions, all of them, and the reason each one exists**

Every one is a rule that can only be satisfied by changing what the app does.
Each is an `eslint-disable-next-line` at the offending line with the reason in
the comment above it. There are no file-level or repository-level rule
disables.

1. `src/components/Link.tsx:12` - `jsx-a11y/anchor-is-valid`,
   `jsx-a11y/click-events-have-key-events`,
   `jsx-a11y/no-static-element-interactions`. The filter links are bare anchors
   with a click handler and no `href`. A real href, or a `<button>`, changes the
   rendered element and its keyboard behavior. This is the case the task names;
   the project manager decides whether it earns a task.
2. `src/components/MainSection.tsx:24` -
   `jsx-a11y/label-has-associated-control`,
   `jsx-a11y/click-events-have-key-events`,
   `jsx-a11y/no-noninteractive-element-interactions`. The toggle-all control is
   an empty `<label>` that `todomvc-app-css` draws as a chevron. Giving it text,
   associating it with the checkbox, or adding a key handler changes what the
   user sees or how the app responds to input. Same shape as Link.tsx, same
   decision to make.
3. `src/components/TodoTextInput.tsx:63` - `jsx-a11y/no-autofocus`. Dropping
   `autoFocus` moves where the caret lands when the new-todo field mounts and
   when an item opens for editing.

**Lint errors fixed rather than suppressed** (no runtime behavior changed; the
compiler and both test suites agree):

- `src/reducers/todos.ts` - wrapped the `COMPLETE_ALL_TODOS` case body in braces
  (`no-case-declarations`).
- `src/middlewares/callapimiddleware.ts` - dropped the unused `Dispatch` and
  `RootState` imports; the middleware parameter is now `unknown` narrowed by an
  explicit cast instead of `any` (annotating it `AnyAction` does not typecheck
  under `strictFunctionTypes`); `payload` is `Record<string, unknown>`, and the
  fetch callbacks take `unknown`.
- `src/components/TodoList.tsx` - `actions: any` became
  `actions: typeof TodoActions`, matching what `MainSection` already declares
  for the same object.

**Proof that the new gates can fail**

A gate that cannot fail is worse than no gate, so each was falsified before
being reported green. Exit codes were captured directly, never through a pipe.

- `npm run lint` with the `Link.tsx` disable line deleted: exit 1, the three
  `jsx-a11y` errors return. Restored: exit 0. The suppressions are load-bearing,
  not decoration.
- Every config block was probed through `eslint --stdin --stdin-filename` with a
  planted violation, so none of them silently matches nothing:
  `src/probe.tsx` (unused var + two `jsx-a11y` errors), `qa/tests/probe.spec.ts`,
  `qa/probe.ts`, `qa/stub/probe.js` (core `no-unused-vars`, proving the
  CommonJS block applies), `vite.config.mts`, `scripts/probe.mjs`,
  `eslint.config.js`, `prettier.config.js` - all exit 1.
- `react-hooks/rules-of-hooks` fires on a conditionally called hook (exit 1).
- `--max-warnings=0` on the lint script is load-bearing: an
  `react-hooks/exhaustive-deps` violation is a warning, and without the flag the
  run exits 0 with the warning printed. With it, exit 1.
- `npm run format:check` with a badly formatted statement appended to
  `src/models/Todo.ts`: exit 1. With only trailing whitespace added to one line:
  exit 1. Restored: exit 0.
- `npm run typecheck` still catches planted type errors in both projects: a bad
  assignment in `src/models/Todo.ts` and a temporary `qa/probe-typecheck.ts`
  each produced exit 1 with the diagnostic named. Both probes were removed;
  `git status` shows nothing left behind under `qa/`.

**Verified** (each command run to completion after the reformat, exit code
captured):

- `npm run lint` 0, `npm run format:check` 0.
- `npm test` - 10 files, 55 tests, all pass.
- `npm run typecheck` - 0 errors in `tsconfig.json`, `qa/tsconfig.json`.
- `npm run build` - built, 57.32 kB gzipped JS.
- `npm run test:e2e` - 22 passed. `npm run test:e2e:dev` - 21 passed, 1 skipped.
  `npm run test:e2e:preview` - 21 passed, 1 skipped.
- `.github/workflows/nodejs.yml` was reformatted by Prettier (list indentation
  only). Parsed before and after with `js-yaml`: the two documents are
  structurally identical, so CI reads the same workflow.
- `index.html` was reformatted too; the only change is `<meta ...>` becoming
  `<meta ... />`, which parses to the same DOM.

**Left for QA**

- Nothing under `qa/` was edited or added. The suite is untouched.
- The reformat rewrote 41 tracked files plus `package.json`, `tsconfig.json`,
  and the workflow. It is Prettier output only - no statement was moved, added,
  or removed by hand outside the four files listed above.
- Nothing is committed; the changes are in the working tree on
  `claude/react-modernization-plan-u7dgen`, which has not moved (`95a0f03`).

**Open questions for the project manager**

1. ESLint 10 shipped; 9.39.5 is now the `maintenance` tag. The task said ESLint
   9 and that is what is installed. Bumping to 10 belongs in task 08 if it is
   wanted - `eslint-plugin-react` 7.37.5 currently peers `^9.7` only.
2. Two accessibility defects are now suppressed and recorded: the filter anchors
   (`Link.tsx`) and the toggle-all label (`MainSection.tsx`). Both need a
   behavior decision, not a lint decision.
3. `qa/` is linted but not formatted. If that split should not stand, it is a
   one-line change to `.prettierignore` plus a QA run.
4. Type-aware linting is off. See the reasoning above; it is a task, not a
   config flag.

#### Follow-up: the project manager's answers, and the ESLint 10 bump

**ESLint 10: attempted, and it does not install. Stopping here, as asked.**

Two of the six lint packages do not declare support for ESLint 10 at their
latest published versions:

| Package | Latest | Declared `eslint` peer range | ESLint 10? |
| --- | --- | --- | --- |
| `eslint-plugin-react` | 7.37.5 (2025-04-03) | `^3 \|\| ^4 \|\| ^5 \|\| ^6 \|\| ^7 \|\| ^8 \|\| ^9.7` | no |
| `eslint-plugin-jsx-a11y` | 6.10.2 (2024-10-26) | `^3 \|\| ^4 \|\| ^5 \|\| ^6 \|\| ^7 \|\| ^8 \|\| ^9` | no |
| `eslint-plugin-react-hooks` | 7.1.1 | `... \|\| ^9.0.0 \|\| ^10.0.0` | yes |
| `typescript-eslint` | 8.69.0 | `^8.57.0 \|\| ^9.0.0 \|\| ^10.0.0` | yes |
| `eslint-config-prettier` | 10.1.8 | `>=7.0.0` | yes |
| `@eslint/js` | 10.0.1 | `^10.0.0` | yes (and requires it) |

How that was established, rather than read off a cached memory:

- `npm install --save-dev eslint@^10 @eslint/js@^10 --dry-run` in this
  repository exits 1 with `ERESOLVE`, and npm's own advice is `--force` or
  `--legacy-peer-deps`, which is the override you told me not to reach for.
- To find out which packages are actually the blockers rather than guessing
  from that one entangled report, each package was installed on its own against
  `eslint@10.10.0` in a throwaway project. `eslint-plugin-react` and
  `eslint-plugin-jsx-a11y` exit 1; the report names the peer range in the table
  above. The other four exit 0.
- Neither blocker has a prerelease that would help: `eslint-plugin-react`'s
  `next` tag is `7.8.0-rc.0`, which is older than `latest`, and
  `eslint-plugin-jsx-a11y` has no tag but `latest` and a `v5-backport`.

So the setup stays on `eslint` 9.39.5 and `@eslint/js` 9.39.5. 9.39.5 is the
current `maintenance` release and the newest 9.x, not an abandoned pin. Nothing
was forced, no `overrides` block was added, and `package.json` is unchanged
from what you committed.

Worth separating two things before this is decided: a peer range is a
declaration, not a test. Both blockers are rule-only plugins and may well run
fine under ESLint 10. But making that true in this repository today requires
`--legacy-peer-deps` or an `overrides` entry, which turns every future
`npm ci` into a claim nobody has checked - and a plugin that fails to load is
exactly the failure mode where `npm run lint` still exits 0. If you want the
bump before upstream moves, it needs to be a task with its own falsification
pass, not a version edit.

**Type-aware linting: considered and declined.** Recorded here so the next
person does not have to re-derive it. It costs real time on every run, both
tsconfig projects plus the loose root files would need parser wiring, and the
diagnostics it would add most credibly overlap with `npm run typecheck`, which
now checks both projects whole-program. The one place it might genuinely earn
its keep is `src/middlewares/callapimiddleware.ts`: its `fetch` promise chain is
returned in one branch and dispatched-and-forgotten in another, which is what
`@typescript-eslint/no-floating-promises` exists to catch. Task 10 replaces that
middleware with RTK thunks, so whoever takes that task has the thread.

**`.prettierignore` excluding `qa/` and Markdown: kept**, per your ruling. No
change.

**Re-verified after your commit `18801c1`**, on a clean tree, exit codes
captured directly:

- `npm run lint` 0, `npm run format:check` 0, `npm run typecheck` 0,
  `npm test` 0 (10 files, 55 tests), `npm run build` 0.
- All eight config-block probes still fail on a planted violation:
  `src/probe.tsx`, `qa/tests/probe.spec.ts`, `qa/probe.ts`, `qa/stub/probe.js`,
  `vite.config.mts`, `scripts/probe.mjs`, `eslint.config.js`,
  `prettier.config.js` - every one exits 1.
- `--max-warnings=0` is still load-bearing: the same `exhaustive-deps`
  violation exits 0 without the flag and 1 with it.
- Deleting the `Link.tsx` disable line still fails the lint run (exit 1) and
  restoring it returns 0; a formatting violation still fails `format:check`
  (exit 1) and reverting returns 0.

Only this note is uncommitted; nothing else in the tree changed.

### QA

Verified independently, by my own methods rather than by re-reading the coder's.
Nothing changed in the working tree: the branch is still
`claude/react-modernization-plan-u7dgen` at `b990750`, and `git status` is clean
apart from this note. Every probe below was restored and the gates re-run to
zero afterwards.

**The reformat: 37 files, and what actually differs**

Checked by taking each formattable file's pre-task version at `95a0f03`, piping
it through `prettier --stdin-filepath` under the new config, and comparing bytes
against the committed version. 43 files qualified. 36 are byte-identical to
Prettier's output on the old source, so they cannot carry a hand edit. Seven
differ: `package.json` (the devDependency and script additions, which I read in
full - nothing else moved) and exactly the six the coder named. No source file
was added or deleted; the only additions in the task are `eslint.config.js`,
`prettier.config.js`, and `.prettierignore`.

**Behavior preservation, proven on the build output rather than argued**

I built `95a0f03` and `HEAD` from identical `node_modules` into separate trees
and compared the emitted bundles. The CSS is byte-identical. The JavaScript
differs by 9 bytes out of 173,801: a common prefix of 172,077 characters and a
common suffix of 251, with one differing region that contains exactly two
things and nothing else.

- `case Yn:let n=...;return ...` became `case Yn:{let t=...;return ...}`. Only a
  block scope, and it tightens one that previously leaked across the switch.
- The middleware arrow gained `let r=n` and renamed minifier registers
  downstream. The destructuring, the three-string-types throw, the request
  dispatch, the `fetch` chain, `.then`, and `.catch` are character-for-character
  the same shape.

That is the whole runtime delta of this task. Two consequences worth stating
because they were the things at risk. `TodoList`'s new
`import * as TodoActions` is elided completely - it does not appear in the
bundle, and the module was already in the graph through `VisibleTodoList`. And
the middleware still never reads `response.ok`; `grep` finds no `.ok` anywhere
in `src/`, so the behavior task 10 is scheduled to replace is preserved intact,
and `qa/tests/21-http-error-status-ignored.spec.ts` still pins it.

`dist/index.html` differs from the old build only in `<meta charset="utf-8">`
becoming `<meta charset="utf-8" />`. Same DOM.

The lockfile's 3337-line diff resolves to 132 changed package entries, every one
of them marked `dev`. Zero runtime packages moved, and `dependencies` in
`package.json` is unchanged. The identical bundle prefix says the same thing
from the other direction.

**The lint gate can fail, tested on real files**

Stdin probes prove a config block matches a filename. They do not prove ESLint
walks to that file, so I planted a real violation in a real tracked file for
each of the eight blocks, ran `npm run lint`, and captured the exit code
directly with `rc=$?` and no pipe in front of it. Baseline 0. Every probe 1:
`src/models/Todo.ts` and `src/components/Header.tsx` (the second one raising
three `jsx-a11y` errors, so the React and a11y rules are live and not just the
core set), `qa/suite-config.ts`, `qa/tests/03-add-todo.spec.ts`,
`qa/stub/faults.js` (core `no-unused-vars`, so the CommonJS block is doing
work), `vite.config.mts`, `scripts/typecheck.mjs`, `eslint.config.js`,
`prettier.config.js`. All restored, final run 0.

Separately, the quieter failure: a file that no block matches is still "linted",
with no rules, and passes. I ran `--print-config` over all 82 files ESLint
visits and counted enabled rules on each. None has zero. `src/` gets 132 (129
error, 3 warning), the `qa` TypeScript files 65, the stub and the root CommonJS
configs 60. Nothing falls through.

`--max-warnings=0` is load-bearing, confirmed. My first attempt at a
warning-only plant was not one - `react-hooks/set-state-in-effect` fired as an
error alongside it and the test proved nothing, so I replaced it with a
`useEffect` reading a state value with an empty dependency array. That yields
one warning and no errors: `npx eslint .` exits 0 and prints it, `npm run lint`
exits 1. The flag is the only thing standing between a warning and a green run.

`format:check` falsified twice, exit code captured directly: once with a badly
spaced statement appended to `src/models/Todo.ts` (exit 1), once with nothing
but three trailing spaces on line 1 (exit 1). Restored, exit 0.

**The suppressions: three, all load-bearing, none over-broad**

`grep` across the tree finds exactly three suppression comments, all
`eslint-disable-next-line`, covering seven rule names between them. There is no
file-level or repository-level disable, and no `@ts-ignore`, `@ts-expect-error`,
`@ts-nocheck`, or `prettier-ignore` anywhere in the repository.

Deleting each directive in turn and re-running raises exit 1 with exactly the
rules that directive names, and nothing else. In the other direction,
`eslint . --report-unused-disable-directives` exits 0 with no output, which means
not one of the seven names suppresses nothing - no rule was listed for padding.

On whether each is genuine rather than convenient: all three are. `Link.tsx`'s
anchors have a click handler and no `href`; either fix changes the rendered
element and its keyboard behavior, and the task file names this case as out of
scope explicitly. `MainSection.tsx`'s toggle-all is an empty `<label>` that
`todomvc-app-css` draws as a chevron, sitting next to a `readOnly` checkbox with
no `onChange` - associating the two would make a label click toggle the checkbox
natively, which is new behavior, and labelling or adding a key handler changes
what the user sees. `TodoTextInput.tsx`'s `autoFocus` decides where the caret
lands on mount for both the new-todo field and an item opened for editing.

**No rule was quietly switched off**

This is the same thing as a suppression and harder to see, so I checked it
directly rather than by reading the file. `eslint.config.js` contains no rule
overrides at all - every `rules` block is a spread of an upstream recommended
set. I then resolved the full config and read the 386 disabled rules. They are
`eslint-config-prettier`'s formatting set, plus upstream's own defaults:
`typescript-eslint` retiring base rules in favour of its own
(`no-unused-vars`, `no-undef`, `no-redeclare`, `no-unused-expressions` and so
on), `jsx-runtime` retiring `react/react-in-jsx-scope`, and `jsx-a11y`'s
recommended set turning off its three deprecated or opt-in rules. Nothing local.

One thing to record rather than to fix: `eslint-config-prettier` also switches
off `no-unexpected-multiline`, which is a correctness rule in `js.recommended`,
not a formatting one. That is the config's documented behavior and it is
harmless while Prettier owns layout, since Prettier's output cannot produce the
ambiguity the rule guards. Noted so nobody rediscovers it as a hole.

**The two type-only fixes**

Both confirmed non-behavioral by the bundle comparison above, and consistent on
reading. In the middleware, `const message = action as Partial<ApiActionMessage>`
is an alias for the same object, `!message.types` is the same test as
`!action.types`, `next(action)` still forwards the original reference, and the
`payload = {}` default survives the destructure. The removed `AnyAction`,
`Dispatch`, and `RootState` imports were type-only and erased already.
`TodoList`'s `actions: typeof TodoActions` matches what `MainSection` has always
declared for the same object, what `VisibleTodoList` supplies through
`bindActionCreators`, and what `TodoList.spec.tsx` already passed - the spec
typechecks unchanged against the tighter type, which is independent evidence the
type is true rather than merely accepted.

**CRAP gate and DRY on changed files**

The task changed no control flow anywhere, which the bundle diff establishes
directly, so no file's CRAP moved. Measured anyway, pre and post, on every
semantically changed file: `callapimiddleware.ts` 6 both sides, `todos.ts`
`todos` 9 and `todoApiResults` 7 both sides, `TodoList.tsx` under threshold both
sides. Nothing exceeds 10, so the gate passes outright without needing the
`switch` exception, and the two `switch`es that come closest each answer one
question. Test coverage did not move either: 10 files, 55 tests, same as
baseline, and the middleware is exercised by `createTestStore` in the component
specs as well as by all five E2E failure procedures. I could not compute an
absolute CRAP number because the repository installs no coverage provider - see
the findings below.

DRY: the only new code is two declarative config files. `eslint.config.js`
repeats `ecmaVersion`, `sourceType`, and `globals` across its blocks, and I
considered extracting a shared base. Declined: those three keys are the entire
reason the blocks are separate, and hoisting them would hide the differences
that make the config correct. Nothing else duplicates.

**Absence confirmed, not assumed**

No Gherkin: no `.feature` files, no `gherkin-parser` or `gherkin-mutator`, no
APS wiring, nothing in `package.json` or `PLAN.md`. No acceptance pipeline. No
property tests - `fast-check` is not installed. No mutation manifests and no
mutation tooling. So there was nothing of that kind to run, and I invented
none.

**Regression suite**

Run from a clean tree at `b990750`, each exit code captured directly.
`npm run lint` 0, `npm run format:check` 0, `npm run typecheck` 0 (both
projects), `npm test` 0 with 10 files and 55 tests, `npm run build` 0 at 57.32
kB gzipped. `npm run test:e2e` 22 passed. `npm run test:e2e:dev` 21 passed, 1
skipped. `npm run test:e2e:preview` 21 passed, 1 skipped. Every number matches
the baseline exactly. The single skip is
`qa/tests/20-delete-failure.spec.ts:23`, guarded on `proxiedBackend` and
carrying its reason in the call - a proxy turns the transport fault into a 502,
which this client reads as success. Deliberate and unchanged.

All 21 procedures in `qa/procedures/` still pair one-to-one by name with the 21
specs in `qa/tests/`. `git diff 95a0f03 HEAD -- qa/` is empty: the suite was not
touched by this task, and I did not touch it either.

I also re-ran `lint` and `format:check` with `dist/` and `qa/.artifacts/`
populated from the E2E runs, which is the state CI would be in after a build.
Both still 0; the ignore lists hold.

**Findings for the project manager**

1. **The new gates are not wired into CI.** `.github/workflows/nodejs.yml` runs
   `npm ci`, `npm run build --if-present`, and `npm test`. It does not run
   `lint`, `format:check`, `typecheck`, or any E2E config. Task 06's scope asked
   for scripts that are "CI-safe", not for scripts wired into CI, and the done
   criteria are all met as written - so this is not a failure of this task and I
   am not naming a role for a fix. But it is worth saying plainly: a gate that
   only runs when somebody remembers to run it is close in effect to the gate
   that cannot fail, and `typecheck` has been in that position since task 05.
   Wiring the four of them into the workflow is a small, self-contained change;
   it needs an owner and a task number. The workflow also still uses
   `actions/checkout@v1` and `actions/setup-node@v1`, which is the same
   conversation.
2. **No coverage provider is installed.** `@vitest/coverage-v8` is absent, so
   the project cannot produce a coverage number, and the CRAP gate cannot be
   computed in absolute terms by anyone - only its delta, which is what I
   verified. Since CRAP is a standing project gate, that is a gap worth a
   decision. Adding a devDependency was outside what this task authorised me to
   do.
3. **`qa/` stays unformatted, and I am the one keeping it that way.** Your
   ruling stands and I am not overruling it. For the record, the cost of
   reversing it is exactly 37 files: every `.ts` and `.js` under `qa/` would be
   rewritten, the whole suite. Doing that during the task whose central claim is
   "the reformat changed nothing" would make this diff harder to audit for no
   verification benefit. If it is wanted, it should be its own change with its
   own regression run.
4. **The ESLint 10 evidence holds.** I read the peer ranges off the installed
   packages rather than trusting the table: `eslint-plugin-react` 7.37.5 declares
   `^9.7` and `eslint-plugin-jsx-a11y` 6.10.2 declares `^9`, while the other four
   already accept `^10`. Two real blockers, both rule-only plugins. The decision
   to stay on 9.39.5 without `--legacy-peer-deps` or an `overrides` block is
   correctly made.

**Left for the next role**

Nothing outstanding and no open questions of my own. Task 06's done criteria are
all met and independently verified. Item 1 above is the only thing I would want
answered before it is forgotten, and it is a scope question for you rather than
a defect in this task.
