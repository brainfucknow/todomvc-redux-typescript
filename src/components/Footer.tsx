import React from 'react'
import PropTypes from 'prop-types'
import FilterLink from '../containers/FilterLink'
import TodoFilters from '../constants/TodoFilters'
const { SHOW_ALL, SHOW_COMPLETED, SHOW_ACTIVE } = TodoFilters

const FILTER_TITLES = {
  [SHOW_ALL]: 'All',
  [SHOW_ACTIVE]: 'Active',
  [SHOW_COMPLETED]: 'Completed',
}
const Footer: React.FunctionComponent<FooterProps> = (props: FooterProps) => {
  const { activeCount, completedCount, onClearCompleted } = props
  const itemWord = activeCount === 1 ? 'item' : 'items'
  return (
    <footer className="footer">
      <span className="todo-count">
        <strong>{activeCount || 'No'}</strong> {itemWord} left
      </span>
      <ul className="filters">
        {[SHOW_ALL, SHOW_ACTIVE, SHOW_COMPLETED].map((filter) => (
          <li key={filter}>
            <FilterLink filter={filter}>{FILTER_TITLES[filter]}</FilterLink>
          </li>
        ))}
      </ul>
      {!!completedCount && (
        <button className="clear-completed" onClick={onClearCompleted}>
          Clear completed
        </button>
      )}
    </footer>
  )
}

Footer.propTypes = {
  completedCount: PropTypes.number.isRequired,
  activeCount: PropTypes.number.isRequired,
  onClearCompleted: PropTypes.func.isRequired,
}
export interface FooterProps {
  completedCount: number
  activeCount: number
  onClearCompleted: { (): void }
}

export default Footer
