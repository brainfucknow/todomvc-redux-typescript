import { SET_VISIBILITY_FILTER } from '../constants/ActionTypes'
import { ActionMessage } from '../constants/ActionMessage'
import TodoFilters from '../constants/TodoFilters'

const { SHOW_ALL } = TodoFilters

const visibilityFilter = (state = SHOW_ALL, action: ActionMessage) => {
  switch (action.type) {
    case SET_VISIBILITY_FILTER:
      return action.filter
    default:
      return state
  }
}

export default visibilityFilter
