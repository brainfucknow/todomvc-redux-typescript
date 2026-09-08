import { Middleware, MiddlewareAPI } from 'redux'
import {
  executeCall,
  type TodoApiCall,
  type TodoApiOutcome,
} from '../todo-api/client'
import { sendWithFetch } from '../todo-api/fetchTransport'

/**
 * The seam between Redux and the todo API client. It runs the call the action
 * carries, turns each outcome the client reports into an action, and does the
 * one thing the client must not do itself: write a failure to the console.
 *
 * Anything that is not an API call is somebody else's action and passes
 * through untouched.
 */
export const callAPIMiddleware: Middleware =
  (api: MiddlewareAPI) => (next) => (action: unknown) => {
    if (!isApiCall(action)) return next(action)

    return executeCall(action, sendWithFetch, (outcome) =>
      dispatchOutcome(api, outcome),
    )
  }

function isApiCall(action: unknown): action is TodoApiCall {
  return Boolean((action as Partial<TodoApiCall>).outcomeNames)
}

function dispatchOutcome(api: MiddlewareAPI, outcome: TodoApiOutcome) {
  if (outcome.kind === 'failed') {
    console.error(outcome.carried.error)
  }
  api.dispatch({
    ...outcome.fields,
    ...outcome.carried,
    type: outcome.name,
  })
}
