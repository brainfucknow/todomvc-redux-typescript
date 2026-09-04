import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { Todo } from '../src/models/Todo.ts'
import todoApiResults, { todos } from '../src/reducers/todos.ts'

const todo = fc.record({
  id: fc.integer({ min: 0, max: 999 }),
  text: fc.string({ maxLength: 20 }),
  completed: fc.boolean(),
})
const todoList = fc.uniqueArray(todo, { selector: (entry) => entry.id, maxLength: 8 })
const anyId = fc.integer({ min: 0, max: 999 })
const identity = (list: Todo[]): Pick<Todo, 'id' | 'text'>[] =>
  list.map(({ id, text }) => ({ id, text }))

describe('an action the todo reducer does not handle', () => {
  it('leaves the list exactly as it was', () => {
    fc.assert(fc.property(todoList, (state) => {
      expect(todoApiResults(state, { type: 'NONE' })).toBe(state)
    }))
  })
})

describe('ADD_TODO', () => {
  it('appends one active todo with an id above every existing one', () => {
    fc.assert(fc.property(todoList, fc.string(), (state, text) => {
      const next = todoApiResults(state, { type: 'ADD_TODO', text })
      expect(next.slice(0, state.length)).toEqual(state)
      expect(next).toHaveLength(state.length + 1)
      expect(next[state.length]).toMatchObject({ text, completed: false })
      expect(state.every((entry) => entry.id < next[state.length].id)).toBe(true)
    }))
  })

  it('never reuses an id, however many are added', () => {
    fc.assert(fc.property(todoList, fc.array(fc.string(), { maxLength: 5 }), (state, texts) => {
      const next = texts.reduce((list, text) => todoApiResults(list, { type: 'ADD_TODO', text }), state)
      expect(next).toHaveLength(state.length + texts.length)
      expect(new Set(next.map((entry) => entry.id)).size).toBe(next.length)
    }))
  })
})

describe('DELETE_TODO', () => {
  it('removes every todo with that id and leaves the rest in order', () => {
    fc.assert(fc.property(todoList, anyId, (state, id) => {
      expect(todoApiResults(state, { type: 'DELETE_TODO', id }))
        .toEqual(state.filter((entry) => entry.id !== id))
    }))
  })

  it('deleting twice says the same as deleting once', () => {
    fc.assert(fc.property(todoList, anyId, (state, id) => {
      const once = todoApiResults(state, { type: 'DELETE_TODO', id })
      expect(todoApiResults(once, { type: 'DELETE_TODO', id })).toEqual(once)
    }))
  })
})

describe('EDIT_TODO', () => {
  it('rewrites the text of that todo and nothing else', () => {
    fc.assert(fc.property(todoList, anyId, fc.string(), (state, id, text) => {
      const next = todoApiResults(state, { type: 'EDIT_TODO', id, text })
      expect(next.map((entry) => entry.text))
        .toEqual(state.map((entry) => (entry.id === id ? text : entry.text)))
      expect(next.map(({ id: kept, completed }) => ({ id: kept, completed })))
        .toEqual(state.map(({ id: kept, completed }) => ({ id: kept, completed })))
    }))
  })
})

describe('COMPLETE_TODO', () => {
  it('sets the flag on that todo and nothing else', () => {
    fc.assert(fc.property(todoList, anyId, fc.boolean(), (state, id, completed) => {
      const next = todoApiResults(state, { type: 'COMPLETE_TODO', id, completed })
      expect(next.map((entry) => entry.completed))
        .toEqual(state.map((entry) => (entry.id === id ? completed : entry.completed)))
      expect(identity(next)).toEqual(identity(state))
    }))
  })
})

describe('COMPLETE_ALL_TODOS', () => {
  it('makes every todo agree, on the opposite of what they all agreed on', () => {
    fc.assert(fc.property(todoList, (state) => {
      fc.pre(state.length > 0)
      const next = todos(state, { type: 'COMPLETE_ALL_TODOS' })
      const wanted = !state.every((entry) => entry.completed)
      expect(next.every((entry) => entry.completed === wanted)).toBe(true)
      expect(identity(next)).toEqual(identity(state))
    }))
  })
})

describe('CLEAR_COMPLETED', () => {
  it('keeps exactly the active todos, in order', () => {
    fc.assert(fc.property(todoList, (state) => {
      const next = todoApiResults(state, { type: 'CLEAR_COMPLETED' })
      expect(next).toEqual(state.filter((entry) => !entry.completed))
      expect(todoApiResults(next, { type: 'CLEAR_COMPLETED' })).toEqual(next)
    }))
  })
})

describe('the API results', () => {
  it('LOAD_TODO_SUCCESS takes the list the server sent', () => {
    fc.assert(fc.property(todoList, todoList, (state, json) => {
      expect(todoApiResults(state, { type: 'LOAD_TODO_SUCCESS', json })).toBe(json)
    }))
  })

  it('POST_TODO_SUCCESS appends the todo the server created', () => {
    fc.assert(fc.property(todoList, todo, (state, json) => {
      expect(todoApiResults(state, { type: 'POST_TODO_SUCCESS', json, text: json.text }))
        .toEqual([...state, json])
    }))
  })

  it('DELETE_TODO_SUCCESS removes the todo the server deleted', () => {
    fc.assert(fc.property(todoList, anyId, (state, id) => {
      expect(todoApiResults(state, { type: 'DELETE_TODO_SUCCESS', id }))
        .toEqual(state.filter((entry) => entry.id !== id))
    }))
  })

  it('PATCH_TODO_SUCCESS swaps in the todo the server returned, in place', () => {
    fc.assert(fc.property(todoList, todo, (state, json) => {
      const next = todoApiResults(state, { ...json, type: 'PATCH_TODO_SUCCESS', json })
      expect(next).toEqual(state.map((entry) => (entry.id === json.id ? json : entry)))
      expect(next).toHaveLength(state.length)
    }))
  })
})
