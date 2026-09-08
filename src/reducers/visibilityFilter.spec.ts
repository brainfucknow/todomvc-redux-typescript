import visibilityFilter from './visibilityFilter'
import { setVisibilityFilter } from '../actions/local'
import TodoFilters from '../constants/TodoFilters'

/** `features/todo-state-filter.feature`. */
describe('visibilityFilter reducer', () => {
  it('shows every todo before a filter is chosen', () => {
    expect(visibilityFilter(undefined, { type: 'NONE' })).toBe(
      TodoFilters.SHOW_ALL,
    )
  })

  it('records the filter that was chosen', () => {
    expect(
      visibilityFilter(
        TodoFilters.SHOW_ALL,
        setVisibilityFilter(TodoFilters.SHOW_COMPLETED),
      ),
    ).toBe(TodoFilters.SHOW_COMPLETED)

    expect(
      visibilityFilter(
        TodoFilters.SHOW_COMPLETED,
        setVisibilityFilter(TodoFilters.SHOW_ACTIVE),
      ),
    ).toBe(TodoFilters.SHOW_ACTIVE)
  })

  it('leaves the filter alone for anything else', () => {
    expect(visibilityFilter(TodoFilters.SHOW_ACTIVE, { type: 'NONE' })).toBe(
      TodoFilters.SHOW_ACTIVE,
    )
  })
})
