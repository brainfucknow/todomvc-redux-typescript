import { render, fireEvent } from '@testing-library/react'
import TodoTextInput, { TodoTextInputProps } from './TodoTextInput'
import { pressReturn } from '../test-support/keyboard'

const setup = (propOverrides?: Partial<TodoTextInputProps>) => {
  const props: TodoTextInputProps = Object.assign(
    {
      onSave: vi.fn(),
      text: 'Use Redux',
      placeholder: 'What needs to be done?',
      editing: false,
      newTodo: false,
    },
    propOverrides,
  )

  const { container } = render(<TodoTextInput {...props} />)
  const input = container.querySelector('input') as HTMLInputElement

  return {
    props: props,
    input: input,
  }
}

describe('components', () => {
  describe('TodoTextInput', () => {
    it('should render correctly', () => {
      const { input } = setup()
      expect(input.placeholder).toEqual('What needs to be done?')
      expect(input.value).toEqual('Use Redux')
      expect(input.className).toEqual('')
    })

    it('should render correctly when editing=true', () => {
      const { input } = setup({ editing: true })
      expect(input.className).toEqual('edit')
    })

    it('should render correctly when newTodo=true', () => {
      const { input } = setup({ newTodo: true })
      expect(input.className).toEqual('new-todo')
    })

    it('should update value on change', () => {
      const { input } = setup()
      fireEvent.change(input, { target: { value: 'Use Radox' } })
      expect(input.value).toEqual('Use Radox')
    })

    it('should call onSave on return key press', () => {
      const { input, props } = setup()
      pressReturn(input)
      expect(props.onSave).toBeCalledWith('Use Redux')
    })

    it('should reset state on return key press if newTodo', () => {
      const { input } = setup({ newTodo: true })
      pressReturn(input)
      expect(input.value).toEqual('')
    })

    it('should call onSave on blur', () => {
      const { input, props } = setup()
      fireEvent.blur(input)
      expect(props.onSave).toBeCalledWith('Use Redux')
    })

    it('shouldnt call onSave on blur if newTodo', () => {
      const { input, props } = setup({ newTodo: true })
      fireEvent.blur(input)
      expect(props.onSave).not.toBeCalled()
    })
  })
})
