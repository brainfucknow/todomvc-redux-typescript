// Preserved behavior, specified in features/todo-api-*.feature and not to be tidied:
// the answer's status is never read, so a 500 whose body parses succeeds.

export type OutcomeNames = [string, string, string]

export interface TodoApiRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  headers: Record<string, string>
  body?: string
}

export interface TodoApiCall {
  outcomeNames: OutcomeNames
  fields: Record<string, unknown>
  request: TodoApiRequest
  readsResponseBody: boolean
}

export interface TodoApiAnswer {
  status: number
  body?: string
}

export type SendRequest = (
  request: TodoApiRequest,
  readResponseBody: boolean,
) => Promise<TodoApiAnswer>

// `carried` holds the parsed body on a success and what ended the call on a failure.
export interface TodoApiOutcome {
  kind: 'started' | 'succeeded' | 'failed'
  name: string
  fields: Record<string, unknown>
  carried: Record<string, unknown>
}

export type ReportOutcome = (outcome: TodoApiOutcome) => void

const COLLECTION_PATH = 'api/todos/'
const todoPath = (id: number) => `api/todos/${id}`

const ACCEPTS_JSON = { Accept: 'application/json' }
const ACCEPTS_AND_ANNOUNCES_JSON = {
  ...ACCEPTS_JSON,
  'Content-Type': 'application/json',
}

const LOAD_OUTCOMES: OutcomeNames = [
  'LOAD_TODO_REQUEST',
  'LOAD_TODO_SUCCESS',
  'LOAD_TODO_FAILURE',
]
const POST_OUTCOMES: OutcomeNames = [
  'POST_TODO_REQUEST',
  'POST_TODO_SUCCESS',
  'POST_TODO_FAILURE',
]
const PATCH_OUTCOMES: OutcomeNames = [
  'PATCH_TODO_REQUEST',
  'PATCH_TODO_SUCCESS',
  'PATCH_TODO_FAILURE',
]
const DELETE_OUTCOMES: OutcomeNames = [
  'DELETE_TODO_REQUEST',
  'DELETE_TODO_SUCCESS',
  'DELETE_TODO_FAILURE',
]

export function loadTodosCall(): TodoApiCall {
  return {
    outcomeNames: LOAD_OUTCOMES,
    fields: {},
    request: {
      method: 'GET',
      path: COLLECTION_PATH,
      headers: ACCEPTS_JSON,
    },
    readsResponseBody: true,
  }
}

export function addTodoCall(text: string): TodoApiCall {
  return {
    outcomeNames: POST_OUTCOMES,
    fields: { text },
    request: {
      method: 'POST',
      path: COLLECTION_PATH,
      headers: ACCEPTS_AND_ANNOUNCES_JSON,
      body: JSON.stringify({ text }),
    },
    readsResponseBody: true,
  }
}

export function editTodoCall(id: number, text: string): TodoApiCall {
  return {
    outcomeNames: PATCH_OUTCOMES,
    fields: { id, text },
    request: {
      method: 'PATCH',
      path: todoPath(id),
      headers: ACCEPTS_AND_ANNOUNCES_JSON,
      body: JSON.stringify({ text }),
    },
    readsResponseBody: true,
  }
}

export function completeTodoCall(id: number, completed: boolean): TodoApiCall {
  if (completed == null) {
    throw new Error('Expected completed to be non null')
  }
  return {
    outcomeNames: PATCH_OUTCOMES,
    fields: { id, completed },
    request: {
      method: 'PATCH',
      path: todoPath(id),
      headers: ACCEPTS_AND_ANNOUNCES_JSON,
      body: JSON.stringify({ completed }),
    },
    readsResponseBody: true,
  }
}

// Alone among the calls it reads no body, and announces a content type for a body it never sends.
export function removeTodoCall(id: number): TodoApiCall {
  return {
    outcomeNames: DELETE_OUTCOMES,
    fields: { id },
    request: {
      method: 'DELETE',
      path: todoPath(id),
      headers: ACCEPTS_AND_ANNOUNCES_JSON,
    },
    readsResponseBody: false,
  }
}

// Deliberately loose: whether the names are usable is `executeCall`'s question, and
// widening this one would change what reaches the rest of a dispatch chain.
export function isTodoApiCall(message: unknown): message is TodoApiCall {
  return Boolean((message as Partial<TodoApiCall>).outcomeNames)
}

// A failed call is reported, not thrown; unusable outcome names are thrown before
// anything is sent or reported.
export function executeCall(
  call: TodoApiCall,
  send: SendRequest,
  report: ReportOutcome,
): Promise<void> {
  const [startedName, succeededName, failedName] = outcomeNamesOf(call)

  report({
    kind: 'started',
    name: startedName,
    fields: call.fields,
    carried: {},
  })

  return send(call.request, call.readsResponseBody)
    .then((answer) => {
      report({
        kind: 'succeeded',
        name: succeededName,
        fields: call.fields,
        carried: { json: parsedBody(call, answer) },
      })
    })
    .catch((error: unknown) => {
      report({
        kind: 'failed',
        name: failedName,
        fields: call.fields,
        carried: { error },
      })
    })
}

function outcomeNamesOf(call: TodoApiCall): OutcomeNames {
  const names: unknown = call.outcomeNames
  if (
    !Array.isArray(names) ||
    names.length !== 3 ||
    !names.every((name) => typeof name === 'string')
  ) {
    throw new Error('Expected an array of three string types.')
  }
  return names as OutcomeNames
}

// A throw from here is what turns an unparseable body into a failure outcome.
function parsedBody(call: TodoApiCall, answer: TodoApiAnswer): unknown {
  return call.readsResponseBody ? JSON.parse(answer.body as string) : undefined
}
