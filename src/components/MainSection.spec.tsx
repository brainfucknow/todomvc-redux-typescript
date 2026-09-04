import { screen } from '@testing-library/react'
import MainSection, { MainSectionProps } from './MainSection'
import type { Todo } from '../models/Todo'
import { clearCompletedControl, countText, rootOf, shownTodoTexts } from '../test-queries'
import { mockTodoActions, renderWithStore } from '../test-render'

const storedTodos: Todo[] = [
  { id: 0, text: 'Use Redux', completed: false },
  { id: 1, text: 'Run the tests', completed: true },
]

const renderMainSection = (propOverrides?: Partial<MainSectionProps>, todos: Todo[] = storedTodos) => {
  const props: MainSectionProps = {
    todosCount: 2,
    completedCount: 1,
    actions: mockTodoActions(),
    ...propOverrides,
  }
  const rendered = renderWithStore(<MainSection {...props} />, { todos })
  return { props, section: rootOf(rendered), ...rendered }
}

const toggleAll = (section: HTMLElement) => section.querySelector<HTMLInputElement>('input.toggle-all')
const todoList = (section: HTMLElement) => section.querySelector<HTMLElement>('ul.todo-list')

describe('MainSection', () => {
  it('C15 renders the main section', () => {
    const { section } = renderMainSection()
    expect(section.tagName).toBe('SECTION')
    expect(section.className).toBe('main')
  })

  it('C16 shows an unchecked toggle-all box while a todo is still active', () => {
    const { section } = renderMainSection()
    expect(toggleAll(section)?.type).toBe('checkbox')
    expect(toggleAll(section)?.checked).toBe(false)
  })

  it('C17 shows a checked toggle-all box once every todo is completed', () => {
    const { section } = renderMainSection({ completedCount: 2 })
    expect(toggleAll(section)?.checked).toBe(true)
  })

  it('C18 completes every todo when the toggle-all control is clicked', async () => {
    const { props, section, user } = renderMainSection()
    // The control the user clicks is the empty label beside the box: it has no
    // text and no `for`, so it is findable in the DOM and nowhere else.
    await user.click(toggleAll(section)?.nextElementSibling as HTMLElement)
    expect(props.actions.completeAllTodos).toHaveBeenCalledTimes(1)
  })

  it('C19 reads the active count and offers to clear the completed todos', () => {
    const { section } = renderMainSection()
    expect(countText(section)).toBe('1 item left')
    expect(clearCompletedControl().className).toBe('clear-completed')
  })

  it('C20 clears the completed todos when the clear control is clicked', async () => {
    const { props, user } = renderMainSection()
    await user.click(clearCompletedControl())
    expect(props.actions.clearCompleted).toHaveBeenCalledTimes(1)
  })

  it('C21 shows the visible todos between the toggle-all control and the footer', () => {
    const { section } = renderMainSection()
    const list = todoList(section) as HTMLElement
    expect(shownTodoTexts(section)).toEqual(['Use Redux', 'Run the tests'])
    expect(list.previousElementSibling?.contains(toggleAll(section) as Node)).toBe(true)
    expect((list.nextElementSibling as HTMLElement).className).toBe('footer')
  })

  it('C22 shows only the empty list when there are no todos', () => {
    const { section } = renderMainSection({ todosCount: 0, completedCount: 0 }, [])
    expect(toggleAll(section)).toBeNull()
    expect(screen.queryByText(/items? left/)).toBeNull()
    expect(screen.queryByText('All')).toBeNull()
    expect(screen.queryByText('Clear completed')).toBeNull()
    const list = todoList(section)
    expect(list).not.toBeNull()
    expect(list?.children).toHaveLength(0)
  })
})
