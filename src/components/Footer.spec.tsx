import { screen, within } from '@testing-library/react'
import Footer, { FooterProps } from './Footer'
import TodoFilters from '../constants/TodoFilters'
import { renderWithStore } from '../test-utils'

const { SHOW_ALL, SHOW_ACTIVE, SHOW_COMPLETED } = TodoFilters

const renderFooter = (propOverrides?: Partial<FooterProps>) => {
  const props: FooterProps = {
    completedCount: 0,
    activeCount: 0,
    onClearCompleted: vi.fn(),
    ...propOverrides,
  }
  const rendered = renderWithStore(<Footer {...props} />)
  return { props, footer: rendered.container.firstElementChild as HTMLElement, ...rendered }
}

// The count reads `<strong>1</strong> item left`, so its words live in
// separate nodes and only the whole element says what the user sees.
const countText = (footer: HTMLElement) => footer.querySelector('.todo-count')?.textContent

const clearControl = () => screen.getByRole('button', { name: 'Clear completed' })

describe('Footer', () => {
  it('C03 renders a footer holding the count, the filters and the clear control', () => {
    const { footer } = renderFooter({ activeCount: 1, completedCount: 1 })
    expect(footer.tagName).toBe('FOOTER')
    expect(footer.className).toBe('footer')
    expect(countText(footer)).toBe('1 item left')
    expect(within(footer).getAllByRole('listitem')).toHaveLength(3)
    expect(within(footer).getByText('Clear completed')).toBe(clearControl())
  })

  it('C04 reads "No items left" with nothing active', () => {
    const { footer } = renderFooter({ activeCount: 0 })
    expect(countText(footer)).toBe('No items left')
  })

  it('C05 reads "1 item left" with one active todo', () => {
    const { footer } = renderFooter({ activeCount: 1 })
    expect(countText(footer)).toBe('1 item left')
  })

  it('C06 offers the three filters in order, each setting the visibility filter it names', async () => {
    const { store, user } = renderFooter()
    const filters = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(filters.map((filter) => filter.textContent)).toEqual(['All', 'Active', 'Completed'])

    await user.click(screen.getByText('Active'))
    expect(store.getState().visibilityFilter).toBe(SHOW_ACTIVE)

    await user.click(screen.getByText('Completed'))
    expect(store.getState().visibilityFilter).toBe(SHOW_COMPLETED)

    await user.click(screen.getByText('All'))
    expect(store.getState().visibilityFilter).toBe(SHOW_ALL)
  })

  it('C07 offers no clear control when nothing is completed', () => {
    renderFooter({ completedCount: 0 })
    expect(screen.queryByText('Clear completed')).toBeNull()
  })

  it('C08 offers a clear control when something is completed', () => {
    renderFooter({ completedCount: 1 })
    expect(clearControl().tagName).toBe('BUTTON')
    expect(clearControl().className).toBe('clear-completed')
  })

  it('C09 clears the completed todos when the clear control is clicked', async () => {
    const { props, user } = renderFooter({ completedCount: 1 })
    await user.click(clearControl())
    expect(props.onClearCompleted).toHaveBeenCalledTimes(1)
  })
})
