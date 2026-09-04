import {
  ADD_TODO,
  DELETE_TODO,
  EDIT_TODO,
  COMPLETE_TODO,
  COMPLETE_ALL_TODOS,
  CLEAR_COMPLETED,
  LOAD_TODO_SUCCESS,
  POST_TODO_SUCCESS,
  DELETE_TODO_SUCCESS,
  PATCH_TODO_SUCCESS,
} from '../constants/ActionTypes'
import { ActionMessage } from '../constants/ActionMessage'
import { Todo } from '../models/Todo'

const initialState: Todo[] = [
  {
    text: 'Use Redux',
    completed: false,
    id: 0,
  },
]
export default function todoApiResults(
  state = initialState,
  action: ActionMessage,
) {
  switch (action?.type) {
    case LOAD_TODO_SUCCESS:
      return action.json
    case POST_TODO_SUCCESS:
      return [...state, action.json]
    case DELETE_TODO_SUCCESS:
      return state.filter((t) => t.id !== action.id)
    case PATCH_TODO_SUCCESS:
      return state.map((todo) => (todo.id === action.id ? action.json : todo))

    default:
      return todos(state, action)
  }
}

export function todos(state = initialState, action: ActionMessage) {
  switch (action?.type) {
    case ADD_TODO:
      return [
        ...state,
        {
          id: state.reduce((maxId, todo) => Math.max(todo.id, maxId), -1) + 1,
          completed: false,
          text: action.text,
        },
      ]

    case DELETE_TODO:
      return state.filter((todo) => todo.id !== action.id)

    case EDIT_TODO:
      return state.map((todo) =>
        todo.id === action.id ? { ...todo, text: action.text } : todo,
      )

    case COMPLETE_TODO:
      return state.map((todo) =>
        todo.id === action.id ? { ...todo, completed: action.completed } : todo,
      )

    case COMPLETE_ALL_TODOS: {
      const areAllMarked = state.every((todo) => todo.completed)
      return state.map((todo) => ({
        ...todo,
        completed: !areAllMarked,
      }))
    }

    case CLEAR_COMPLETED:
      return state.filter((todo) => todo.completed === false)

    default:
      return state
  }
}
