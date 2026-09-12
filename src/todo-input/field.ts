export type FieldKind = 'new-todo' | 'edit'

export interface FieldCommit {
  readonly text: string
  readonly clearsField: boolean
}

const COMMIT_KEY = 'Enter'

export function openingText(text?: string): string {
  return text ?? ''
}

// Enter trims the committed text and losing focus does not: specified behavior, not an oversight.
export function commitOnKey(
  field: FieldKind,
  held: string,
  key: string,
): FieldCommit | null {
  if (key !== COMMIT_KEY) return null
  return { text: held.trim(), clearsField: field === 'new-todo' }
}

export function commitOnBlur(
  field: FieldKind,
  held: string,
): FieldCommit | null {
  if (field === 'new-todo') return null
  return { text: held, clearsField: false }
}
