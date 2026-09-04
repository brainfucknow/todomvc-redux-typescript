import React from 'react'
import TodoTextInput from './TodoTextInput'

const Header: React.FunctionComponent<HeaderProps> = ({
  addTodo,
}: HeaderProps) => (
  <header className="header">
    <h1>todos</h1>
    <TodoTextInput
      newTodo
      onSave={(text) => {
        if (text.length !== 0) {
          addTodo(text)
        }
      }}
      placeholder="What needs to be done?"
    />
  </header>
)

export interface HeaderProps {
  addTodo(text: string): void
}
export default Header
