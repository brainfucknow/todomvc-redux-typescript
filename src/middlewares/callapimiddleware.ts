import { Middleware, MiddlewareAPI } from 'redux'
import {
  executeCall,
  type TodoApiCall,
  type TodoApiOutcome,
} from '../todo-api/client'
import { sendWithFetch } from '../todo-api/fetchTransport'

/** An API call, dispatched as an action. The action creators in `../actions/api` build them. */
export type ApiActionMessage = TodoApiCall

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
    const message = action as Partial<ApiActionMessage>
    if (!message.outcomeNames) {
      // Normal action: pass it on
      return next(action)
    }

    return executeCall(message as ApiActionMessage, sendWithFetch, (outcome) =>
      dispatchOutcome(api, outcome),
    )
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
