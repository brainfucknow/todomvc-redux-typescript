import { connect } from 'react-redux'
import { setVisibilityFilter } from '../actions'
import Link from '../components/Link'
import { Dispatch } from 'react'
import { RootState } from './index'
import TodoFilters from '../constants/TodoFilters'
import { ActionMessage } from '../constants/ActionMessage'

export interface LinkProps {
  filter: TodoFilters
}

const mapStateToProps = (state: RootState, ownProps: LinkProps) => ({
  active: ownProps.filter === state.visibilityFilter,
})

const mapDispatchToProps = (
  dispatch: Dispatch<ActionMessage>,
  ownProps: LinkProps,
) => ({
  setFilter: () => {
    dispatch(setVisibilityFilter(ownProps.filter))
  },
})

export default connect(mapStateToProps, mapDispatchToProps)(Link)
