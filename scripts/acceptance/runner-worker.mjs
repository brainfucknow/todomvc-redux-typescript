import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { ROOT } from './aps.mjs'

/**
 * The runner adapter APS `gherkin-mutator` drives (mutator-spec.md, "Runner
 * Adapter"): a persistent worker that reads one JSON job per stdin line and
 * writes one JSON response per stdout line.
 *
 *   in   {"id","feature_json","generated_dir","work_dir","timeout"}
 *   out  {"id","outcome","output","error","duration"}
 *
 * A job runs the already-generated entry points against the IR the job names,
 * which is what $ACCEPTANCE_IR is for - nothing is regenerated per mutation.
 *
 *   test_success          the generated tests ran and passed
 *   test_failure          they ran and failed, which kills the mutation
 *   infrastructure_error  they could not be run or evaluated
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
 * @returns {{id: string, outcome: string, output: string, error: string, duration: number}}
 */
function respond(line) {
  /** @type {{id?: string, feature_json?: string, generated_dir?: string, timeout?: string}} */
  let job = {}
  try {
    job = JSON.parse(line)
  } catch {
    return report('', 'infrastructure_error', '', `unreadable job: ${line}`, 0)
  }

  const id = job.id ?? ''
  if (!job.feature_json) {
    return report(id, 'infrastructure_error', '', 'job has no feature_json', 0)
  }
  if (!existsSync(VITEST)) {
    return report(id, 'infrastructure_error', '', `no vitest at ${VITEST}`, 0)
  }

  const started = process.hrtime.bigint()
  const run = spawnSync(
    process.execPath,
    [VITEST, 'run', '--config', 'vitest.acceptance.config.mts'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: milliseconds(job.timeout),
      env: {
        ...process.env,
        ACCEPTANCE_IR: job.feature_json,
        ...(job.generated_dir
          ? { ACCEPTANCE_GENERATED_DIR: job.generated_dir }
          : {}),
      },
    },
  )
  const duration = Number(process.hrtime.bigint() - started)
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`

  if (run.error) {
    return report(
      id,
      'infrastructure_error',
      output,
      run.error.message,
      duration,
    )
  }
  if (run.signal) {
    return report(
      id,
      'infrastructure_error',
      output,
      `killed by ${run.signal}`,
      duration,
    )
  }
  if (run.status === 0) return report(id, 'test_success', output, '', duration)
  if (run.status === 1) return report(id, 'test_failure', output, '', duration)
  return report(
    id,
    'infrastructure_error',
    output,
    `vitest exited ${run.status}`,
    duration,
  )
}

/**
 * @param {string} id
 * @param {string} outcome
 * @param {string} output
 * @param {string} error
 * @param {number} duration nanoseconds
 */
function report(id, outcome, output, error, duration) {
  return { id, outcome, output, error, duration }
}

/**
 * @param {string | undefined} timeout APS duration, e.g. "30s"
 * @returns {number | undefined} milliseconds
 */
function milliseconds(timeout) {
  const match = /^(\d+(?:\.\d+)?)(ms|s|m)?$/.exec(timeout ?? '')
  if (!match) return undefined
  const scale = { ms: 1, s: 1000, m: 60000 }[match[2] ?? 's'] ?? 1000
  return Number(match[1]) * scale
}
