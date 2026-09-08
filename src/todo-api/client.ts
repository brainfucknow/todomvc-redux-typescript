/**
 * The todo backend client: what each user-level operation sends, and what the
 * client makes of the answer. It performs no request itself - a caller hands it
 * a `SendRequest`, which is the only thing in this pipeline that touches the
 * network - and it knows nothing about Redux, the DOM, or the console.
 *
 * `features/todo-api-requests.feature`, `todo-api-outcomes.feature` and
 * `todo-api-refusals.feature` specify everything below, including two things
 * that are current behavior rather than good behavior and are preserved
 * deliberately: the answer's status is never looked at, so a 500 whose body
 * parses succeeds; and a delete announces a content type for a body it never
 * sends.
 */

export type OutcomeNames = [string, string, string]

export interface TodoApiRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  headers: Record<string, string>
  body?: string
}

/** One user-level operation: a request, three outcome names, and its own fields. */
export interface TodoApiCall {
  outcomeNames: OutcomeNames
  fields: Record<string, unknown>
  request: TodoApiRequest
  readsResponseBody: boolean
}

/** What came back. `body` is present only when the client asked for it. */
export interface TodoApiAnswer {
  status: number
  body?: string
}

export type SendRequest = (
  request: TodoApiRequest,
  readResponseBody: boolean,
) => Promise<TodoApiAnswer>

/**
 * One report of progress. `fields` are the operation's own; `carried` is what
 * rides along with them - the parsed body on a success, what ended the call on
 * a failure. A success that read nothing still carries a `json` key, set to
 * undefined, because that is the action the reducers have always seen.
 */
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

/**
 * Runs one call: reports that it started, sends it, and reports what became of
 * it. The started outcome is reported before the request is sent, and a call
 * that never completes is reported rather than thrown. The one thing this does
 * throw is a call whose outcome names are unusable, and it throws that before
 * anything is sent or reported.
 */
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

/**
 * What a reading call makes of the bytes that came back. It throws when they
 * will not parse, and that throw is what turns a read into a failure outcome.
 * A call that reads nothing gets `undefined`, whatever the answer carried.
 */
function parsedBody(call: TodoApiCall, answer: TodoApiAnswer): unknown {
  return call.readsResponseBody ? JSON.parse(answer.body as string) : undefined
}
