import { AnyAction, Dispatch, Middleware, MiddlewareAPI } from 'redux';
import { RootState } from '../containers';

/* API action */
export interface ApiActionMessage {
  // Types of actions to emit before and after
  types: [string, string, string];
  // API request parameters:
  callAPI: [RequestInfo, RequestInit];
  // Arguments to inject in begin/end actions
  payload: any;
  json: boolean;
}

// Which actions this middleware acts on, published because it is the whole of
// what a stand-in for this middleware has to agree with. `src/test-render.tsx`
// installs one so a unit test never reaches `fetch`, and asks here rather than
// deciding again what an API action looks like.
export const isApiAction = (action: unknown): boolean =>
  Boolean((action as { types?: unknown } | null | undefined)?.types);

export const callAPIMiddleware: Middleware =
  (api: MiddlewareAPI) =>
  (next) =>
  (action: any) => {
    if (!isApiAction(action)) {
      // Normal action: pass it on
      return next(action);
    }

    const { types, callAPI, payload = {}, json }: ApiActionMessage = action;

    if (
      !Array.isArray(types) ||
      types.length !== 3 ||
      !types.every((type) => typeof type === 'string')
    ) {
      throw new Error('Expected an array of three string types.');
    }
    const [requestType, successType, failureType] = types;
    api.dispatch(
      Object.assign({}, payload, {
        type: requestType,
      })
    );
    return fetch(callAPI[0], callAPI[1])
      .then((response: Response) => {
        return json ? response.json() : undefined;
      })
      .then((body: any) => {
        return api.dispatch(
          Object.assign({}, payload, {
            json: body,
            type: successType,
          })
        );
      })
      .catch((error: any) => {
        console.error(error);
        api.dispatch(
          Object.assign({}, payload, {
            error,
            type: failureType,
          })
        );
      });
  };
