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
    setEditing(!closesEditor)
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

// `memo` skips real work: `TodoList` re-renders on every store change, and a row's
// props are shallow-equal unless that row's own todo changed.
export default memo(TodoItem)
