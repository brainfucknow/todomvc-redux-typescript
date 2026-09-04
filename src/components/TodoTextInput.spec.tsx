import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TodoTextInput, { TodoTextInputProps } from './TodoTextInput'
import { pressEnter } from '../test-utils'

const renderInput = (propOverrides?: Partial<TodoTextInputProps>) => {
  const props: TodoTextInputProps = {
    onSave: vi.fn(),
    text: 'Use Redux',
    placeholder: 'What needs to be done?',
    editing: false,
    newTodo: false,
    ...propOverrides,
  }
  const user = userEvent.setup()
  return { props, user, ...render(<TodoTextInput {...props} />) }
}

const textbox = () => screen.getByRole('textbox') as HTMLInputElement

describe('TodoTextInput', () => {
  it('C33 shows the placeholder and the given text, with no state class', () => {
    renderInput()
    expect(textbox().placeholder).toBe('What needs to be done?')
    expect(textbox().value).toBe('Use Redux')
    expect(textbox().className).toBe('')
  })

  it('C34 carries class edit when editing', () => {
    renderInput({ editing: true })
    expect(textbox().className).toBe('edit')
  })

  it('C35 carries class new-todo when it is the new-todo field', () => {
    renderInput({ newTodo: true })
    expect(textbox().className).toBe('new-todo')
  })

  it('C36 shows what was typed into it', async () => {
    const { user } = renderInput()
    await user.clear(textbox())
    await user.type(textbox(), 'Use Radox')
    expect(textbox().value).toBe('Use Radox')
  })

  it('C37 calls onSave with the field text when Enter is pressed', () => {
    const { props } = renderInput()
    pressEnter(textbox())
    expect(props.onSave).toHaveBeenCalledTimes(1)
    expect(props.onSave).toHaveBeenCalledWith('Use Redux')
  })

  it('C38 empties the new-todo field when Enter is pressed', () => {
    renderInput({ newTodo: true })
    pressEnter(textbox())
    expect(textbox().value).toBe('')
  })

  it('C39 calls onSave with the field text when focus moves away', async () => {
    const { props, user } = renderInput()
    await user.click(textbox())
    await user.tab()
    expect(props.onSave).toHaveBeenCalledTimes(1)
    expect(props.onSave).toHaveBeenCalledWith('Use Redux')
  })

  it('C40 calls nothing when focus moves away from the new-todo field', async () => {
    const { props, user } = renderInput({ newTodo: true })
    await user.click(textbox())
    await user.tab()
    expect(props.onSave).not.toHaveBeenCalled()
  })
})
