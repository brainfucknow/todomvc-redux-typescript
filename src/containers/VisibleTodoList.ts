import { connect } from 'react-redux'
import { bindActionCreators, AnyAction, Dispatch } from 'redux'
import * as TodoActions from '../actions'
import TodoList from '../components/TodoList'
import { getVisibleTodos } from '../selectors'
import { RootState } from './index'

const mapStateToProps = (state: RootState) => ({
  filteredTodos: getVisibleTodos(state),
})

const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) => {
  const actions = bindActionCreators(TodoActions, dispatch)
  return {
    actions: actions,
  }
}

const VisibleTodoList = connect(mapStateToProps, mapDispatchToProps)(TodoList)

export default VisibleTodoList
