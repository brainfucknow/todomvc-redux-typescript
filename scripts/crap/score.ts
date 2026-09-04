// CRAP = cc^2 * (1 - coverage)^3 + cc, per function.
import type { FunctionComplexity, Position, Span } from './complexity.ts'
import type { Statement } from './coverage.ts'

export type FunctionScore = {
  name: string
  line: number
  complexity: number
  coverage: number
  crap: number
}

const contains = (span: Span, position: Position): boolean => {
  const afterStart = position.line > span.start.line ||
    (position.line === span.start.line && position.column >= span.start.column)
  const beforeEnd = position.line < span.end.line ||
    (position.line === span.end.line && position.column <= span.end.column)
  return afterStart && beforeEnd
}

const spanSize = (span: Span): number =>
  (span.end.line - span.start.line) * 1e6 + span.end.column

const innermostContaining = <Scoped extends { span: Span }>(
  candidates: Scoped[],
  position: Position,
): Scoped | undefined => candidates
  .filter((candidate) => contains(candidate.span, position))
  .sort((left, right) => spanSize(left.span) - spanSize(right.span))[0]

const crapOf = (complexity: number, coverage: number): number =>
  complexity ** 2 * (1 - coverage) ** 3 + complexity

// A statement counts towards the innermost function containing it. A function
// holding no measured statement is scored as covered: there is nothing in it
// the tests could have failed to reach.
export function scoreFunctions(
  functions: FunctionComplexity[],
  statements: Statement[],
): FunctionScore[] {
  const tallied = functions.map((entry) => ({ ...entry, total: 0, covered: 0 }))

  for (const { start, hits } of statements) {
    const owner = innermostContaining(tallied, start)
    if (!owner) {
      continue
    }
    owner.total += 1
    owner.covered += hits > 0 ? 1 : 0
  }

  return tallied.map(({ name, span, complexity, total, covered }) => {
    const coverage = total === 0 ? 1 : covered / total
    return {
      name,
      line: span.start.line,
      complexity,
      coverage,
      crap: crapOf(complexity, coverage),
    }
  })
}
