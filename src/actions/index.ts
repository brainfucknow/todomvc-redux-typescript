import * as api from './api'
import * as local from './local'

/**
 * The names the app dispatches, and the one decision this module makes: which
 * of them ask the backend and which the app answers itself. Five ask, three do
 * not, and that is why four of the local edits have no caller - the four whose
 * names are taken here by an operation. `./index.spec.ts` holds the mapping.
 *
 * `deleteTodo` is the app's word for it; `api.removeTodo` is the operation's,
 * after the client call it runs.
 */

export const addTodo = api.addTodo
export const deleteTodo = api.removeTodo
export const editTodo = api.editTodo
export const loadTodos = api.loadTodos
export const completeTodo = api.completeTodo
export const completeAllTodos = local.completeAllTodos
export const clearCompleted = local.clearCompleted
export const setVisibilityFilter = local.setVisibilityFilter
