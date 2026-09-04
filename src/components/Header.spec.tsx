import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Header from './Header'
import { pressEnter } from '../test-utils'

const renderHeader = () => {
  const addTodo = vi.fn()
  const user = userEvent.setup()
  return { addTodo, user, ...render(<Header addTodo={addTodo} />) }
}

const newTodoField = () => screen.getByPlaceholderText('What needs to be done?')

describe('Header', () => {
  it('C10 shows the todos heading and the new-todo field', () => {
    const { container } = renderHeader()
    const header = container.firstElementChild as HTMLElement
    expect(header.tagName).toBe('HEADER')
    expect(header.className).toBe('header')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('todos')
    expect(newTodoField().className).toBe('new-todo')
  })

  it('C11 adds a todo only once text has been typed', async () => {
    const { addTodo, user } = renderHeader()
    pressEnter(newTodoField())
    expect(addTodo).not.toHaveBeenCalled()

    await user.type(newTodoField(), 'Use Redux')
    pressEnter(newTodoField())
    expect(addTodo).toHaveBeenCalledTimes(1)
    expect(addTodo).toHaveBeenCalledWith('Use Redux')
  })
})
