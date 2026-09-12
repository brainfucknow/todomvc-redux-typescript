import React from 'react'
import Footer from './Footer'
import VisibleTodoList from '../containers/VisibleTodoList'
import * as TodoActions from '../actions'

const MainSection: React.FunctionComponent<MainSectionProps> = ({
  todosCount,
  completedCount,
  actions,
}: MainSectionProps) => (
  <section className="main">
    {!!todosCount && (
      <span>
        <input
          className="toggle-all"
          type="checkbox"
          checked={completedCount === todosCount}
          readOnly
        />
        {/* An empty label todomvc-app-css draws as a chevron: labelling it or
              giving it a key handler changes what the user sees. */}
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
        <label onClick={actions.completeAllTodos} />
      </span>
    )}
    <VisibleTodoList />
    {!!todosCount && (
      <Footer
        completedCount={completedCount}
        activeCount={todosCount - completedCount}
        onClearCompleted={actions.clearCompleted}
      />
    )}
  </section>
)

export interface MainSectionProps {
  todosCount: number
  completedCount: number
  actions: typeof TodoActions
}

export default MainSection
