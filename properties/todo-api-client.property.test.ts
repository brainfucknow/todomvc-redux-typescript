import { describe, expect, it } from 'vitest'
import {
  addTodoCall,
  completeTodoCall,
  editTodoCall,
  executeCall,
  loadTodosCall,
  removeTodoCall,
  type SendRequest,
  type TodoApiAnswer,
  type TodoApiCall,
  type TodoApiOutcome,
} from '../src/todo-api/client'
import {
  arrayOf,
  boolean,
  elementOf,
  forAll,
  integer,
  text,
  tuple,
  type Arbitrary,
} from './tiny-check'

// Two properties here pin behavior that is wrong on purpose: the status is never
// read, so a 500 whose body parses succeeds, and the trailing slash on the
// collection path is not on the per-id paths. Deleting either is part of fixing it.

const ID = integer(0, 100_000)
const TEXT = text()

const answering = (answer: TodoApiAnswer) => {
  const asked: boolean[] = []
  const send: SendRequest = (_request, readResponseBody) => {
    asked.push(readResponseBody)
    return Promise.resolve(
      readResponseBody ? answer : { status: answer.status },
    )
  }
  return { asked, send }
}

const failingWith =
  (error: unknown): SendRequest =>
  () =>
    Promise.reject(error)

const collecting = () => {
  const outcomes: TodoApiOutcome[] = []
  return {
    outcomes,
    report: (outcome: TodoApiOutcome) => outcomes.push(outcome),
  }
}

type CallCase = { name: string; build: () => TodoApiCall }

const anyCall: Arbitrary<CallCase> = {
  generate: (random) => {
    const id = ID.generate(random)
    const body = TEXT.generate(random)
    const flag = boolean.generate(random)
    const cases: CallCase[] = [
      { name: 'load', build: () => loadTodosCall() },
      { name: `add ${body}`, build: () => addTodoCall(body) },
      { name: `edit ${id}`, build: () => editTodoCall(id, body) },
      { name: `complete ${id}`, build: () => completeTodoCall(id, flag) },
      { name: `remove ${id}`, build: () => removeTodoCall(id) },
    ]
    return cases[Math.floor(random() * cases.length)]
  },
  shrink: () => [],
}

describe('what the client builds, for every input', () => {
  it('builds a body that parses back to the text it was given', async () => {
    await forAll(TEXT, (body) => {
      expect(
        JSON.parse(addTodoCall(body).request.body as string),
      ).toStrictEqual({ text: body })
    })
  })

  it('sends the text alone on an edit and the flag alone on a complete', async () => {
    await forAll(tuple(ID, TEXT, boolean), ([id, body, flag]) => {
      expect(
        JSON.parse(editTodoCall(id, body).request.body as string),
      ).toStrictEqual({ text: body })
      expect(
        JSON.parse(completeTodoCall(id, flag).request.body as string),
      ).toStrictEqual({ completed: flag })
    })
  })

  it('addresses one todo by its id, with no trailing slash, at every id', async () => {
    await forAll(tuple(ID, TEXT, boolean), ([id, body, flag]) => {
      const paths = [
        editTodoCall(id, body).request.path,
        completeTodoCall(id, flag).request.path,
        removeTodoCall(id).request.path,
      ]

      for (const path of paths) {
        expect(path).toBe(`api/todos/${id}`)
        expect(path.endsWith('/')).toBe(false)
      }
    })
  })

  it('addresses the collection with a trailing slash, at every text', async () => {
    await forAll(TEXT, (body) => {
      expect(loadTodosCall().request.path).toBe('api/todos/')
      expect(addTodoCall(body).request.path).toBe('api/todos/')
    })
  })

  it('always asks for JSON, and carries a body exactly when it writes one', async () => {
    await forAll(anyCall, ({ build }) => {
      const { request, readsResponseBody } = build()

      expect(request.headers['Accept']).toBe('application/json')
      expect('body' in request).toBe(
        request.method === 'POST' || request.method === 'PATCH',
      )
      expect(readsResponseBody).toBe(request.method !== 'DELETE')
    })
  })

  it('builds the same call twice from the same arguments', async () => {
    await forAll(tuple(ID, TEXT, boolean), ([id, body, flag]) => {
      expect(editTodoCall(id, body)).toStrictEqual(editTodoCall(id, body))
      expect(addTodoCall(body)).toStrictEqual(addTodoCall(body))
      expect(completeTodoCall(id, flag)).toStrictEqual(
        completeTodoCall(id, flag),
      )
      expect(removeTodoCall(id)).toStrictEqual(removeTodoCall(id))
      expect(loadTodosCall()).toStrictEqual(loadTodosCall())
    })
  })

  it('refuses a complete with no flag, whatever the id', async () => {
    await forAll(tuple(ID, elementOf([null, undefined])), ([id, missing]) => {
      expect(() => completeTodoCall(id, missing as unknown as boolean)).toThrow(
        'Expected completed to be non null',
      )
    })
  })
})

