import { combineReducers } from 'redux'
import todos from './todos'
import visibilityFilter from './visibilityFilter'
import { errorMessage } from './errorMessage'
import { executing } from './executing'

const rootReducer = combineReducers({
  todos,
  visibilityFilter,
  errorMessage,
  exec: executing,
})

export default rootReducer
