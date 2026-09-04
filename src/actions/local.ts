import * as types from '../constants/ActionTypes'
import TodoFilters from '../constants/TodoFilters'
import { ActionMessage } from '../constants/ActionMessage'
export const addTodo = (text: string): ActionMessage => ({
  type: types.ADD_TODO,
  text,
})
export const deleteTodo = (id: number): ActionMessage => ({
  type: types.DELETE_TODO,
  id,
})
export const editTodo = (id: number, text: string): ActionMessage => ({
  type: types.EDIT_TODO,
  id,
  text,
})
export const completeTodo = (
  id: number,
  completed: boolean,
): ActionMessage => ({ type: types.COMPLETE_TODO, id, completed })
export const completeAllTodos = (): ActionMessage => ({
  type: types.COMPLETE_ALL_TODOS,
})
export const clearCompleted = (): ActionMessage => ({
  type: types.CLEAR_COMPLETED,
})
export const setVisibilityFilter = (filter: TodoFilters): ActionMessage => ({
  type: types.SET_VISIBILITY_FILTER,
  filter,
})
