import { render, fireEvent } from '@testing-library/react'
import TodoItem from './TodoItem'
import { pressReturn } from '../test-support/keyboard'

const setup = (editing = false) => {
  const props = {
    todo: {
      id: 0,
      text: 'Use Redux',
      completed: false,
    },
    editTodo: vi.fn(),
    deleteTodo: vi.fn(),
    completeTodo: vi.fn(),
  }

  const { container } = render(<TodoItem {...props} />)

  const item = () => container.querySelector('li') as HTMLElement
  const editInput = () =>
    container.querySelector('input.edit') as HTMLInputElement

  if (editing) {
    fireEvent.doubleClick(container.querySelector('label') as HTMLElement)
  }

  return {
    props: props,
    container: container,
    item: item,
    editInput: editInput,
  }
}

describe('components', () => {
  describe('TodoItem', () => {
    it('initial render', () => {
      const { container, item } = setup()

      expect(item().className).toBe('')

      const div = container.querySelector('li > div') as HTMLElement
      expect(div).not.toBeNull()
      expect(div.className).toBe('view')

      const input = div.querySelector('input') as HTMLInputElement
      expect(input).not.toBeNull()
      expect(input.type).toBe('checkbox')
      expect(input.checked).toBe(false)

      const label = div.querySelector('label') as HTMLElement
      expect(label).not.toBeNull()
      expect(label.textContent).toBe('Use Redux')

      const button = div.querySelector('button') as HTMLButtonElement
      expect(button).not.toBeNull()
      expect(button.className).toBe('destroy')
    })

    it('input onChange should call completeTodo', () => {
      const { container, props } = setup()
      fireEvent.click(
        container.querySelector('input.toggle') as HTMLInputElement,
      )
      expect(props.completeTodo).toBeCalledWith(0, true)
    })

    it('button onClick should call deleteTodo', () => {
      const { container, props } = setup()
      fireEvent.click(
        container.querySelector('button.destroy') as HTMLButtonElement,
      )
      expect(props.deleteTodo).toBeCalledWith(0)
    })

    it('label onDoubleClick should put component in edit state', () => {
      const { container, item } = setup()
      fireEvent.doubleClick(container.querySelector('label') as HTMLElement)
      expect(item().className).toBe('editing')
    })

    it('edit state render', () => {
      const { item, editInput } = setup(true)

      expect(item().className).toBe('editing')
      expect(editInput()).not.toBeNull()
      expect(editInput().value).toBe('Use Redux')
    })

    it('TodoTextInput onSave should call editTodo', () => {
      const { editInput, props } = setup(true)
      pressReturn(editInput())
      expect(props.editTodo).toBeCalledWith(0, 'Use Redux')
    })

    it('TodoTextInput onSave should call deleteTodo if text is empty', () => {
      const { editInput, props } = setup(true)
      fireEvent.change(editInput(), { target: { value: '' } })
      pressReturn(editInput())
      expect(props.deleteTodo).toBeCalledWith(0)
    })

    it('TodoTextInput onSave should exit component from edit state', () => {
      const { editInput, item } = setup(true)
      pressReturn(editInput())
      expect(item().className).toBe('')
    })
  })
})
