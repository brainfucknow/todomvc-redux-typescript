/**
 * The five todo backend operations under the names the UI dispatches. Each one
 * is a call for the middleware to run; what it sends and what it makes of the
 * answer is `src/todo-api/client.ts`.
 */
export {
  loadTodosCall as loadTodos,
  editTodoCall as editTodo,
  completeTodoCall as completeTodo,
  addTodoCall as addTodo,
  removeTodoCall as removeTodo,
} from '../todo-api/client'
