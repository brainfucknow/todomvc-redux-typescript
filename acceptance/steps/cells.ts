// Only the readings every family spells the same way. A cell one family means
// differently from another - each `flag` below - stays in that family's file, or the
// vocabularies the specifier separated would merge.

export function wholeNumber(cell: string): number {
  if (!/^-?\d+$/.test(cell)) {
    throw new Error(`Not a whole number: ${cell}`)
  }
  return Number(cell)
}

// Quotes included, so surrounding spaces survive a parser that trims the cell.
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

export function textOrNothing(cell: string): string | undefined {
  return cell === 'undefined' ? undefined : text(cell)
}
