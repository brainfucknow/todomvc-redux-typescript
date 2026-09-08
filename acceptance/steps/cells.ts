/**
 * How an examples cell is spelled, for the families that spell it the same way.
 *
 * What belongs here is a reading that asks one question no matter which feature
 * file asks it: a todo id, a count and an HTTP status are all "this cell is a
 * whole number", and the three families that read one had written the same six
 * lines three times.
 *
 * What deliberately stays out is the reading whose answer depends on the family.
 * `flag` in todo-api.ts admits `null` and `undefined` because those features
 * spell a missing flag; the `flag` in todo-state.ts takes `true` and `false`
 * only; `completedFlag` beside it reads the words `complete` and `active`.
 * Three parsers of one cell name, and task 10's cleaner left them apart on
 * purpose. Moving any of them here would merge vocabularies the specifier
 * separated - so this module holds the spellings the feature files share, and
 * nothing that one family means differently from another.
 */

/** A cell that spells a whole number: a todo id, a count, an HTTP status. */
export function wholeNumber(cell: string): number {
  if (!/^-?\d+$/.test(cell)) {
    throw new Error(`Not a whole number: ${cell}`)
  }
  return Number(cell)
}

/**
 * A text cell: JSON, quotes included, so that surrounding spaces are visible in
 * the feature file and survive a parser that trims the cell around them.
 */
export function text(cell: string): string {
  let value: unknown
  try {
    value = JSON.parse(cell)
  } catch {
    throw new Error(`Not a text: ${cell}`)
  }
  if (typeof value !== 'string') throw new Error(`Not a text: ${cell}`)
  return value
}

/** The same, plus the bare word for a field opened on no text at all. */
export function textOrNothing(cell: string): string | undefined {
  return cell === 'undefined' ? undefined : text(cell)
}
