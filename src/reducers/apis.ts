import { ActionMessage } from '../constants/ActionMessage'
import * as ActionTypes from '../constants/ActionTypes'
import { AnyAction } from 'redux'
export function executing(
  state = { isLoadingAll: false, t: {}, isAdding: false },
  action: ActionMessage,
) {
  switch (action?.type) {
    case 'LOAD_TODO_REQUEST':
      return {
        ...state,
        isLoadingAll: true,
      }
    case 'LOAD_TODO_SUCCESS':
    case 'LOAD_TODO_FAILURE':
      return {
        ...state,
        isLoadingAll: false,
      }
    case 'PATCH_TODO_REQUEST':
    case 'DELETE_TODO_REQUEST':
      console.log('action', action)
      return {
        ...state,
        t: { ...state.t, [action.id.toString()]: { isUpdating: true } },
      }
    case 'PATCH_TODO_SUCCESS':
    case 'PATCH_TODO_FAILURE':
    case 'DELETE_TODO_SUCCESS':
    case 'DELETE_TODO_FAILURE':
      return {
        ...state,
        t: { ...state.t, [action.id.toString()]: { isUpdating: false } },
      }

    case 'POST_TODO_REQUEST':
      return { ...state, isAdding: true }
    case 'POST_TODO_SUCCESS':
    case 'POST_TODO_FAILURE':
      return { ...state, isAdding: false }
    default:
      return state
  }
}

// Updates error message to notify about the failed fetches.
export function errorMessage(state = null, action: AnyAction) {
  if (!action) return state

  const { type, error } = action

  if (type === ActionTypes.RESET_ERROR_MESSAGE) {
    return null
  } else if (error) {
    return error
  }

  return state
}
