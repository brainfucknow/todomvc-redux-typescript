import { screen } from '@testing-library/react'
import TodoList, { TodoListProps } from './TodoList'
import { rootOf, shownTodoTexts } from '../test-queries'
import { mockTodoActions, renderComponent } from '../test-render'

const renderList = (propOverrides?: Partial<TodoListProps>) => {
  const props: TodoListProps = {
    filteredTodos: [
      { id: 0, text: 'Use Redux', completed: false },
      { id: 1, text: 'Run the tests', completed: true },
    ],
    actions: mockTodoActions(),
    ...propOverrides,
  }
  const rendered = renderComponent(<TodoList {...props} />)
  return { props, list: rootOf(rendered), ...rendered }
}

const rows = () => screen.getAllByRole('listitem')

describe('TodoList', () => {
  it('C31 renders the todo list', () => {
    const { list } = renderList()
    expect(list.tagName).toBe('UL')
    expect(list.className).toBe('todo-list')
  })

  it('C32 shows one row per todo, in order, each with its own text and completed state', () => {
    const { container } = renderList()
    expect(shownTodoTexts(container)).toEqual(['Use Redux', 'Run the tests'])
    expect(rows().map((todo) => todo.querySelector<HTMLInputElement>('input.toggle')?.checked))
      .toEqual([false, true])
  })

  it('N01 loads the todos once on mount and not again on a re-render', () => {
    const { props, rerender } = renderList()
    expect(props.actions.loadTodos).toHaveBeenCalledTimes(1)

    rerender(<TodoList {...props} />)
    expect(props.actions.loadTodos).toHaveBeenCalledTimes(1)
  })
})
