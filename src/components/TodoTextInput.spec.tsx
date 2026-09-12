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

    it('should hold the empty string when opened on no text at all', () => {
      const { input } = setup({ text: undefined })
      expect(input.value).toEqual('')
    })

    it('should update value on change', () => {
      const { input } = setup()
      fireEvent.change(input, { target: { value: 'Use Radox' } })
      expect(input.value).toEqual('Use Radox')
    })

    it('should not call onSave on any other key press', () => {
      const { input, props } = setup()
      for (const key of ['Escape', 'ArrowUp']) {
        fireEvent.keyDown(input, { key, code: key })
      }
      expect(props.onSave).not.toBeCalled()
    })

    // A pair, and the only thing anywhere pinning that the component reads `e.key`:
    // every other test sends an Enter carrying `code`, `keyCode` and `which` too.
    // Either one alone leaves a `code`- or `which`-reading component passing.
    it('saves on an Enter named as Enter, carrying no legacy key code', () => {
      const { input, props } = setup()
      fireEvent.keyDown(input, { key: 'Enter', code: 'NumpadEnter' })
      expect(props.onSave).toBeCalledWith('Use Redux')
    })

    it("saves nothing for another key arriving with Enter's legacy code", () => {
      const { input, props } = setup()
      fireEvent.keyDown(input, {
        key: 'a',
        code: 'KeyA',
        keyCode: 13,
        which: 13,
      })
      expect(props.onSave).not.toBeCalled()
    })

    it('should call onSave on return key press', () => {
      const { input, props } = setup()
      pressReturn(input)
      expect(props.onSave).toBeCalledWith('Use Redux')
    })

    it('should trim the text it saves on return key press', () => {
      const { input, props } = setup()
      fireEvent.change(input, { target: { value: '  Use Radox  ' } })
      pressReturn(input)
      expect(props.onSave).toBeCalledWith('Use Radox')
    })

    it('should not reset state on return key press if not newTodo', () => {
      const { input } = setup()
      pressReturn(input)
      expect(input.value).toEqual('Use Redux')
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

    it('should not trim the text it saves on blur', () => {
      const { input, props } = setup()
      fireEvent.change(input, { target: { value: '  Use Radox  ' } })
      fireEvent.blur(input)
      expect(props.onSave).toBeCalledWith('  Use Radox  ')
    })

    it('shouldnt call onSave on blur if newTodo', () => {
      const { input, props } = setup({ newTodo: true })
      fireEvent.blur(input)
      expect(props.onSave).not.toBeCalled()
    })
  })
})
