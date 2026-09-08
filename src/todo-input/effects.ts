/**
 * What a committed text does. `./field` stops at the text a field hands on;
 * this module starts there, and features/todo-input-effects.feature asks it.
 * `src/components/Header.tsx` and `src/components/TodoItem.tsx` are the two
 * adapters: each asks its own question and performs the answer.
 *
 * One text, two answers, and that is why both callers ask here. An empty commit
 * from the new-todo field is refused and nothing is asked for; an empty commit
 * from the edit field deletes the todo. Neither answer is derived from the
 * other, and a component holding one of them would hide the asymmetry.
 *
 * Emptiness is length, not blankness: nothing here trims, so a text of spaces
 * is a text. A field of spaces reaches this module as the empty string only
 * when Enter trimmed it first, which is `./field`'s rule and not this one's.
 */

/** What the new-todo field's text asks for. */
export type NewTodoCommit =
  { readonly kind: 'add'; readonly text: string } | { readonly kind: 'refuse' }

/** What the edit field's text asks for: the todo is changed one way or the other. */
export type TodoChange =
  | { readonly kind: 'edit'; readonly id: number; readonly text: string }
  | { readonly kind: 'delete'; readonly id: number }

/** A commit from the edit field: what it changes, and what it leaves behind. */
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
