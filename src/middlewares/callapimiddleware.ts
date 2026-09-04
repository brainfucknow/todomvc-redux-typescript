import { Middleware, MiddlewareAPI } from 'redux'

/* API action */
export interface ApiActionMessage {
  // Types of actions to emit before and after
  types: [string, string, string]
  // API request parameters:
  callAPI: [RequestInfo, RequestInit]
  // Arguments to inject in begin/end actions
  payload: Record<string, unknown>
  json: boolean
}

export const callAPIMiddleware: Middleware =
  (api: MiddlewareAPI) => (next) => (action: unknown) => {
    const message = action as Partial<ApiActionMessage>
    if (!message.types) {
      // Normal action: pass it on
      return next(action)
    }

    const { types, callAPI, payload = {}, json } = message as ApiActionMessage

    if (
      !Array.isArray(types) ||
      types.length !== 3 ||
      !types.every((type) => typeof type === 'string')
    ) {
      throw new Error('Expected an array of three string types.')
    }
    const [requestType, successType, failureType] = types
    api.dispatch(
      Object.assign({}, payload, {
        type: requestType,
      }),
    )
    return fetch(callAPI[0], callAPI[1])
      .then((response: Response) => {
        return json ? response.json() : undefined
      })
      .then((body: unknown) => {
        return api.dispatch(
          Object.assign({}, payload, {
            json: body,
            type: successType,
          }),
        )
      })
      .catch((error: unknown) => {
        console.error(error)
        api.dispatch(
          Object.assign({}, payload, {
            error,
            type: failureType,
          }),
        )
      })
  }
