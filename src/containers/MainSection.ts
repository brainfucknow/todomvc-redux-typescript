import { connect } from 'react-redux'
import * as TodoActions from '../actions'
import { bindActionCreators, Dispatch, AnyAction } from 'redux'
import MainSection from '../components/MainSection'
import { getCompletedTodoCount } from '../selectors'
import { RootState } from './index'

const mapStateToProps = (state: RootState) => ({
  todosCount: state.todos.length,
  completedCount: getCompletedTodoCount(state),
})

const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) => ({
  actions: bindActionCreators(TodoActions, dispatch),
})

export default connect(mapStateToProps, mapDispatchToProps)(MainSection)
