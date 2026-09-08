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

    /**
     * Which field of the event the component reads, pinned - because nothing
     * else pins it. `pressReturn` sends `key`, `code`, `keyCode` and `which`
     * together, which is what a real Enter carries and what Playwright sends
     * too, so every other test in this file passes against a component reading
     * any one of the four. Replacing `e.key` with a `which`-derived value left
     * the unit suite and all three E2E suites green; for a browser that is
     * inherent, since a real event sets both.
     *
     * These two say it with events that name the key and the legacy code
     * differently, and they are a pair. The first is the numpad Enter, whose
     * `code` is `NumpadEnter` and which carries no legacy code here at all: it
     * refuses a component reading `which`, and a component reading `code`. The
     * second is the other direction, a key that is not Enter arriving with
     * Enter's legacy code, which only a `which` or `keyCode` reader would act
     * on. Either alone leaves one of the two wrong readings alive.
     *
     * `commitOnKey` takes a key by name, which is why `src/todo-input/field.ts`
     * has no DOM type in its signature. This is the one place that says the
     * component hands it the right field of the event.
     */
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
