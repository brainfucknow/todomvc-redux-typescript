import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TodoItem, { TodoItemProps } from './TodoItem'
import { pressEnter } from '../test-utils'

const list = ({ children }: { children: ReactNode }) => <ul>{children}</ul>

const renderItem = (propOverrides?: Partial<TodoItemProps>) => {
  const props: TodoItemProps = {
    todo: { id: 0, text: 'Use Redux', completed: false },
    editTodo: vi.fn(),
    deleteTodo: vi.fn(),
    completeTodo: vi.fn(),
    ...propOverrides,
  }
  const user = userEvent.setup()
  return { props, user, ...render(<TodoItem {...props} />, { wrapper: list }) }
}

const row = () => screen.getByRole('listitem')
const destroyControl = () => screen.getByRole('button')
const editField = () => screen.getByRole('textbox') as HTMLInputElement

const startEditing = (user: ReturnType<typeof userEvent.setup>) => user.dblClick(screen.getByText('Use Redux'))

describe('TodoItem', () => {
  it('C23 shows an active todo as an unchecked box, its text and a destroy control', () => {
    renderItem()
    expect(row().className).toBe('')
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false)
    expect(screen.getByText('Use Redux').tagName).toBe('LABEL')
    expect(destroyControl().className).toBe('destroy')
  })

  it('C24 completes the todo when its box is checked', async () => {
    const { props, user } = renderItem()
    await user.click(screen.getByRole('checkbox'))
    expect(props.completeTodo).toHaveBeenCalledTimes(1)
    expect(props.completeTodo).toHaveBeenCalledWith(0, true)
  })

  it('C25 deletes the todo when the destroy control is clicked', async () => {
    const { props, user } = renderItem()
    await user.click(destroyControl())
    expect(props.deleteTodo).toHaveBeenCalledTimes(1)
    expect(props.deleteTodo).toHaveBeenCalledWith(0)
  })

  it('C26 enters edit mode when the text is double-clicked', async () => {
    const { user } = renderItem()
    await startEditing(user)
    expect(row().className).toBe('editing')
  })

  it('C27 replaces the row with a field holding the todo text while editing', async () => {
    const { user } = renderItem()
    await startEditing(user)
    expect(editField().value).toBe('Use Redux')
    expect(editField().className).toBe('edit')
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.queryByText('Use Redux')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('C28 edits the todo when non-empty text is submitted', async () => {
    const { props, user } = renderItem()
    await startEditing(user)
    await user.clear(editField())
    await user.type(editField(), 'Use Redux everywhere')
    pressEnter(editField())
    expect(props.editTodo).toHaveBeenCalledTimes(1)
    expect(props.editTodo).toHaveBeenCalledWith(0, 'Use Redux everywhere')
  })

  it('C29 deletes the todo when the text is cleared and submitted', async () => {
    const { props, user } = renderItem()
    await startEditing(user)
    await user.clear(editField())
    pressEnter(editField())
    expect(props.deleteTodo).toHaveBeenCalledTimes(1)
    expect(props.deleteTodo).toHaveBeenCalledWith(0)
    expect(props.editTodo).not.toHaveBeenCalled()
  })

  it('C30 leaves edit mode once the text is submitted', async () => {
    const { user } = renderItem()
    await startEditing(user)
    pressEnter(editField())
    expect(screen.getByText('Use Redux').tagName).toBe('LABEL')
    expect(row().className).toBe('')
  })
})
