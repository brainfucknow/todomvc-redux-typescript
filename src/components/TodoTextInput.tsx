import React, { useState } from 'react'
import classnames from 'classnames'
import {
  commitOnBlur,
  commitOnKey,
  openingText,
  type FieldCommit,
  type FieldKind,
} from '../todo-input/field'

export interface TodoTextInputProps {
  onSave(text: string): void
  text?: string
  placeholder?: string
  editing?: boolean
  newTodo?: boolean
}

// Seeded once: a later `text` prop is ignored, as it was before. No `memo`, unlike
// `TodoItem` - `onSave` is a fresh closure on every render, so nothing would be skipped.
const TodoTextInput: React.FunctionComponent<TodoTextInputProps> = ({
  onSave,
  text,
  placeholder,
  editing,
  newTodo,
}) => {
  const field: FieldKind = newTodo ? 'new-todo' : 'edit'
  const [held, setHeld] = useState(openingText(text))

  const handOn = (commit: FieldCommit | null) => {
    if (!commit) return
    onSave(commit.text)
    if (commit.clearsField) setHeld('')
  }

  return (
    <input
      className={classnames({ edit: editing, 'new-todo': newTodo })}
      type="text"
      placeholder={placeholder}
      // Dropping autoFocus moves where the caret lands: a behavior change.
      // eslint-disable-next-line jsx-a11y/no-autofocus
      autoFocus={true}
      value={held}
      onBlur={(e) => handOn(commitOnBlur(field, e.target.value))}
      onChange={(e) => setHeld(e.target.value)}
      onKeyDown={(e) =>
        handOn(commitOnKey(field, e.currentTarget.value, e.key))
      }
    />
  )
}

export default TodoTextInput
