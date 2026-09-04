import { fireEvent } from '@testing-library/react'
import Footer, { FooterProps } from './Footer'
import { createTestStore, renderWithStore } from '../test-support/store'
import { setVisibilityFilter } from '../actions'
import TodoFilters from '../constants/TodoFilters'
const { SHOW_ALL, SHOW_ACTIVE, SHOW_COMPLETED } = TodoFilters

const setup = (
  propOverrides?: Partial<FooterProps>,
  visibilityFilter: TodoFilters = SHOW_ALL,
) => {
  const props: FooterProps = Object.assign(
    {
      completedCount: 0,
      activeCount: 0,
      onClearCompleted: vi.fn(),
    },
    propOverrides,
  )

  const store = createTestStore()
  store.dispatch(setVisibilityFilter(visibilityFilter))

  const { container } = renderWithStore(<Footer {...props} />, store)

  return {
    props: props,
    container: container,
  }
}

const filterLinks = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('ul.filters > li > a'))

describe('components', () => {
  describe('Footer', () => {
    it('should render container', () => {
      const { container } = setup()
      const footer = container.querySelector('footer') as HTMLElement
      expect(footer).not.toBeNull()
      expect(footer.className).toBe('footer')
    })

    it('should display active count when 0', () => {
      const { container } = setup({ activeCount: 0 })
      const count = container.querySelector('.todo-count') as HTMLElement
      expect(count.textContent).toBe('No items left')
    })

    it('should display active count when above 0', () => {
      const { container } = setup({ activeCount: 1 })
      const count = container.querySelector('.todo-count') as HTMLElement
      expect(count.textContent).toBe('1 item left')
    })

    it('should render filters', () => {
      const filterTitles = ['All', 'Active', 'Completed']
      const { container } = setup()
      const filters = container.querySelector('ul') as HTMLElement
      expect(filters).not.toBeNull()
      expect(filters.className).toBe('filters')
      expect(filters.querySelectorAll('li').length).toBe(3)
      const links = filterLinks(container)
      expect(links.length).toBe(3)
      links.forEach(function checkFilter(link: Element, i: number) {
        expect(link.textContent).toBe(filterTitles[i])
      })
    })

    it('should select the filter matching the current visibility filter', () => {
      const todoFilters = [SHOW_ALL, SHOW_ACTIVE, SHOW_COMPLETED]
      todoFilters.forEach(function checkSelected(
        filter: TodoFilters,
        i: number,
      ) {
        const { container } = setup(undefined, filter)
        const selected = filterLinks(container).map(
          (link) => link.className === 'selected',
        )
        expect(selected).toEqual(todoFilters.map((_, j) => j === i))
      })
    })

    it('shouldnt show clear button when no completed todos', () => {
      const { container } = setup({ completedCount: 0 })
      expect(container.querySelector('button.clear-completed')).toBeNull()
    })

    it('should render clear button when completed todos', () => {
      const { container } = setup({ completedCount: 1 })
      const clear = container.querySelector(
        'button.clear-completed',
      ) as HTMLButtonElement
      expect(clear).not.toBeNull()
      expect(clear.textContent).toBe('Clear completed')
    })

    it('should call onClearCompleted on clear button click', () => {
      const { container, props } = setup({ completedCount: 1 })
      fireEvent.click(
        container.querySelector('button.clear-completed') as HTMLButtonElement,
      )
      expect(props.onClearCompleted).toBeCalled()
    })
  })
})
