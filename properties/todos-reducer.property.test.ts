import { describe, expect, it } from 'vitest'
import todos from '../src/reducers/todos'
import * as local from '../src/actions/local'
import {
  addTodoOperation,
  completeTodoOperation,
  editTodoOperation,
  loadTodosOperation,
  removeTodoOperation,
} from '../src/actions/api'
import type { Todo } from '../src/models/Todo'
import {
  arrayOf,
  boolean,
  forAll,
  integer,
  text,
  tuple,
  type Arbitrary,
} from './tiny-check'

// The id rule is what a dense table cannot state: an implementation that counts
// instead of maxing passes every example whose ids happen to be dense.

const ID = integer(0, 12)
const TEXT = text(8)
const ROWS = arrayOf(tuple(ID, TEXT, boolean), 6)

type Row = [number, string, boolean]

// Ids unique: the invariant the reducer maintains, not one it is asked to repair.
const listOf = (rows: Row[]): Todo[] => {
  const byId = new Map<number, Todo>()
  for (const [id, body, completed] of rows) {
    if (!byId.has(id)) byId.set(id, { id, text: body, completed })
  }
  return [...byId.values()]
}

const idsOf = (list: Todo[]) => list.map((todo) => todo.id)
const flagsOf = (list: Todo[]) => list.map((todo) => todo.completed)
const textsOf = (list: Todo[]) => list.map((todo) => todo.text)

const absentFrom = (list: Todo[]) =>
  list.reduce((highest, todo) => Math.max(highest, todo.id), -1) + 1

interface Change {
  name: string
  apply: (list: Todo[]) => Todo[]
}

const failed = new Error('Failed to fetch')

// Drawn apart from the settled changes because they keep different invariants: the
// local half allocates ids, the settled half trusts what the backend said.
const localChanges = (id: number, body: string, flag: boolean): Change[] => [
  { name: `add ${body}`, apply: (l) => todos(l, local.addTodo(body)) },
  { name: `delete ${id}`, apply: (l) => todos(l, local.deleteTodo(id)) },
  { name: `edit ${id}`, apply: (l) => todos(l, local.editTodo(id, body)) },
  {
    name: `mark ${id} ${flag}`,
    apply: (l) => todos(l, local.completeTodo(id, flag)),
  },
  { name: 'toggle all', apply: (l) => todos(l, local.completeAllTodos()) },
  { name: 'clear completed', apply: (l) => todos(l, local.clearCompleted()) },
]

const settledChanges = (id: number, body: string, flag: boolean): Change[] => {
  const answer: Todo = { id, text: body, completed: flag }
  return [
    {
      name: 'a load answered',
      apply: (l) =>
        todos(l, loadTodosOperation.fulfilled([answer], 'r', undefined)),
    },
    {
      name: `an add answered with ${id}`,
      apply: (l) =>
        todos(l, addTodoOperation.fulfilled(answer, 'r', { text: body })),
    },
    {
      name: `an edit of ${id} answered`,
      apply: (l) =>
        todos(l, editTodoOperation.fulfilled(answer, 'r', { id, text: body })),
    },
    {
      name: `a marking of ${id} answered`,
      apply: (l) =>
        todos(
          l,
          completeTodoOperation.fulfilled(answer, 'r', { id, completed: flag }),
        ),
    },
    {
      name: `a delete of ${id} answered`,
      apply: (l) =>
        todos(l, removeTodoOperation.fulfilled(undefined, 'r', { id })),
    },
    {
      name: 'a load that failed',
      apply: (l) =>
        todos(l, loadTodosOperation.rejected(failed, 'r', undefined)),
    },
  ]
}

const drawnFrom = (
  choices: (id: number, body: string, flag: boolean) => Change[],
): Arbitrary<Change> => ({
  generate: (random) => {
    const available = choices(
      ID.generate(random),
      TEXT.generate(random),
      boolean.generate(random),
    )
    return available[Math.floor(random() * available.length)]
  },
  shrink: () => [],
})

