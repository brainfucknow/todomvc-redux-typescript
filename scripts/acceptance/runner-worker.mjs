import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { ROOT } from './aps.mjs'
import {
  INFRASTRUCTURE_ERROR,
  classifyRun,
  readJob,
  response,
} from './runner-protocol.mjs'

/**
 * The runner adapter APS `gherkin-mutator` drives (mutator-spec.md, "Runner
 * Adapter"): a persistent worker that reads one JSON job per stdin line and
 * writes one JSON response per stdout line. What a line and a finished run
 * mean is `runner-protocol.mjs`; this file is the process around it.
 *
 * A job runs the already-generated entry points against the IR the job names,
 * which is what $ACCEPTANCE_IR is for - nothing is regenerated per mutation.
 *
 * Stdout carries protocol lines only. Everything else goes to stderr.
 *
 * Start it with: gherkin-mutator --runner-worker "node scripts/acceptance/runner-worker.mjs"
 */

const VITEST = join(ROOT, 'node_modules/vitest/vitest.mjs')

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

  const started = process.hrtime.bigint()
  const run = spawnSync(
    process.execPath,
    [VITEST, 'run', '--config', 'vitest.acceptance.config.mts'],
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
  const { outcome, error } = classifyRun(run)

  return response({
    id: job.id,
    outcome,
    output: `${run.stdout ?? ''}${run.stderr ?? ''}`,
    error,
    duration: Number(process.hrtime.bigint() - started),
  })
}
