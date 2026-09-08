import type { TodoApiRequest } from './client'
import { sendWithFetch } from './fetchTransport'

const answering = (response: Partial<Response>) => {
  const calls: [RequestInfo | URL, RequestInit | undefined][] = []
  globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    calls.push([input, init])
    return Promise.resolve(response as Response)
  }) as typeof fetch
  return calls
}

const GET_TODOS: TodoApiRequest = {
  method: 'GET',
  path: 'api/todos/',
  headers: { Accept: 'application/json' },
}

describe('sending a todo API request with fetch', () => {
  it('passes the path, method and headers through untouched', async () => {
    const calls = answering({ status: 200, text: () => Promise.resolve('[]') })

    await sendWithFetch(
      { ...GET_TODOS, method: 'POST', body: '{"text":"Buy milk"}' },
      true,
    )

    expect(calls[0]).toStrictEqual([
      'api/todos/',
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: '{"text":"Buy milk"}',
      },
    ])
  })

  it('sends no body key when the request has no body', async () => {
    const calls = answering({ status: 200, text: () => Promise.resolve('[]') })

    await sendWithFetch(GET_TODOS, true)

    expect(calls[0][1]).toStrictEqual({
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
  })

  it('reads the body when asked, and reports it with the status', async () => {
    answering({ status: 201, text: () => Promise.resolve('[{"id":1}]') })

    await expect(sendWithFetch(GET_TODOS, true)).resolves.toStrictEqual({
      status: 201,
      body: '[{"id":1}]',
    })
  })

  it('leaves the body unread when not asked, and still reports the status', async () => {
    const text = vi.fn(() => Promise.resolve('boom'))
    answering({ status: 500, text })

    await expect(sendWithFetch(GET_TODOS, false)).resolves.toStrictEqual({
      status: 500,
    })
    expect(text).not.toHaveBeenCalled()
  })
})
