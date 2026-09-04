import { screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import TodoItem from '../src/components/TodoItem.tsx'
import type { TodoItemProps } from '../src/components/TodoItem.tsx'
import { insideList, renderComponent } from '../src/test-render.tsx'

// Every case in the spec suite renders an active todo, so the completed half of
// the row - the class it carries, the state of its box, and which way its box
// sends the todo next - is rendered by the application and by no test.
const renderCompleted = () => {
  const props: TodoItemProps = {
    todo: { id: 7, text: 'Use Redux', completed: true },
    editTodo: vi.fn(),
    deleteTodo: vi.fn(),
    completeTodo: vi.fn(),
  }
  return { props, ...renderComponent(<TodoItem {...props} />, { wrapper: insideList }) }
}

const box = () => screen.getByRole('checkbox') as HTMLInputElement

describe('how a completed todo is shown', () => {
  test('its row carries class completed', () => {
    renderCompleted()
    expect(screen.getByRole('listitem').className).toBe('completed')
  })

  test('its box is checked', () => {
    renderCompleted()
    expect(box().checked).toBe(true)
  })

  test('unchecking it asks for the todo to go back to active', async () => {
    const { props, user } = renderCompleted()
    await user.click(box())
    expect(props.completeTodo).toHaveBeenCalledTimes(1)
    expect(props.completeTodo).toHaveBeenCalledWith(7, false)
  })
})
