import { render, fireEvent } from '@testing-library/react'
import Header from './Header'
import { pressReturn } from '../test-support/keyboard'

const setup = () => {
  const props = {
    addTodo: vi.fn(),
  }

  const { container } = render(<Header {...props} />)

  return {
    props: props,
    container: container,
    input: container.querySelector('input') as HTMLInputElement,
  }
}

describe('components', () => {
  describe('Header', () => {
    it('should render correctly', () => {
      const { container, input } = setup()

      const header = container.querySelector('header') as HTMLElement
      expect(header).not.toBeNull()
      expect(header.className).toBe('header')

      const h1 = header.querySelector('h1') as HTMLElement
      expect(h1).not.toBeNull()
      expect(h1.textContent).toBe('todos')

      expect(input.className).toBe('new-todo')
      expect(input.placeholder).toBe('What needs to be done?')
    })

    it('should call addTodo if length of text is greater than 0', () => {
      const { input, props } = setup()

      pressReturn(input)
      expect(props.addTodo).not.toBeCalled()

      fireEvent.change(input, { target: { value: 'Use Redux' } })
      pressReturn(input)
      expect(props.addTodo).toBeCalledWith('Use Redux')
    })
  })
})