describe('what the client makes of an answer, for every answer', () => {
  it('reports exactly two outcomes, started first, with the call fields on both', async () => {
    await forAll(
      tuple(anyCall, integer(100, 599)),
      async ([{ build }, status]) => {
        const call = build()
        const { outcomes, report } = collecting()

        await executeCall(call, answering({ status, body: '{}' }).send, report)

        expect(outcomes).toHaveLength(2)
        expect(outcomes[0].kind).toBe('started')
        expect(outcomes[0].name).toBe(call.outcomeNames[0])
        expect(outcomes[1].kind).toBe('succeeded')
        expect(outcomes.map((outcome) => outcome.fields)).toStrictEqual([
          call.fields,
          call.fields,
        ])
      },
    )
  })

  it('reports a failure the same way, with the same fields and what ended it', async () => {
    await forAll(tuple(anyCall, TEXT), async ([{ build }, message]) => {
      const call = build()
      const error = new Error(message)
      const { outcomes, report } = collecting()

      await executeCall(call, failingWith(error), report)

      expect(outcomes.map((outcome) => outcome.name)).toStrictEqual([
        call.outcomeNames[0],
        call.outcomeNames[2],
      ])
      expect(outcomes[1].fields).toStrictEqual(call.fields)
      expect(outcomes[1].carried).toStrictEqual({ error })
    })
  })

  it('reads nothing but the body: the status never decides success or failure', async () => {
    await forAll(tuple(integer(100, 599), TEXT), async ([status, body]) => {
      const { outcomes, report } = collecting()
      await executeCall(
        loadTodosCall(),
        answering({ status, body }).send,
        report,
      )

      expect(outcomes[1].kind).toBe(parses(body) ? 'succeeded' : 'failed')
    })
  })

  it('carries the parsed body when it parses, at every status', async () => {
    await forAll(tuple(integer(100, 599), TEXT), async ([status, body]) => {
      const answer = JSON.stringify({ id: 1, text: body })
      const { outcomes, report } = collecting()

      await executeCall(
        addTodoCall(body),
        answering({ status, body: answer }).send,
        report,
      )

      expect(outcomes[1].kind).toBe('succeeded')
      expect(outcomes[1].carried).toStrictEqual({
        json: { id: 1, text: body },
      })
    })
  })

  it('never reads a delete, and succeeds it whatever came back', async () => {
    await forAll(
      tuple(ID, integer(100, 599), TEXT),
      async ([id, status, body]) => {
        const { asked, send } = answering({ status, body })
        const { outcomes, report } = collecting()

        await executeCall(removeTodoCall(id), send, report)

        expect(asked).toStrictEqual([false])
        expect(outcomes[1].kind).toBe('succeeded')
        expect(outcomes[1].carried).toStrictEqual({ json: undefined })
        expect('json' in outcomes[1].carried).toBe(true)
      },
    )
  })

  it('refuses any outcome names that are not three strings, sending nothing', async () => {
    const names = arrayOf(
      elementOf<unknown>(['A', '', 0, null, undefined, true, ['A']]),
    )

    await forAll(names, (outcomeNames) => {
      const usable =
        outcomeNames.length === 3 &&
        outcomeNames.every((name) => typeof name === 'string')

      const { asked, send } = answering({ status: 200, body: '[]' })
      const { outcomes, report } = collecting()
      const call = {
        ...loadTodosCall(),
        outcomeNames,
      } as unknown as TodoApiCall

      if (usable) {
        expect(() => executeCall(call, send, report)).not.toThrow()
        return
      }

      expect(() => executeCall(call, send, report)).toThrow(
        'Expected an array of three string types.',
      )
      expect(asked).toStrictEqual([])
      expect(outcomes).toStrictEqual([])
    })
  })
})

function parses(body: string): boolean {
  try {
    JSON.parse(body)
    return true
  } catch {
    return false
  }
}
