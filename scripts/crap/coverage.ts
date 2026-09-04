// The union of the coverage the tiers report, keyed by source location.
import type { Position } from './complexity.ts'

export type Statement = {
  start: Position
  end: Position
  hits: number
}

export type FileStatements = {
  filePath: string
  statements: Statement[]
}

// The shape istanbul writes to coverage-final.json, of which the gate reads
// only the statement map and the per-statement hit counts.
export type CoverageReport = Record<string, {
  statementMap: Record<string, { start: Position; end: Position }>
  s: Record<string, number>
}>

const statementsOf = (report: CoverageReport): FileStatements[] =>
  Object.entries(report).map(([filePath, fileCoverage]) => ({
    filePath,
    statements: Object.entries(fileCoverage.statementMap).map(([id, location]) => ({
      start: location.start,
      end: location.end,
      hits: fileCoverage.s[id],
    })),
  }))

// Istanbul numbers statements per report, so the same statement can hold
// different ids in two reports. Its location is what identifies it across them.
const statementKey = ({ start, end }: Statement): string =>
  `${start.line}:${start.column}-${end.line}:${end.column}`

// A statement is covered when any tier covered it, so a function the property
// tier exercises completely does not read as untested because the unit tier
// never called it.
export function mergeReports(reports: CoverageReport[]): FileStatements[] {
  const files = new Map<string, Map<string, Statement>>()
  for (const { filePath, statements } of reports.flatMap(statementsOf)) {
    const merged = files.get(filePath) ?? new Map<string, Statement>()
    files.set(filePath, merged)
    for (const statement of statements) {
      const key = statementKey(statement)
      const hits = (merged.get(key)?.hits ?? 0) + statement.hits
      merged.set(key, { ...statement, hits })
    }
  }
  return [...files].map(([filePath, merged]) => ({
    filePath,
    statements: [...merged.values()],
  }))
}
