import TodoFilters from './TodoFilters'
import { Todo } from '../models/Todo'
export type ActionMessage =
  | {
      type: 'ADD_TODO'
      text: string
    }
  | {
      type: 'DELETE_TODO'
      id: number
    }
  | {
      type: 'EDIT_TODO'
      id: number
      text: string
    }
  | {
      type: 'COMPLETE_TODO'
      id: number
      completed: boolean
    }
  | {
      type: 'COMPLETE_ALL_TODOS'
    }
  | {
      type: 'CLEAR_COMPLETED'
    }
  | {
      type: 'SET_VISIBILITY_FILTER'
      filter: TodoFilters
    }
  | {
      type: 'NONE'
    }
  | {
      type: 'RESET_ERROR_MESSAGE'
    }
  | ({
      type:
        'DELETE_TODO_REQUEST' | 'DELETE_TODO_SUCCESS' | 'DELETE_TODO_FAILURE'
    } & Pick<Todo, 'id'>)
  | ({
      type: 'POST_TODO_REQUEST' | 'POST_TODO_FAILURE'
    } & Pick<Todo, 'text'>)
  | ({
      type: 'POST_TODO_SUCCESS'
      json: Todo
    } & Pick<Todo, 'text'>)
  | ({
      type: 'PATCH_TODO_REQUEST' | 'PATCH_TODO_FAILURE'
    } & Todo)
  | ({
      type: 'PATCH_TODO_SUCCESS'
      json: Todo
    } & Todo)
  | {
      type: 'LOAD_TODO_SUCCESS'
      json: Todo[]
    }
  | {
      type: 'LOAD_TODO_REQUEST' | 'LOAD_TODO_FAILURE'
    }
