// Specified asymmetry: an empty commit is refused in the new-todo field and deletes the todo in the edit field.
export type NewTodoCommit =
  { readonly kind: 'add'; readonly text: string } | { readonly kind: 'refuse' }

export type TodoChange =
  | { readonly kind: 'edit'; readonly id: number; readonly text: string }
  | { readonly kind: 'delete'; readonly id: number }

export interface EditCommit {
  readonly change: TodoChange
  readonly closesEditor: boolean
}

export function commitFromNewTodoField(text: string): NewTodoCommit {
  return isEmpty(text) ? { kind: 'refuse' } : { kind: 'add', text }
}

export function commitFromEditField(id: number, text: string): EditCommit {
  return {
    change: isEmpty(text) ? { kind: 'delete', id } : { kind: 'edit', id, text },
    closesEditor: true,
  }
}

function isEmpty(text: string): boolean {
  return text.length === 0
}
