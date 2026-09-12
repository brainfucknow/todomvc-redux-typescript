import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { ROOT } from './aps.mjs'
import {
  INFRASTRUCTURE_ERROR,
  classifyRun,
  readJob,
  readRunReport,
  response,
} from './runner-protocol.mjs'

/**
 * The runner adapter APS `gherkin-mutator` drives (mutator-spec.md, "Runner
 * Adapter"): the process around `runner-protocol.mjs`, which is what decides.
 * Stdout carries protocol lines only; everything else goes to stderr.
 *
 * A job runs the already-generated entry points against the IR it names, so
 * nothing is regenerated per mutation.
 *
 * No single job can tell whether the run as a whole is configured right - the
 * worker is never told which IR is the unmutated one. The mutation procedure asks
 * that separately, by requiring `test_success` against the original IR first.
 *
 * Start it with: gherkin-mutator --runner-worker "node scripts/acceptance/runner-worker.mjs"
 */

const VITEST = join(ROOT, 'node_modules/vitest/vitest.mjs')

let jobsRun = 0

createInterface({ input: process.stdin }).on('line', (line) => {
  if (line.trim() === '') return
  process.stdout.write(`${JSON.stringify(respond(line))}\n`)
})

/**
 * @param {string} line
 * @returns {ReturnType<typeof response>}
 */
function respond(line) {
  const read = readJob(line)
  if (!read.ok) {
    return response({
      id: read.id,
      outcome: INFRASTRUCTURE_ERROR,
      error: read.error,
    })
  }

  const { job } = read
  if (!existsSync(VITEST)) {
    return response({
      id: job.id,
      outcome: INFRASTRUCTURE_ERROR,
      error: `no vitest at ${VITEST}`,
    })
  }

  const reportPath = join(
    tmpdir(),
    `aps-runner-${process.pid}-${++jobsRun}.json`,
  )
  const started = process.hrtime.bigint()
  const run = spawnSync(
    process.execPath,
    [
      VITEST,
      'run',
      '--config',
      'vitest.acceptance.config.mts',
      '--reporter=default',
      '--reporter=json',
      `--outputFile.json=${reportPath}`,
    ],
    {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: job.timeoutMs,
      env: {
        ...process.env,
        ACCEPTANCE_IR: job.featureJson,
        ...(job.generatedDir
          ? { ACCEPTANCE_GENERATED_DIR: job.generatedDir }
          : {}),
      },
    },
  )
  const { outcome, error } = classifyRun(run, takeReport(reportPath))

  return response({
    id: job.id,
    outcome,
    output: `${run.stdout ?? ''}${run.stderr ?? ''}`,
    error,
    duration: Number(process.hrtime.bigint() - started),
  })
}

/**
 * @param {string} reportPath
 * @returns {ReturnType<typeof readRunReport>} what the run said it ran, if it
 *   left a readable report behind
 */
function takeReport(reportPath) {
  try {
    return readRunReport(readFileSync(reportPath, 'utf8'))
  } catch {
    return undefined
  } finally {
    rmSync(reportPath, { force: true })
  }
}
