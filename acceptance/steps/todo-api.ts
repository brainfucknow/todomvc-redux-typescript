import { expect } from 'vitest'
import {
  addTodoCall,
  completeTodoCall,
  editTodoCall,
  executeCall,
  loadTodosCall,
  removeTodoCall,
  type SendRequest,
  type TodoApiCall,
  type TodoApiOutcome,
  type TodoApiRequest,
} from '../../src/todo-api/client'
import { wholeNumber } from './cells'
import type { StepContext, StepDefinition, StepSuite } from '../runtime'

/**
 * The step vocabulary of features/todo-api-*.feature, connected to
 * `src/todo-api/client.ts`. No network: a call is executed against a stand-in
 * transport that answers exactly what the scenario says came back.
 *
 * Two conventions the features declare and this file honours: a `completed`
 * cell reading `null` or `undefined` means that JavaScript value, and an
 * outcome-names cell is JSON.
 */

export interface TodoApiWorld {
  call?: TodoApiCall
  refusal?: unknown
  outcomes: TodoApiOutcome[]
  requestsSent: number
}

type Context = StepContext<TodoApiWorld>
type Definition = StepDefinition<TodoApiWorld>

const createWorld = (): TodoApiWorld => ({ outcomes: [], requestsSent: 0 })

const build = ({ world }: Context, make: () => TodoApiCall) => {
  try {
    world.call = make()
  } catch (refusal) {
    world.refusal = refusal
  }
}

const execute = async (
  { world }: Context,
  call: TodoApiCall,
  answer: SendRequest,
) => {
  world.call = call
  const send: SendRequest = (request, readResponseBody) => {
    world.requestsSent += 1
    return answer(request, readResponseBody)
  }
  try {
    await executeCall(call, send, (outcome) => world.outcomes.push(outcome))
  } catch (refusal) {
    world.refusal = refusal
  }
}

const answering =
  (status: string, body: string): SendRequest =>
  (_request, readResponseBody) =>
    Promise.resolve({
      status: wholeNumber(status),
      ...(readResponseBody ? { body } : {}),
    })

const failingWith =
  (message: string): SendRequest =>
  () =>
    Promise.reject(new Error(message))

const requestOf = (world: TodoApiWorld): TodoApiRequest => callOf(world).request

const callOf = (world: TodoApiWorld): TodoApiCall => {
  if (!world.call) {
    throw new Error('No request was built')
  }
  return world.call
}

const outcomeOf = (
  world: TodoApiWorld,
  kind: TodoApiOutcome['kind'],
): TodoApiOutcome => {
  const outcome = world.outcomes.find((reported) => reported.kind === kind)
  if (!outcome) {
    throw new Error(
      `No ${kind} outcome: reported ${world.outcomes.map((o) => o.kind).join(', ') || 'nothing'}`,
    )
  }
  return outcome
}

