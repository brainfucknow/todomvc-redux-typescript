import { describe, expect, test, vi } from 'vitest'
import TodoList from '../src/components/TodoList.tsx'
import type { TodoListProps } from '../src/components/TodoList.tsx'
import { mockTodoActions, renderComponent } from '../src/test-render.tsx'

// `N01` in the spec suite re-renders the list with the actions it already had
// and asks that nothing loads a second time. That is half of what the effect's
// dependency says: the other half is that a list handed a different loader uses
// it. A list that loaded once and then ignored every later loader would pass
// `N01` and hold a stale closure for the rest of its life.
const listWith = (actions: TodoListProps['actions']) =>
  <TodoList filteredTodos={[]} actions={actions} />

describe('when the todo list loads its todos', () => {
  test('a list re-rendered with a different loader loads through the new one', () => {
    const first = mockTodoActions()
    const { rerender } = renderComponent(listWith(first))
    expect(first.loadTodos).toHaveBeenCalledTimes(1)

    const second = mockTodoActions()
    rerender(listWith(second))
    expect(second.loadTodos).toHaveBeenCalledTimes(1)
    expect(first.loadTodos).toHaveBeenCalledTimes(1)
  })

  test('a list re-rendered with the loader it already had does not load again', () => {
    const actions = mockTodoActions()
    const { rerender } = renderComponent(listWith(actions))
    rerender(listWith({ ...actions, loadTodos: actions.loadTodos }))
    expect(actions.loadTodos).toHaveBeenCalledTimes(1)
  })
})
