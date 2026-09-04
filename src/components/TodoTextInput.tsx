import React, { PureComponent } from 'react'
import classnames from 'classnames'
export interface TodoTextInputProps {
  onSave(text: string): void
  text?: string
  placeholder?: string
  editing?: boolean
  newTodo?: boolean
}
interface TodoTextInputState {
  text: string
}

export default class TodoTextInput extends PureComponent<
  TodoTextInputProps,
  TodoTextInputState
> {
  state = {
    text: this.props.text || '',
  }

  handleSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const text = (e.target as HTMLInputElement).value.trim()
    if (e.which === 13) {
      this.props.onSave(text)
      if (this.props.newTodo) {
        this.setState({ text: '' })
      }
    }
  }

  handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ text: e.target.value })
  }

  handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!this.props.newTodo) {
      this.props.onSave(e.target.value)
    }
  }

  render() {
    return (
      <input
        className={classnames({
          edit: this.props.editing,
          'new-todo': this.props.newTodo,
        })}
        type="text"
        placeholder={this.props.placeholder}
        // Dropping autoFocus moves where the caret lands when the input
        // appears, both for the new-todo field and for an item opened for
        // editing. That is a behavior change, which task 06 puts out of scope.
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={true}
        value={this.state.text}
        onBlur={this.handleBlur}
        onChange={this.handleChange}
        onKeyDown={this.handleSubmit}
      />
    )
  }
}