/** `true`, `false`, and the two ways the features spell "no flag at all". */
function flag(value: string): boolean {
  const flags: Record<string, boolean | null | undefined> = {
    true: true,
    false: false,
    null: null,
    undefined: undefined,
  }
  if (!(value in flags)) {
    throw new Error(`Not a completed flag: ${value}`)
  }
  return flags[value] as boolean
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

const definitions: Definition[] = [
  {
    pattern: /^the client builds the request to load every todo$/,
    handle: (context) => build(context, () => loadTodosCall()),
  },
  {
    pattern: /^the client builds the request to add the todo (.+)$/,
    handle: (context, text) =>
      build(context, () => addTodoCall(context.expand(text))),
  },
  {
    pattern: /^the client builds the request to edit todo (.+) to (.+)$/,
    handle: (context, id, text) =>
      build(context, () =>
        editTodoCall(wholeNumber(context.expand(id)), context.expand(text)),
      ),
  },
  {
    pattern:
      /^the client builds the request to set todo (.+) completed to (.+)$/,
    handle: (context, id, completed) =>
      build(context, () =>
        completeTodoCall(
          wholeNumber(context.expand(id)),
          flag(context.expand(completed)),
        ),
      ),
  },
  {
    pattern: /^the client builds the request to delete todo (.+)$/,
    handle: (context, id) =>
      build(context, () => removeTodoCall(wholeNumber(context.expand(id)))),
  },

  {
    pattern: /^the request method is (.+)$/,
    handle: ({ world, expand }, method) =>
      expect(requestOf(world).method).toBe(expand(method)),
  },
  {
    pattern: /^the request path is (.+)$/,
    handle: ({ world, expand }, path) =>
      expect(requestOf(world).path).toBe(expand(path)),
  },
  {
    pattern: /^the request accept header is (.+)$/,
    handle: ({ world, expand }, value) =>
      expect(requestOf(world).headers['Accept']).toBe(expand(value)),
  },
  {
    pattern: /^the request content type header is (.+)$/,
    handle: ({ world, expand }, value) =>
      expect(requestOf(world).headers['Content-Type']).toBe(expand(value)),
  },
  {
    pattern: /^the request has no content type header$/,
    handle: ({ world }) =>
      expect('Content-Type' in requestOf(world).headers).toBe(false),
  },
  {
    pattern: /^the request sends no body$/,
    handle: ({ world }) => expect(requestOf(world).body).toBeUndefined(),
  },
  {
    pattern: /^the request body is (.+)$/,
    handle: ({ world, expand }, body) =>
      expect(requestOf(world).body).toBe(expand(body)),
  },
  {
    pattern: /^the outcome names are (.+), (.+) and (.+)$/,
    handle: ({ world, expand }, started, succeeded, failed) =>
      expect(callOf(world).outcomeNames).toStrictEqual([
        expand(started),
        expand(succeeded),
        expand(failed),
      ]),
  },
  {
    pattern: /^the outcome fields are (.+)$/,
    handle: ({ world, expandJson }, fields) =>
      expect(callOf(world).fields).toStrictEqual(
        JSON.parse(expandJson(fields)),
      ),
  },
  {
    pattern: /^the client reads the response body$/,
    handle: ({ world }) => expect(callOf(world).readsResponseBody).toBe(true),
  },
  {
    pattern: /^the client leaves the response body unread$/,
    handle: ({ world }) => expect(callOf(world).readsResponseBody).toBe(false),
  },

  {
    pattern:
      /^the add call for the todo (.+) is answered with status (.+) and body (.+)$/,
    handle: (context, text, status, body) =>
      execute(
        context,
        addTodoCall(context.expand(text)),
        answering(context.expand(status), context.expand(body)),
      ),
  },
  {
    pattern:
      /^the delete call for todo (.+) is answered with status (.+) and body (.+)$/,
    handle: (context, id, status, body) =>
      execute(
        context,
        removeTodoCall(wholeNumber(context.expand(id))),
        answering(context.expand(status), context.expand(body)),
      ),
  },
  {
    pattern: /^the load call is answered with status (.+) and body (.+)$/,
    handle: (context, status, body) =>
      execute(
        context,
        loadTodosCall(),
        answering(context.expand(status), context.expand(body)),
      ),
  },
  {
    pattern: /^the edit call for todo (.+) to (.+) fails with error (.+)$/,
    handle: (context, id, text, error) =>
      execute(
        context,
        editTodoCall(wholeNumber(context.expand(id)), context.expand(text)),
        failingWith(context.expand(error)),
      ),
  },
  {
    pattern: /^the client is asked to run a call whose outcome names are (.+)$/,
    handle: (context, names) =>
      execute(
        context,
        {
          ...loadTodosCall(),
          outcomeNames: JSON.parse(context.expand(names)),
        } as TodoApiCall,
        answering('200', '[]'),
      ),
  },

  {
    pattern: /^the outcomes are (.+) then (.+)$/,
    handle: ({ world, expand }, started, ended) =>
      expect(world.outcomes.map((outcome) => outcome.name)).toStrictEqual([
        expand(started),
        expand(ended),
      ]),
  },
  {
    pattern: /^the request outcome fields are (.+)$/,
    handle: ({ world, expandJson }, fields) =>
      expect(outcomeOf(world, 'started').fields).toStrictEqual(
        JSON.parse(expandJson(fields)),
      ),
  },
  {
    pattern: /^the success outcome fields are (.+)$/,
    handle: ({ world, expandJson }, fields) =>
      expect(outcomeOf(world, 'succeeded').fields).toStrictEqual(
        JSON.parse(expandJson(fields)),
      ),
  },
  {
    pattern: /^the failure outcome fields are (.+)$/,
    handle: ({ world, expandJson }, fields) =>
      expect(outcomeOf(world, 'failed').fields).toStrictEqual(
        JSON.parse(expandJson(fields)),
      ),
  },
  {
    pattern: /^the success outcome json is (.+)$/,
    handle: ({ world, expand }, body) =>
      expect(outcomeOf(world, 'succeeded').carried['json']).toStrictEqual(
        JSON.parse(expand(body)),
      ),
  },
  {
    pattern: /^the success outcome carries no parsed body$/,
    handle: ({ world }) =>
      expect(outcomeOf(world, 'succeeded').carried).toStrictEqual({
        json: undefined,
      }),
  },
  {
    pattern: /^the failure outcome error is (.+)$/,
    handle: ({ world, expand }, error) =>
      expect(messageOf(outcomeOf(world, 'failed').carried['error'])).toBe(
        expand(error),
      ),
  },

  {
    pattern: /^the client refuses with (.+)$/,
    handle: ({ world, expand }, message) =>
      expect(messageOf(world.refusal)).toBe(expand(message)),
  },
  {
    pattern: /^no request is built$/,
    handle: ({ world }) => expect(world.call).toBeUndefined(),
  },
  {
    pattern: /^no call is made$/,
    handle: ({ world }) => expect(world.requestsSent).toBe(0),
  },
  {
    pattern: /^no outcome is produced$/,
    handle: ({ world }) => expect(world.outcomes).toStrictEqual([]),
  },
]

export const todoApiSteps: StepSuite<TodoApiWorld> = {
  createWorld,
  definitions,
}
