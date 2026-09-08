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
 * reports a score it never measured. Vitest's exit code cannot answer that on
 * its own - it exits 1 both for a failing test and for finding no test file to
 * run - so the run's own report of what it ran is read alongside it, and a
 * kill requires a test that ran and failed.
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
 * What a run reported having run, from Vitest's JSON reporter. A mutation is
 * killed by a test, so how many there were is part of what the run means.
 *
 * @typedef {object} RunReport
 * @property {number} ran tests that executed
 * @property {number} failed of those, how many failed
 * @property {number} files test files the run collected
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
 * What Vitest's JSON reporter wrote, as counts. A report missing any of the
 * three counts is no report: reading a run needs all of them, and guessing at
 * a missing one is how a run that never happened reads as a result.
 *
 * @param {string} json
 * @returns {RunReport | undefined}
 */
export function readRunReport(json) {
  let report
  try {
    report = JSON.parse(json)
  } catch {
    return undefined
  }

  const ran = report?.numTotalTests
  const failed = report?.numFailedTests
  const files = report?.testResults
  if (typeof ran !== 'number') return undefined
  if (typeof failed !== 'number') return undefined
  if (!Array.isArray(files)) return undefined

  return { ran, failed, files: files.length }
}

/**
 * What a finished run means. A run is a test result only when it says which
 * tests it ran: a run that matched no test file, or matched files that
 * declared no test, exits 1 exactly as a failing test run does, and calling
 * that a `test_failure` would report every mutant killed while executing
 * nothing.
 *
 * @param {FinishedRun} run
 * @param {RunReport | undefined} report what the run said it ran
 * @returns {{outcome: Outcome, error: string}}
 */
export function classifyRun(run, report) {
  if (run.error) return infrastructure(run.error.message)
  if (run.signal) return infrastructure(`killed by ${run.signal}`)
  if (run.status !== 0 && run.status !== 1) {
    return infrastructure(`vitest exited ${run.status}`)
  }
  if (!report) {
    return infrastructure(`vitest exited ${run.status} without a test report`)
  }
  if (report.ran === 0) return infrastructure(nothingRan(report))
  if (run.status === 0) return { outcome: TEST_SUCCESS, error: '' }
  if (report.failed === 0) {
    return infrastructure('vitest exited 1 with no failing test')
  }
  return { outcome: TEST_FAILURE, error: '' }
}

/**
 * @param {RunReport} report
 * @returns {string}
 */
function nothingRan({ files }) {
  if (files === 0) return 'no test files matched, so nothing ran'
  const plural = files === 1 ? 'file' : 'files'
  return `${files} test ${plural} matched, but no test ran`
}

/**
 * @param {string} error
 * @returns {{outcome: Outcome, error: string}}
 */
function infrastructure(error) {
  return { outcome: INFRASTRUCTURE_ERROR, error }
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
 * Milliseconds per unit, and the unit a bare number means. The regex above
 * admits only these three suffixes or none, so there is nothing else to fall
 * back to - a second default here would be unreachable, and an unreachable
 * default hides which unit a bare number is read as: with one in place,
 * defaulting to `s` and defaulting to nothing produce the same answer.
 *
 * @type {Record<string, number>}
 */
const SCALES = { ms: 1, s: 1000, m: 60000 }

/**
 * @param {string | undefined} timeout an APS duration, e.g. "30s"
 * @returns {number | undefined} milliseconds, or undefined when there is no
 *   readable duration to impose
 */
export function timeoutMilliseconds(timeout) {
  const match = /^(\d+(?:\.\d+)?)(ms|s|m)?$/.exec(timeout ?? '')
  if (!match) return undefined
  return Number(match[1]) * SCALES[match[2] ?? 's']
}
