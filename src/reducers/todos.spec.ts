import todos from './todos'
import * as local from '../actions/local'
import {
  addTodoOperation,
  completeTodoOperation,
  editTodoOperation,
  loadTodosOperation,
  removeTodoOperation,
} from '../actions/api'
import { Todo } from '../models/Todo'

const useRedux: Todo = { text: 'Use Redux', completed: false, id: 0 }
const runTests: Todo = { text: 'Run the tests', completed: false, id: 1 }
const seed: Todo[] = [useRedux]

describe('todos reducer', () => {
  it('holds the one seeded todo before anything happens', () => {
    expect(todos(undefined, { type: 'NONE' })).toEqual(seed)
  })

  it('appends a locally added todo, numbered one past the highest id', () => {
    expect(todos([], local.addTodo('Run the tests'))).toEqual([
      { text: 'Run the tests', completed: false, id: 0 },
    ])

    expect(todos([useRedux], local.addTodo('Run the tests'))).toEqual([
      useRedux,
      runTests,
    ])

    expect(todos([useRedux, runTests], local.addTodo('Fix the tests'))).toEqual(
      [useRedux, runTests, { text: 'Fix the tests', completed: false, id: 2 }],
    )
  })

  it('allocates one past the highest id, not one past the length', () => {
    const list = [
      { text: 'Buy milk', completed: false, id: 5 },
      { text: 'Write tests', completed: true, id: 2 },
    ]

    expect(
      todos(list, local.addTodo('Write more')).map((todo) => todo.id),
    ).toEqual([5, 2, 6])
  })

  it('drops the todo a local delete names', () => {
    expect(todos([useRedux, runTests], local.deleteTodo(1))).toEqual([useRedux])
  })

  it('rewrites the text a local edit names and keeps the flag', () => {
    expect(
      todos([runTests, useRedux], local.editTodo(1, 'Fix the tests')),
    ).toEqual([{ text: 'Fix the tests', completed: false, id: 1 }, useRedux])
  })

  it('writes the flag a local marking carries onto the todo it names', () => {
    expect(todos([runTests, useRedux], local.completeTodo(1, true))).toEqual([
      { text: 'Run the tests', completed: true, id: 1 },
      useRedux,
    ])
  })

  it('writes the completed flag it is given rather than toggling it', () => {
    const complete = [{ text: 'Run the tests', completed: true, id: 1 }]

    expect(todos(complete, local.completeTodo(1, true))).toEqual(complete)
  })

  it('marks every todo, and unmarks them all when they are already marked', () => {
    expect(
      todos(
        [{ text: 'Run the tests', completed: true, id: 1 }, useRedux],
        local.completeAllTodos(),
      ),
    ).toEqual([
      { text: 'Run the tests', completed: true, id: 1 },
      { text: 'Use Redux', completed: true, id: 0 },
    ])

    expect(
      todos(
        [
          { text: 'Run the tests', completed: true, id: 1 },
          { text: 'Use Redux', completed: true, id: 0 },
        ],
        local.completeAllTodos(),
      ),
    ).toEqual([
      { text: 'Run the tests', completed: false, id: 1 },
      { text: 'Use Redux', completed: false, id: 0 },
    ])
  })

  it('marks every todo when only some of them are complete', () => {
    expect(
      todos(
        [useRedux, { text: 'Run the tests', completed: true, id: 1 }],
        local.completeAllTodos(),
      ).map((todo) => todo.completed),
    ).toEqual([true, true])
  })

  it('keeps only the todos that are not complete', () => {
    expect(
      todos(
        [{ text: 'Run the tests', completed: true, id: 1 }, useRedux],
        local.clearCompleted(),
      ),
    ).toEqual([useRedux])
  })

  it('does not reuse an id after the completed todos are cleared', () => {
    const edits = [
      local.completeTodo(0, true),
      local.clearCompleted(),
      local.addTodo('Write more tests'),
    ]

    expect(
      edits.reduce(todos, [
        { id: 0, completed: false, text: 'Use Redux' },
        { id: 1, completed: false, text: 'Write tests' },
      ]),
    ).toEqual([
      { text: 'Write tests', completed: false, id: 1 },
      { text: 'Write more tests', completed: false, id: 2 },
    ])
  })

  it('replaces the whole list with what a load answered, seed included', () => {
    const loaded = [{ text: 'Ship it', completed: false, id: 9 }]

    expect(
      todos(seed, loadTodosOperation.fulfilled(loaded, 'r', undefined)),
    ).toEqual(loaded)
  })

  it('appends the todo an add answered with, not the one that was asked for', () => {
    const answered = { text: 'Ship it now', completed: true, id: 9 }

    expect(
      todos(
        [useRedux],
        addTodoOperation.fulfilled(answered, 'r', { text: 'Ship it' }),
      ),
    ).toEqual([useRedux, answered])
  })

  it('replaces the whole todo an edit answered with', () => {
    const answered = { text: 'Buy oats', completed: true, id: 0 }

    expect(
      todos(
        [useRedux, runTests],
        editTodoOperation.fulfilled(answered, 'r', { id: 0, text: 'Buy oats' }),
      ),
    ).toEqual([answered, runTests])
  })

  it('replaces the whole todo a marking answered with', () => {
    const answered = { text: 'Use Redux', completed: true, id: 0 }

    expect(
      todos(
        [useRedux, runTests],
        completeTodoOperation.fulfilled(answered, 'r', {
          id: 0,
          completed: true,
        }),
      ),
    ).toEqual([answered, runTests])
  })

  it('replaces the todo the edit asked about, not the one the answer names', () => {
    const answered = { text: 'Buy oats', completed: true, id: 1 }

    expect(
      todos(
        [useRedux, runTests],
        editTodoOperation.fulfilled(answered, 'r', { id: 0, text: 'Buy oats' }),
      ),
    ).toEqual([answered, runTests])
  })

  it('replaces the todo the marking asked about, not the one the answer names', () => {
    const answered = { text: 'Run the tests', completed: true, id: 1 }

    expect(
      todos(
        [useRedux, runTests],
        completeTodoOperation.fulfilled(answered, 'r', {
          id: 0,
          completed: true,
        }),
      ),
    ).toEqual([answered, runTests])
  })

  it('leaves the list alone when an answer names a todo it does not hold', () => {
    const answered = { text: 'Buy oats', completed: false, id: 9 }

    expect(
      todos(
        [useRedux],
        editTodoOperation.fulfilled(answered, 'r', { id: 9, text: 'Buy oats' }),
      ),
    ).toEqual([useRedux])
  })

  it('removes the todo a delete answered for, which carries no body', () => {
    expect(
      todos(
        [useRedux, runTests],
        removeTodoOperation.fulfilled(undefined, 'r', { id: 1 }),
      ),
    ).toEqual([useRedux])
  })

  it('leaves the list alone while an operation is still running', () => {
    expect(
      todos([useRedux], loadTodosOperation.pending('r', undefined)),
    ).toEqual([useRedux])
    expect(
      todos([useRedux], addTodoOperation.pending('r', { text: 'Ship it' })),
    ).toEqual([useRedux])
  })
})
