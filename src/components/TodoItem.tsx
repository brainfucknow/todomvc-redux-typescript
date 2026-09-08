import React, { memo, useState } from 'react'
import classnames from 'classnames'
import TodoTextInput from './TodoTextInput'
import { commitFromEditField } from '../todo-input/effects'
import { Todo } from '../models/Todo'

export interface TodoItemProps {
  deleteTodo(id: number): void
  editTodo(id: number, text: string): void
  completeTodo(id: number, completed: boolean): void
  todo: Todo
}

/**
 * One row: it holds whether the row is being edited, renders accordingly, and
 * asks `src/todo-input/effects.ts` what a committed text means. Whether an
 * empty commit deletes the todo is that module's answer, not this file's.
 */
const TodoItem: React.FunctionComponent<TodoItemProps> = ({
  todo,
  deleteTodo,
  editTodo,
  completeTodo,
}) => {
  const [editing, setEditing] = useState(false)

  const save = (text: string) => {
    const { change, closesEditor } = commitFromEditField(todo.id, text)
    if (change.kind === 'delete') {
      deleteTodo(change.id)
    } else {
      editTodo(change.id, change.text)
    }
    if (closesEditor) setEditing(false)
  }

  return (
    <li className={classnames({ completed: todo.completed, editing })}>
      {editing ? (
        <TodoTextInput text={todo.text} editing={editing} onSave={save} />
      ) : (
        <div className="view">
          <input
            className="toggle"
            type="checkbox"
            checked={todo.completed}
            onChange={() => completeTodo(todo.id, !todo.completed)}
          />
          <label onDoubleClick={() => setEditing(true)}>{todo.text}</label>
          <button className="destroy" onClick={() => deleteTodo(todo.id)} />
        </div>
      )}
    </li>
  )
}

/**
 * `memo` rather than nothing, because the `PureComponent` this replaced really
 * did skip renders: `TodoList` re-renders on every store change and maps every
 * todo, while a row's props - one `todo` object out of the store and the bound
 * action creators, which `connect` builds once - are shallow-equal unless that
 * row's own todo changed. Dropping the comparison would re-render every row on
 * every change.
 */
export default memo(TodoItem)
