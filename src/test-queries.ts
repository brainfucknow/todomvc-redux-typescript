// How the specs read rendered output when a role or a name will not reach it,
// so the same reading is spelled the same way wherever it is made. Mounting the
// component is in `./test-render.tsx`.
import { screen } from '@testing-library/react'

// The element the component rendered, for the assertions that are about that
// element rather than about what is inside it.
export const rootOf = ({ container }: { container: HTMLElement }): HTMLElement =>
  container.firstElementChild as HTMLElement

// The count reads `<strong>1</strong> item left`, so its words live in separate
// nodes and only the whole element says what the user sees.
export const countText = (scope: HTMLElement): string | undefined =>
  scope.querySelector('.todo-count')?.textContent ?? undefined

export const clearCompletedControl = (): HTMLElement =>
  screen.getByRole('button', { name: 'Clear completed' })

// What the user sees in the list, in the order it is shown.
export const shownTodoTexts = (scope: HTMLElement): (string | null)[] =>
  Array.from(scope.querySelectorAll('ul.todo-list label')).map((label) => label.textContent)
