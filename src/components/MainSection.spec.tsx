import { fireEvent } from '@testing-library/react'
import MainSection, { MainSectionProps } from './MainSection'
import { renderWithStore } from '../test-support/store'
import { stubPendingFetch } from '../test-support/fetch'

beforeEach(stubPendingFetch)

const setup = (propOverrides?: Partial<MainSectionProps>) => {
  const props = Object.assign(
    {
      todosCount: 2,
      completedCount: 1,
      actions: {
        editTodo: vi.fn(),
        deleteTodo: vi.fn(),
        completeTodo: vi.fn(),
        completeAllTodos: vi.fn(),
        clearCompleted: vi.fn(),
      },
    },
    propOverrides,
  )

  const { container } = renderWithStore(<MainSection {...props} />)

  return {
    props: props,
    container: container,
  }
}

describe('components', () => {
  describe('MainSection', () => {
    it('should render container', () => {
      const { container } = setup()
      const section = container.querySelector('section') as HTMLElement
      expect(section).not.toBeNull()
      expect(section.className).toBe('main')
    })

    describe('toggle all input', () => {
      it('should render', () => {
        const { container } = setup()
        const toggle = container.querySelector(
          'input.toggle-all',
        ) as HTMLInputElement
        expect(toggle).not.toBeNull()
        expect(toggle.type).toBe('checkbox')
        expect(toggle.checked).toBe(false)
      })

      it('should be checked if all todos completed', () => {
        const { container } = setup({
          completedCount: 2,
        })
        const toggle = container.querySelector(
          'input.toggle-all',
        ) as HTMLInputElement
        expect(toggle.checked).toBe(true)
      })

      it('should call completeAllTodos on change', () => {
        const { container, props } = setup()
        const label = container.querySelector(
          'section.main > span > label',
        ) as HTMLElement
        fireEvent.click(label)
        expect(props.actions.completeAllTodos).toBeCalled()
      })
    })

    describe('footer', () => {
      it('should render', () => {
        const { container } = setup()
        const footer = container.querySelector('footer.footer') as HTMLElement
        expect(footer).not.toBeNull()
        const count = footer.querySelector('.todo-count') as HTMLElement
        expect(count.textContent).toBe('1 item left')
        expect(footer.querySelector('button.clear-completed')).not.toBeNull()
      })

      it('onClearCompleted should call clearCompleted', () => {
        const { container, props } = setup()
        fireEvent.click(
          container.querySelector(
            'button.clear-completed',
          ) as HTMLButtonElement,
        )
        expect(props.actions.clearCompleted).toBeCalled()
      })
    })

    describe('visible todo list', () => {
      it('should render', () => {
        const { container } = setup()
        expect(container.querySelector('ul.todo-list')).not.toBeNull()
      })
    })

    describe('toggle all input and footer', () => {
      it('should not render if there are no todos', () => {
        const { container } = setup({
          todosCount: 0,
          completedCount: 0,
        })
        const section = container.querySelector('section.main') as HTMLElement
        expect(section.querySelector('input.toggle-all')).toBeNull()
        expect(section.querySelector('footer.footer')).toBeNull()
        expect(section.children.length).toBe(1)
        expect(section.children[0].className).toBe('todo-list')
      })
    })
  })
})
