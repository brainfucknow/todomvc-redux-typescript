# Task 02: Replace shallow-renderer tests with Testing Library

Status: pending

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

## Handoffs

### Specifier

### Coder

### Cleaner

### Architect

### Hardener

### QA