const anyLocalChange = drawnFrom(localChanges)

const anyChange = drawnFrom((id, body, flag) => [
  ...localChanges(id, body, flag),
  ...settledChanges(id, body, flag),
])

describe('what a locally decided edit does to the list, for every list', () => {
  it('appends one todo whose id is past every id already there', async () => {
    await forAll(tuple(ROWS, TEXT), ([rows, body]) => {
      const before = listOf(rows)

      const after = todos(before, local.addTodo(body))

      expect(after).toHaveLength(before.length + 1)
      expect(after.slice(0, before.length)).toStrictEqual(before)
      expect(after[after.length - 1]).toStrictEqual({
        id: absentFrom(before),
        text: body,
        completed: false,
      })
      for (const todo of before) {
        expect(after[after.length - 1].id).toBeGreaterThan(todo.id)
      }
    })
  })

  it('writes the flag a marking carries, so marking twice says the same thing', async () => {
    await forAll(tuple(ROWS, ID, boolean), ([rows, id, flag]) => {
      const before = listOf(rows)

      const once = todos(before, local.completeTodo(id, flag))

      expect(todos(once, local.completeTodo(id, flag))).toStrictEqual(once)
      expect(idsOf(once)).toStrictEqual(idsOf(before))
      expect(textsOf(once)).toStrictEqual(textsOf(before))
      expect(once.filter((todo) => todo.id !== id)).toStrictEqual(
        before.filter((todo) => todo.id !== id),
      )
      for (const todo of once.filter((todo) => todo.id === id)) {
        expect(todo.completed).toBe(flag)
      }
    })
  })

  it('rewrites one text and keeps every flag, every id and the order', async () => {
    await forAll(tuple(ROWS, ID, TEXT), ([rows, id, body]) => {
      const before = listOf(rows)

      const after = todos(before, local.editTodo(id, body))

      expect(idsOf(after)).toStrictEqual(idsOf(before))
      expect(flagsOf(after)).toStrictEqual(flagsOf(before))
      expect(after.filter((todo) => todo.id !== id)).toStrictEqual(
        before.filter((todo) => todo.id !== id),
      )
      for (const todo of after.filter((todo) => todo.id === id)) {
        expect(todo.text).toBe(body)
      }
    })
  })

  it('drops the todo a delete names and keeps the rest in order', async () => {
    await forAll(tuple(ROWS, ID), ([rows, id]) => {
      const before = listOf(rows)

      const after = todos(before, local.deleteTodo(id))

      expect(after).toStrictEqual(before.filter((todo) => todo.id !== id))
      expect(before.length - after.length).toBeLessThanOrEqual(1)
    })
  })

  it('leaves the list alone when an edit names a todo it does not hold', async () => {
    await forAll(tuple(ROWS, TEXT, boolean), ([rows, body, flag]) => {
      const before = listOf(rows)
      const absent = absentFrom(before)

      expect(todos(before, local.editTodo(absent, body))).toStrictEqual(before)
      expect(todos(before, local.completeTodo(absent, flag))).toStrictEqual(
        before,
      )
      expect(todos(before, local.deleteTodo(absent))).toStrictEqual(before)
    })
  })

  it('keeps exactly the todos that are not complete when the list is cleared', async () => {
    await forAll(ROWS, (rows) => {
      const before = listOf(rows)

      const after = todos(before, local.clearCompleted())

      expect(after).toStrictEqual(before.filter((todo) => !todo.completed))
      expect(todos(after, local.clearCompleted())).toStrictEqual(after)
      expect(
        after.length + before.filter((todo) => todo.completed).length,
      ).toBe(before.length)
    })
  })
})

