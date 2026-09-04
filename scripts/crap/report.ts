// How a run of the gate reads, and whether it passed.
import { isGated, type Options } from './options.ts'
import type { FunctionScore } from './score.ts'

export type MeasuredFile = {
  file: string
  functions: FunctionScore[]
}

export type GateReport = {
  lines: string[]
  overGate: number
}

const formatRow = (file: string, entry: FunctionScore): string => [
  `${file}:${entry.line}`.padEnd(52),
  entry.name.padEnd(24),
  `cc ${String(entry.complexity).padStart(3)}`,
  `cov ${(entry.coverage * 100).toFixed(0).padStart(3)}%`,
  `crap ${entry.crap.toFixed(1).padStart(7)}`,
].join('  ')

const summary = (
  gated: MeasuredFile[],
  max: number,
  tiers: string[],
  overGate: number,
): string => {
  const functions = gated.reduce((total, entry) => total + entry.functions.length, 0)
  return `\ngate CRAP <= ${max} | tiers: ${tiers.join(' + ')} | ` +
    `files: ${gated.length} | functions: ${functions} | over the gate: ${overGate}`
}

// Worst first within a file, files in path order. Only the functions over the
// gate are listed unless every one was asked for.
export function gateReport(
  measured: MeasuredFile[],
  options: Options,
  tiers: string[],
): GateReport {
  const gated = measured
    .filter((entry) => isGated(entry.file, options.paths))
    .sort((left, right) => left.file.localeCompare(right.file))

  if (gated.length === 0) {
    throw new Error(`no measured files under ${options.paths.join(', ') || 'the project'}`)
  }

  const isOverGate = (entry: FunctionScore): boolean => entry.crap > options.max
  const offenders = gated.flatMap(({ functions }) => functions.filter(isOverGate))
  const lines = gated.flatMap(({ file, functions }) => functions
    .filter((entry) => options.all || isOverGate(entry))
    .sort((left, right) => right.crap - left.crap)
    .map((entry) => formatRow(file, entry)))

  return {
    lines: [...lines, summary(gated, options.max, tiers, offenders.length)],
    overGate: offenders.length,
  }
}
