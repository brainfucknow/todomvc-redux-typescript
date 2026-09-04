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
        {/* The toggle-all control is an empty label that todomvc-app-css draws
              as a chevron. Labelling it, associating it with the checkbox, or
              adding a key handler changes what the user sees or how the app
              responds to input, which task 06 puts out of scope. */}
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
