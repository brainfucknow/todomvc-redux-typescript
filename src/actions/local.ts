import TodoFilters from '../constants/TodoFilters'
import { todoActions } from '../reducers/todos'
import { errorActions } from '../reducers/errorMessage'
import { visibilityFilterActions } from '../reducers/visibilityFilter'

// The four edits with no caller are explained in ../reducers/todos.ts.

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
