# Task 13: Move UI-derived observables into domain selectors

**Track:** Structural
**Chain:** specifier -> coder -> cleaner -> architect -> hardener -> QA

The specifier's job on this track is narrower than the full brief: write Gherkin only for the behavior being moved into a testable module, so the coder has an acceptance target for the extracted logic. Update the E2E procedures from Task 1 only if a workflow's observable behavior would change. It should not; if it must, stop and ask the project manager.

The hardener is in this chain because the task changes the selectors, which are testable modules.

**Status:** pending

## Goal

Every observable the UI derives from state gets a domain function that already knows it, and the UI asks that function. Re-walking the same facts in a component is the defect this task removes.

## Context

Facts the components currently re-derive:

- `MainSection` receives `todosCount` and `completedCount` as separate props and computes "are all complete" as `completedCount === todosCount` for the toggle-all checkbox. The domain already knows whether all todos are complete; the reducer's `COMPLETE_ALL_TODOS` branch computes exactly that with `state.every(todo => todo.completed)`. The same question is answered in two places by two different routes.
- `MainSection` computes `activeCount` as `todosCount - completedCount` and passes it to `Footer`.
- `Footer` computes `itemWord` as `activeCount === 1 ? 'item' : 'items'`, and renders `{activeCount || 'No'}`, so zero renders as the word "No". Both are display rules driven purely by a domain quantity.
- `MainSection` gates the toggle-all block and the footer on `!!todosCount`, so both vanish when the list is empty.
- `Footer` gates the clear-completed button on `!!completedCount`.
- `src/selectors/index.ts` has `getVisibleTodos` and `getCompletedTodoCount`. `getVisibleTodos` throws `Error('Unknown filter: ' + visibilityFilter)` on an unrecognised filter. Preserve that.

## Scope

- Specifier: Gherkin for each derived observable. Active count, completed count, all-complete, the empty-list cases, and the singular/plural and "No" rendering rules. Include the boundary values: zero todos, one active todo, exactly one item left, all complete, none complete.
- Coder: put each observable behind a selector or domain function. The pluralisation and the "No" substitution are domain-driven presentation rules with clear inputs and outputs; give them a home in a testable module rather than an inline ternary.
- Coder: components ask; they do not compute. A component may still branch on a boolean a domain function returned.
- Cleaner and architect: remove the duplicate route to "are all complete" so one function answers it.
- Architect: check that no policy is left reachable only by tests while a component reimplements it. If one is, wire the component to it or delete the policy.

## Out of scope

- Changing any rendered string, any class name, or any gating condition's outcome. "No items left" stays exactly that. The empty-list layout stays exactly as it is.
- Changing the thrown error on an unknown filter.
- Changing the state shape or the reducers.
- Introducing a formatting or i18n library.

## Done criteria

- No component computes a quantity or a display rule from raw state that a domain function could answer.
- One function answers "are all todos complete", and both the reducer path and the UI path use it.
- Selectors and derivation live in testable modules with no UI, filesystem, network, framework, or device dependency.
- Unit tests cover the boundaries: zero, one, and all-complete.
- Acceptance tests generated from the Gherkin pass.
- Property tests pass, per the architect's assessment.
- Mutation survivors killed on the changed modules, per the hardener.
- `npm run lint`, format check, `npm run typecheck`, `npm test`, and `npm run build` pass.
- The regression suite from `qa/procedures/` passes unchanged. Every rendered string is byte-identical to the baseline.

## Handoffs

### Specifier

### Coder

### Cleaner

### Architect

### Hardener

### QA
