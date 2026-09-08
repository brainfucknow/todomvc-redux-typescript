/**
 * What the acceptance runner adapter decides, kept apart from the process that
 * runs the tests so a test can drive the decisions - the same split as
 * `typecheck.mjs` and the gate it imports. Reading a job line, classifying a
 * finished run, and reading an APS duration are decisions; spawning Vitest is
 * not, and stays in `runner-worker.mjs`.
 *
 * The protocol is APS mutator-spec.md, "Runner Adapter":
 *
 *   in   {"id","feature_json","generated_dir","work_dir","timeout"}
 *   out  {"id","outcome","output","error","duration"}
 *
 * The mutator reads the outcome, not the exit code: `test_failure` is what
 * kills a mutation, so mistaking one outcome for another is how a mutation run
 * reports a score it never measured.
 */

/** @typedef {'test_success' | 'test_failure' | 'infrastructure_error'} Outcome */

/** The tests ran and passed. */
export const TEST_SUCCESS = 'test_success'
/** The tests ran and failed, which kills the mutation. */
export const TEST_FAILURE = 'test_failure'
/** They could not be run, or their result could not be read. */
export const INFRASTRUCTURE_ERROR = 'infrastructure_error'

/**
 * One job to run, as the worker needs it.
 *
 * @typedef {object} Job
 * @property {string} id
 * @property {string} featureJson the IR the generated tests are to run against
 * @property {string} [generatedDir] the generated tests to run, when not the default
 * @property {number} [timeoutMs]
 */

/**
 * A run that finished, or failed to. `spawnSync` returns more than this; a
 * test's stand-in supplies less.
 *
 * @typedef {object} FinishedRun
 * @property {number | null} [status]
 * @property {NodeJS.Signals | null} [signal]
 * @property {Error} [error]
 */

/**
 * @typedef {{ok: true, job: Job}} JobRead
 * @typedef {{ok: false, id: string, error: string}} JobRefused
 */

/**
 * One line of the mutator's input. A line that is not readable JSON, or that
 * names no IR to run against, is refused rather than run.
 *
 * @param {string} line
 * @returns {JobRead | JobRefused}
 */
export function readJob(line) {
  let job
  try {
    job = JSON.parse(line)
  } catch {
    return { ok: false, id: '', error: `unreadable job: ${line}` }
  }

  const id = job.id ?? ''
  if (!job.feature_json) {
    return { ok: false, id, error: 'job has no feature_json' }
  }

  return {
    ok: true,
    job: {
      id,
      featureJson: job.feature_json,
      generatedDir: job.generated_dir,
      timeoutMs: timeoutMilliseconds(job.timeout),
    },
  }
}

/**
 * What a finished run means. Only the two exit codes Vitest uses to report on
 * tests are read as a test result; anything else is infrastructure, including
 * a run that was killed before it could report.
 *
 * @param {FinishedRun} run
 * @returns {{outcome: Outcome, error: string}}
 */
export function classifyRun(run) {
  if (run.error) {
    return { outcome: INFRASTRUCTURE_ERROR, error: run.error.message }
  }
  if (run.signal) {
    return { outcome: INFRASTRUCTURE_ERROR, error: `killed by ${run.signal}` }
  }
  if (run.status === 0) return { outcome: TEST_SUCCESS, error: '' }
  if (run.status === 1) return { outcome: TEST_FAILURE, error: '' }
  return { outcome: INFRASTRUCTURE_ERROR, error: `vitest exited ${run.status}` }
}

/**
 * One response line's fields. Everything but the id and the outcome has a
 * default, so a refusal names only what it knows.
 *
 * @param {object} fields
 * @param {string} fields.id
 * @param {Outcome} fields.outcome
 * @param {string} [fields.output]
 * @param {string} [fields.error]
 * @param {number} [fields.duration] nanoseconds
 * @returns {{id: string, outcome: Outcome, output: string, error: string, duration: number}}
 */
export function response({
  id,
  outcome,
  output = '',
  error = '',
  duration = 0,
}) {
  return { id, outcome, output, error, duration }
}

/**
 * @param {string | undefined} timeout an APS duration, e.g. "30s"
 * @returns {number | undefined} milliseconds, or undefined when there is no
 *   readable duration to impose
 */
export function timeoutMilliseconds(timeout) {
  const match = /^(\d+(?:\.\d+)?)(ms|s|m)?$/.exec(timeout ?? '')
  if (!match) return undefined
  const scale = { ms: 1, s: 1000, m: 60000 }[match[2] ?? 's'] ?? 1000
  return Number(match[1]) * scale
}
