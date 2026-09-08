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
} from './client'

const answering = (answer: TodoApiAnswer) => {
  const sent: { request: unknown; readResponseBody: boolean }[] = []
  const send: SendRequest = (request, readResponseBody) => {
    sent.push({ request, readResponseBody })
    return Promise.resolve(answer)
  }
  return { sent, send }
}

const failing = (error: unknown) => {
  const sent: unknown[] = []
  const send: SendRequest = (request) => {
    sent.push(request)
    return Promise.reject(error)
  }
  return { sent, send }
}

const collecting = () => {
  const outcomes: TodoApiOutcome[] = []
  return {
    outcomes,
    report: (outcome: TodoApiOutcome) => outcomes.push(outcome),
  }
}

describe('building todo API requests', () => {
  it('loads every todo from the collection path, with a trailing slash', () => {
    const call = loadTodosCall()

    expect(call.request).toStrictEqual({
      method: 'GET',
      path: 'api/todos/',
      headers: { Accept: 'application/json' },
    })
    expect(call.outcomeNames).toStrictEqual([
      'LOAD_TODO_REQUEST',
      'LOAD_TODO_SUCCESS',
      'LOAD_TODO_FAILURE',
    ])
    expect(call.fields).toStrictEqual({})
    expect(call.readsResponseBody).toBe(true)
  })

  it('adds a todo to the same trailing-slash path', () => {
    const call = addTodoCall('Buy milk')

    expect(call.request).toStrictEqual({
      method: 'POST',
      path: 'api/todos/',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: '{"text":"Buy milk"}',
    })
    expect(call.outcomeNames).toStrictEqual([
      'POST_TODO_REQUEST',
      'POST_TODO_SUCCESS',
      'POST_TODO_FAILURE',
    ])
    expect(call.fields).toStrictEqual({ text: 'Buy milk' })
    expect(call.readsResponseBody).toBe(true)
  })

  it('JSON-encodes the added text rather than pasting it into a string', () => {
    expect(addTodoCall('He said "hi"').request.body).toBe(
      '{"text":"He said \\"hi\\""}',
    )
  })

  it('edits one todo by id, sending the text alone', () => {
    const call = editTodoCall(42, 'Write tests')

    expect(call.request).toStrictEqual({
      method: 'PATCH',
      path: 'api/todos/42',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: '{"text":"Write tests"}',
    })
    expect(call.outcomeNames).toStrictEqual([
      'PATCH_TODO_REQUEST',
      'PATCH_TODO_SUCCESS',
      'PATCH_TODO_FAILURE',
    ])
    expect(call.fields).toStrictEqual({ id: 42, text: 'Write tests' })
    expect(call.readsResponseBody).toBe(true)
  })

  it('completes one todo by id, sending the flag alone', () => {
    const call = completeTodoCall(1, true)

    expect(call.request).toStrictEqual({
      method: 'PATCH',
      path: 'api/todos/1',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: '{"completed":true}',
    })
    expect(call.outcomeNames).toStrictEqual([
      'PATCH_TODO_REQUEST',
      'PATCH_TODO_SUCCESS',
      'PATCH_TODO_FAILURE',
    ])
    expect(call.fields).toStrictEqual({ id: 1, completed: true })
  })

  it('refuses to complete a todo with no flag to set', () => {
    const missing = [null, undefined] as unknown as boolean[]

    for (const completed of missing) {
      expect(() => completeTodoCall(1, completed)).toThrow(
        'Expected completed to be non null',
      )
    }
  })

  it('deletes one todo by id, announcing a content type it never uses', () => {
    const call = removeTodoCall(42)

    expect(call.request).toStrictEqual({
      method: 'DELETE',
      path: 'api/todos/42',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
    expect(call.outcomeNames).toStrictEqual([
      'DELETE_TODO_REQUEST',
      'DELETE_TODO_SUCCESS',
      'DELETE_TODO_FAILURE',
    ])
    expect(call.fields).toStrictEqual({ id: 42 })
    expect(call.readsResponseBody).toBe(false)
  })
})

describe('executing a todo API call', () => {
  it('reports the started outcome before the request is sent', async () => {
    const { outcomes, report } = collecting()
    const order: string[] = []
    const send: SendRequest = () => {
      order.push('sent')
      return Promise.resolve({ status: 200, body: '[]' })
    }

    await executeCall(loadTodosCall(), send, (outcome) => {
      order.push(outcome.kind)
      report(outcome)
    })

    expect(order).toStrictEqual(['started', 'sent', 'succeeded'])
    expect(outcomes[0]).toStrictEqual({
      kind: 'started',
      name: 'LOAD_TODO_REQUEST',
      fields: {},
      carried: {},
    })
  })

  it('carries the parsed body on the success outcome', async () => {
    const { send } = answering({
      status: 200,
      body: '{"id":7,"text":"Buy milk"}',
    })
    const { outcomes, report } = collecting()

    await executeCall(addTodoCall('Buy milk'), send, report)

    expect(outcomes.map((outcome) => outcome.name)).toStrictEqual([
      'POST_TODO_REQUEST',
      'POST_TODO_SUCCESS',
    ])
    expect(outcomes[1]).toStrictEqual({
      kind: 'succeeded',
      name: 'POST_TODO_SUCCESS',
      fields: { text: 'Buy milk' },
      carried: { json: { id: 7, text: 'Buy milk' } },
    })
  })

  it('succeeds on an error status whose body parses, because the status is never read', async () => {
    const { send } = answering({ status: 500, body: '{"id":8}' })
    const { outcomes, report } = collecting()

    await executeCall(addTodoCall('Write tests'), send, report)

    expect(outcomes[1].kind).toBe('succeeded')
    expect(outcomes[1].carried).toStrictEqual({ json: { id: 8 } })
  })

  it('never reads the answer to a delete, and carries no parsed body', async () => {
    const { sent, send } = answering({ status: 500, body: 'boom' })
    const { outcomes, report } = collecting()

    await executeCall(removeTodoCall(1), send, report)

    expect(sent[0].readResponseBody).toBe(false)
    expect(outcomes[1]).toStrictEqual({
      kind: 'succeeded',
      name: 'DELETE_TODO_SUCCESS',
      fields: { id: 1 },
      carried: { json: undefined },
    })
    expect('json' in outcomes[1].carried).toBe(true)
  })

  it('asks the transport to read the answer to a reading call', async () => {
    const { sent, send } = answering({ status: 200, body: '[]' })
    const { report } = collecting()

    await executeCall(loadTodosCall(), send, report)

    expect(sent[0].readResponseBody).toBe(true)
  })

  it('fails a reading call whose body will not parse', async () => {
    const { send } = answering({ status: 200, body: 'boom' })
    const { outcomes, report } = collecting()

    await executeCall(loadTodosCall(), send, report)

    expect(outcomes.map((outcome) => outcome.name)).toStrictEqual([
      'LOAD_TODO_REQUEST',
      'LOAD_TODO_FAILURE',
    ])
    expect(outcomes[1].kind).toBe('failed')
    expect(outcomes[1].fields).toStrictEqual({})
    expect(outcomes[1].carried.error).toBeInstanceOf(SyntaxError)
  })

  it('reports a call that never completes rather than throwing', async () => {
    const error = new Error('Failed to fetch')
    const { send } = failing(error)
    const { outcomes, report } = collecting()

    await expect(
      executeCall(editTodoCall(1, 'Buy milk'), send, report),
    ).resolves.toBeUndefined()

    expect(outcomes[1]).toStrictEqual({
      kind: 'failed',
      name: 'PATCH_TODO_FAILURE',
      fields: { id: 1, text: 'Buy milk' },
      carried: { error },
    })
  })

  it('refuses outcome names that are not three strings, sending nothing and reporting nothing', () => {
    const refused = [
      ['LOAD_TODO_REQUEST', 'LOAD_TODO_SUCCESS'],
      ['LOAD_TODO_REQUEST', 'LOAD_TODO_SUCCESS', 'LOAD_TODO_FAILURE', 'X'],
      ['LOAD_TODO_REQUEST', 'LOAD_TODO_SUCCESS', 3],
      'LOAD_TODO_REQUEST',
    ]

    for (const outcomeNames of refused) {
      const { sent, send } = answering({ status: 200, body: '[]' })
      const { outcomes, report } = collecting()
      const call = {
        ...loadTodosCall(),
        outcomeNames,
      } as unknown as TodoApiCall

      expect(() => executeCall(call, send, report)).toThrow(
        'Expected an array of three string types.',
      )
      expect(sent).toStrictEqual([])
      expect(outcomes).toStrictEqual([])
    }
  })
})
