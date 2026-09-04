# Task 02: Replace shallow-renderer tests with Testing Library

Status: in progress

## Goal

Component tests assert on what a user can observe in rendered output, not on unrendered React element trees. `react-shallow-renderer` is gone from the project.

## Scope

- Rewrite `src/components/*.spec.tsx` against `@testing-library/react` and `@testing-library/user-event`: query by role, label, and text; drive behavior through simulated user interaction; assert on rendered DOM and on the callbacks the component was given.
- Every behavior currently asserted by a shallow-renderer test keeps an assertion. Where a shallow test asserted an implementation detail with no user-observable counterpart (which child component type an element is, the positional index of a child in `props.children`), replace it with the observable behavior that detail was standing in for, and say so in the handoff note.
- Remove `react-shallow-renderer`, `src/react-shallow-renderer.d.ts`, and the `@testing-library/dom` / `@testing-library/react` version pins that were installed but unused.
- Carried from task 01, for the Cleaner: bring the mutation runners' stamp logic under test. `scripts/acceptance-mutation.ts` and the language-mutation runner each compute and compare a hash that decides whether a mutation is re-tested, and no tier judges that logic. Task 01 found the previous stamp did not cover what it claimed to; the replacement is verified by demonstration only. Same treatment as `scripts/crap.mjs`.
- Container components rendered inside a component under test need a real store or a test wrapper; introduce one render helper rather than repeating provider setup per file.

## Out of scope

- Changing any component's behavior or markup to make it easier to test. If a component is genuinely untestable through rendered output, say so in the handoff note rather than changing it.
- Reducer, action, selector, and middleware tests. They do not use the shallow renderer.
- Upgrading React. Task 03.
- Removing `connect()`. Task 04.
- Converting class components. Task 05.

## Done criteria

1. `react-shallow-renderer` appears nowhere in the tree.
2. `npm test` passes, with coverage of component behavior no lower than before this task.
3. `npm run test:acceptance` passes.
4. Every behavior asserted by the old suite is still asserted, or its replacement is named and justified in the handoff note.
5. The E2E QA procedures pass when QA executes them.

## Project manager note before the chain starts

**The D2a floor does not bind this task, and the Specifier must replace it.** QA procedure D step D2a
in `qa/toolchain-commands.md` requires `npx vitest run src` to report at least 10 files and 54 tests,
and states that a drop is a regression that fails procedure D outright. That was written for task 01,
whose scope forbade adding or removing a single case; it is the wrong check for a task whose entire
purpose is to rewrite those ten files.

Do not preserve the number for its own sake, and do not weaken the check to nothing. What D2a exists
to protect is this task's done criterion 4: every behavior the old suite asserted is still asserted.
A raw count was a serviceable proxy for that while the suite was frozen. It is not a proxy for it
now, because a faithful rewrite may legitimately merge two element-tree assertions into one
user-visible one, or split one into several. The Specifier owns choosing what replaces it.

Record the pre-task inventory before anything changes, so the replacement check has a baseline to
name: the ten files under `src/**/*.spec.{ts,tsx}` and their 54 cases, and what each case asserts.

**One consequence worth stating.** `react-shallow-renderer` asserts against unrendered element trees,
so some existing cases assert things that have no user-observable counterpart at all - which child
component type an element is, the positional index of a child in `props.children`. Done criterion 4
already says these are replaced by the observable behavior they stood in for, with the substitution
named. That is a judgment about behavior, so it is the Specifier's to make and the Coder's to
implement, not something to settle by keeping a count equal.

## Handoffs

### Specifier

### Coder

### Cleaner

### Architect

### Hardener

### QA