describe('what toggling every todo does, for every mixture of flags', () => {
  it('writes the negation of "are all marked" onto all of them', async () => {
    await forAll(ROWS, (rows) => {
      const before = listOf(rows)
      const wereAllMarked = before.every((todo) => todo.completed)

      const after = todos(before, local.completeAllTodos())

      expect(flagsOf(after)).toStrictEqual(before.map(() => !wereAllMarked))
      expect(idsOf(after)).toStrictEqual(idsOf(before))
      expect(textsOf(after)).toStrictEqual(textsOf(before))
    })
  })

  it('leaves a list whose todos already agree exactly as it was, after two', async () => {
    await forAll(tuple(ROWS, boolean), ([rows, marked]) => {
      const uniform = listOf(rows).map((todo) => ({
        ...todo,
        completed: marked,
      }))

      const twice = todos(
        todos(uniform, local.completeAllTodos()),
        local.completeAllTodos(),
      )

      expect(twice).toStrictEqual(uniform)
    })
  })
})

describe('what a backend operation does to the list, for every list', () => {
  it('moves nothing while it runs and nothing when it fails', async () => {
    await forAll(tuple(ROWS, ID, TEXT, boolean), ([rows, id, body, flag]) => {
      const before = listOf(rows)
      const unsettling = [
        loadTodosOperation.pending('r', undefined),
        addTodoOperation.pending('r', { text: body }),
        editTodoOperation.pending('r', { id, text: body }),
        completeTodoOperation.pending('r', { id, completed: flag }),
        removeTodoOperation.pending('r', { id }),
        loadTodosOperation.rejected(failed, 'r', undefined),
        addTodoOperation.rejected(failed, 'r', { text: body }),
        editTodoOperation.rejected(failed, 'r', { id, text: body }),
        completeTodoOperation.rejected(failed, 'r', { id, completed: flag }),
        removeTodoOperation.rejected(failed, 'r', { id }),
      ]

      for (const action of unsettling) {
        expect(todos(before, action)).toStrictEqual(before)
      }
    })
  })

  it('takes the answer over the request, at every id and every text', async () => {
    await forAll(tuple(ROWS, ID, TEXT, boolean), ([rows, id, body, flag]) => {
      const before = listOf(rows)
      const answer: Todo = { id, text: body, completed: flag }

      expect(
        todos(before, loadTodosOperation.fulfilled([answer], 'r', undefined)),
      ).toStrictEqual([answer])
      expect(
        todos(
          before,
          addTodoOperation.fulfilled(answer, 'r', { text: `${body} asked` }),
        ),
      ).toStrictEqual([...before, answer])

      for (const settled of [
        editTodoOperation.fulfilled(answer, 'r', { id, text: `${body} asked` }),
        completeTodoOperation.fulfilled(answer, 'r', {
          id,
          completed: !flag,
        }),
      ]) {
        const after = todos(before, settled)
        expect(idsOf(after)).toStrictEqual(idsOf(before))
        expect(after.filter((todo) => todo.id !== id)).toStrictEqual(
          before.filter((todo) => todo.id !== id),
        )
        for (const todo of after.filter((todo) => todo.id === id)) {
          expect(todo).toStrictEqual(answer)
        }
      }

      expect(
        todos(before, removeTodoOperation.fulfilled(undefined, 'r', { id })),
      ).toStrictEqual(before.filter((todo) => todo.id !== id))
    })
  })
})

describe('what holds of the list whatever happens to it', () => {
  it('keeps every id unique, through any run of locally decided changes', async () => {
    await forAll(tuple(ROWS, arrayOf(anyLocalChange, 8)), ([rows, changes]) => {
      let list = listOf(rows)

      for (const change of changes) {
        list = change.apply(list)
        expect(new Set(idsOf(list)).size).toBe(list.length)
      }
    })
  })

  it('answers with a new list rather than editing the one it was given', async () => {
    await forAll(tuple(ROWS, anyChange), ([rows, change]) => {
      const before = listOf(rows)
      const untouched = before.map((todo) => ({ ...todo }))

      change.apply(before)

      expect(before).toStrictEqual(untouched)
    })
  })
})
