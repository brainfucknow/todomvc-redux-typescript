import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import TodoFilters from '../src/constants/TodoFilters.ts'
import type { RootState } from '../src/containers/index.ts'
import { getCompletedTodoCount, getVisibleTodos } from '../src/selectors/index.ts'

const todoList = fc.uniqueArray(
  fc.record({ id: fc.integer({ min: 0, max: 999 }), text: fc.string({ maxLength: 20 }), completed: fc.boolean() }),
  { selector: (entry) => entry.id, maxLength: 8 },
)
const stateOf = (todos: RootState['todos'], visibilityFilter: TodoFilters): RootState =>
  ({ todos, visibilityFilter })

describe('getVisibleTodos', () => {
  it('shows every todo, untouched, under SHOW_ALL', () => {
    fc.assert(fc.property(todoList, (todos) => {
      expect(getVisibleTodos(stateOf(todos, TodoFilters.SHOW_ALL))).toBe(todos)
    }))
  })

  it('shows the completed and the active ones in the order they were written', () => {
    fc.assert(fc.property(todoList, (todos) => {
      expect(getVisibleTodos(stateOf(todos, TodoFilters.SHOW_COMPLETED)))
        .toEqual(todos.filter((entry) => entry.completed))
      expect(getVisibleTodos(stateOf(todos, TodoFilters.SHOW_ACTIVE)))
        .toEqual(todos.filter((entry) => !entry.completed))
    }))
  })

  it('splits the list in two: every todo is shown by exactly one of the two filters', () => {
    fc.assert(fc.property(todoList, (todos) => {
      const completed = getVisibleTodos(stateOf(todos, TodoFilters.SHOW_COMPLETED))
      const active = getVisibleTodos(stateOf(todos, TodoFilters.SHOW_ACTIVE))
      expect(completed.length + active.length).toBe(todos.length)
      expect([...completed, ...active].map((entry) => entry.id).sort())
        .toEqual(todos.map((entry) => entry.id).sort())
    }))
  })

  it('refuses a filter it does not know', () => {
    fc.assert(fc.property(todoList, fc.stringMatching(/^[a-z_]{1,12}$/), (todos, filter) => {
      fc.pre(!Object.values(TodoFilters).includes(filter as TodoFilters))
      expect(() => getVisibleTodos(stateOf(todos, filter as TodoFilters))).toThrow(/unknown filter/i)
    }))
  })

  it('answers the same question with the same answer', () => {
    fc.assert(fc.property(todoList, fc.constantFrom(...Object.values(TodoFilters)), (todos, filter) => {
      expect(getVisibleTodos(stateOf(todos, filter))).toBe(getVisibleTodos(stateOf(todos, filter)))
    }))
  })
})

describe('getCompletedTodoCount', () => {
  it('counts the todos SHOW_COMPLETED would show', () => {
    fc.assert(fc.property(todoList, (todos) => {
      expect(getCompletedTodoCount(stateOf(todos, TodoFilters.SHOW_ALL)))
        .toBe(getVisibleTodos(stateOf(todos, TodoFilters.SHOW_COMPLETED)).length)
    }))
  })

  it('never counts more than there are', () => {
    fc.assert(fc.property(todoList, (todos) => {
      const completed = getCompletedTodoCount(stateOf(todos, TodoFilters.SHOW_ALL))
      expect(completed).toBeGreaterThanOrEqual(0)
      expect(completed).toBeLessThanOrEqual(todos.length)
    }))
  })
})
