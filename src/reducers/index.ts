import { combineReducers } from 'redux'
import todos from './todos'
import visibilityFilter from './visibilityFilter'
import { errorMessage, executing } from './apis'

const rootReducer = combineReducers({
  todos,
  visibilityFilter,
  errorMessage,
  exec: executing,
})

export default rootReducer
