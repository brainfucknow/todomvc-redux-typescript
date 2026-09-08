/**
 * What a todo text field hands on, and when. features/todo-input-commits.feature
 * asks these questions; `src/components/TodoTextInput.tsx` is the adapter that
 * turns a React event into one of them and does what the answer says.
 *
 * Two fields ask the same questions and get different answers: the new-todo
 * field a todo is typed into, and the edit field an existing todo's text is
 * changed in. Which one is asking is an argument, so neither the difference nor
 * its shape lives in a component.
 *
 * The field decides nothing about emptiness - it commits what these rules give
 * it, empty or not, and `./effects` decides what that means. Clearing follows
 * from which field it is, not from whether the commit will be accepted.
 *
 * Enter trims and losing focus does not. That asymmetry is current behavior,
 * recorded as observed rather than intended: task 11's specifier note and the
 * project manager's ruling both say a fix is a behavior change, and this module
 * preserves it exactly.
 */

/** The two fields, each a text field of its own with its own answers. */
export type FieldKind = 'new-todo' | 'edit'

/**
 * What a field hands on, and whether handing it on empties the field. A rule
 * answers `null` when nothing is committed and the field is left as it is.
 */
export interface FieldCommit {
  readonly text: string
  readonly clearsField: boolean
}

/** The one key that commits. No other key does anything, in either field. */
const COMMIT_KEY = 'Enter'

/** What a field put on screen for the given text starts out holding. */
export function openingText(text?: string): string {
  return text ?? ''
}

/** Enter commits the trimmed text; only the new-todo field is then cleared. */
export function commitOnKey(
  field: FieldKind,
  held: string,
  key: string,
): FieldCommit | null {
  if (key !== COMMIT_KEY) return null
  return { text: held.trim(), clearsField: field === 'new-todo' }
}

/** Losing focus commits the edit field untrimmed, and the new-todo field not at all. */
export function commitOnBlur(
  field: FieldKind,
  held: string,
): FieldCommit | null {
  if (field === 'new-todo') return null
  return { text: held, clearsField: false }
}
