// The CRAP gate: run the tiers that measure coverage, score every measured
// function, and fail when one is over the gate.
//
//   node scripts/crap.mjs [--max <n>] [--reuse] [--all] [<path> ...]
//
// Coverage is the union of every tier that measures it, so a function scores on
// all the tests that exercise it, not on whichever tier happened to run. Paths
// restrict the gate to the files under them; without any, every measured file
// is gated. Only functions over the gate are listed unless --all is given.
// --reuse reads the reports the tiers left behind instead of running them again.
//
// This file is the shell: it runs the tiers, reads their reports and the
// sources, writes the lines and picks the exit code. What it decides on the way
// is in ./crap/, where the test tiers can reach it.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { complexityByFunction } from './crap/complexity.ts'
import { mergeReports } from './crap/coverage.ts'
import { readOptions } from './crap/options.ts'
import { gateReport } from './crap/report.ts'
import { scoreFunctions } from './crap/score.ts'
import { MEASURING_TIERS, reportDirectory, reportFile } from './crap/tiers.ts'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const vitest = join(projectRoot, 'node_modules', 'vitest', 'vitest.mjs')

const runTier = (tier) => {
  execFileSync(
    process.execPath,
    [
      vitest,
      'run',
      '--config',
      tier.config,
      '--coverage.enabled',
      `--coverage.reportsDirectory=${join(projectRoot, reportDirectory(tier))}`,
    ],
    { cwd: projectRoot, stdio: 'inherit' },
  )
}

const readTierReport = (tier) => {
  const report = join(projectRoot, reportFile(tier))
  if (!existsSync(report)) {
    throw new Error(`no ${tier.name}-tier coverage report at ${report}`)
  }
  return JSON.parse(readFileSync(report, 'utf8'))
}

const measureFile = ({ filePath, statements }) => ({
  file: relative(projectRoot, filePath),
  functions: scoreFunctions(
    complexityByFunction(filePath, readFileSync(filePath, 'utf8')),
    statements,
  ),
})

function run(argv) {
  const options = readOptions(argv)
  if (!options.reuse) {
    MEASURING_TIERS.forEach(runTier)
  }
  const measured = mergeReports(MEASURING_TIERS.map(readTierReport)).map(measureFile)
  const tierNames = MEASURING_TIERS.map((tier) => tier.name)
  const { lines, overGate } = gateReport(measured, options, tierNames)
  process.stdout.write(`${lines.join('\n')}\n`)
  return overGate === 0 ? 0 : 1
}

try {
  process.exit(run(process.argv.slice(2)))
} catch (failure) {
  process.stderr.write(`${failure.message}\n`)
  process.exit(2)
}
