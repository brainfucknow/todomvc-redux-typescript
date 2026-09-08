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

/**
 * The text field, and nothing but the field: it renders an input, turns the
 * events React hands it into questions for `src/todo-input/field.ts`, and does
 * what the answers say. Every rule about trimming, clearing and which key acts
 * is there rather than here.
 *
 * The field is seeded once, from the text it is opened on, and never re-reads
 * that prop - `useState(openingText(text))` keeps the class's behavior, where
 * a later `text` prop was ignored. `memo` would be theatre here: `onSave` is a
 * fresh closure on every render of both callers, so the `PureComponent` this
 * replaced compared props that always differed and never skipped a render.
 */
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
      // Dropping autoFocus moves where the caret lands when the input
      // appears, both for the new-todo field and for an item opened for
      // editing. That is a behavior change, which task 06 puts out of scope.
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
