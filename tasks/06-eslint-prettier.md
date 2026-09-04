# Task 06: ESLint 9 flat config and Prettier

**Track:** Tooling
**Chain:** coder -> QA
**Status:** pending

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

### QA
