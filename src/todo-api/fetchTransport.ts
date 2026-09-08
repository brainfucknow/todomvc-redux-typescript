import type { SendRequest, TodoApiRequest } from './client'

/**
 * The only place in the todo API pipeline that touches the network. It
 * translates a request into `fetch` arguments and an answer back into a status
 * and, when asked, the body as text. It decides nothing: whether the body is
 * read is the call's decision, and what the body means is the client's.
 */
export const sendWithFetch: SendRequest = (request, readResponseBody) =>
  fetch(request.path, requestInit(request)).then((response) =>
    readResponseBody
      ? response.text().then((body) => ({ status: response.status, body }))
      : { status: response.status },
  )

function requestInit(request: TodoApiRequest): RequestInit {
  const init: RequestInit = { method: request.method, headers: request.headers }
  return request.body === undefined ? init : { ...init, body: request.body }
}
