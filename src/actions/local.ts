import TodoFilters from '../constants/TodoFilters'
import { todoActions } from '../reducers/todos'
import { errorActions } from '../reducers/apis'
import { visibilityFilterActions } from '../reducers/visibilityFilter'

/**
 * The changes the app decides on its own: no request is sent and nothing is
 * waited for. `./api` is the other half - the operations that ask the backend.
 *
 * Each is a plain function of the arguments the app has at the call site rather
 * than the slice's action creator itself, for the reason `./api` gives: an
 * action creator handed straight to an `onClick` would take the DOM event as
 * its payload.
 *
 * Four of these have no caller, because `./index` maps their names to the
 * backend operations instead. They are specified in
 * `features/todo-state-edits.feature`; see `../reducers/todos.ts`.
 */

export const addTodo = (text: string) => todoActions.addTodo(text)

export const deleteTodo = (id: number) => todoActions.deleteTodo(id)

export const editTodo = (id: number, text: string) =>
  todoActions.editTodo(id, text)

export const completeTodo = (id: number, completed: boolean) =>
  todoActions.completeTodo(id, completed)

export const completeAllTodos = () => todoActions.completeAllTodos()

export const clearCompleted = () => todoActions.clearCompleted()

export const setVisibilityFilter = (filter: TodoFilters) =>
  visibilityFilterActions.setVisibilityFilter(filter)

export const resetErrorMessage = () => errorActions.resetErrorMessage()
