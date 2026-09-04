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

### QA
