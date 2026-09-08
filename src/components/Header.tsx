import React from 'react'
import TodoTextInput from './TodoTextInput'
import { commitFromNewTodoField } from '../todo-input/effects'

/**
 * The new-todo field and the title above it. What an empty commit means here -
 * refuse it, and ask for nothing at all - is `src/todo-input/effects.ts`'s
 * answer rather than a `length` test in this file, because the edit field asks
 * the same question and is answered the other way.
 */
const Header: React.FunctionComponent<HeaderProps> = ({ addTodo }) => (
  <header className="header">
    <h1>todos</h1>
    <TodoTextInput
      newTodo
      onSave={(text) => {
        const commit = commitFromNewTodoField(text)
        if (commit.kind === 'add') addTodo(commit.text)
      }}
      placeholder="What needs to be done?"
    />
  </header>
)

export interface HeaderProps {
  addTodo(text: string): void
}
export default Header
