import TodoFilters from '../constants/TodoFilters'
import { Todo } from '../models/Todo'

export interface RootState {
  todos: Todo[]
  visibilityFilter: TodoFilters
}
