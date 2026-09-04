import * as api from './api'
import * as local from './local'

export const addTodo = api.addTodo
export const deleteTodo = api.removeTodo
export const editTodo = api.editTodo
export const loadTodos = api.loadTodos
export const completeTodo = api.completeTodo
export const completeAllTodos = local.completeAllTodos
export const clearCompleted = local.clearCompleted
export const setVisibilityFilter = local.setVisibilityFilter
