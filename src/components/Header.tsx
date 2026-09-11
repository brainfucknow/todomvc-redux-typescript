import React from 'react'
import TodoTextInput from './TodoTextInput'
import { commitFromNewTodoField } from '../todo-input/effects'

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
