/**
 * What the acceptance runner adapter decides, apart from the process that spawns
 * Vitest, so a test can drive the decisions. The protocol is APS mutator-spec.md,
 * "Runner Adapter":
 *
 *   in   {"id","feature_json","generated_dir","work_dir","timeout"}
 *   out  {"id","outcome","output","error","duration"}
 *
 * The mutator reads the outcome, not the exit code, and Vitest exits 1 both for a
 * failing test and for finding no test to run - so a kill requires the run's own
 * report of a test that ran and failed.
 */

/** @typedef {'test_success' | 'test_failure' | 'infrastructure_error'} Outcome */

export const TEST_SUCCESS = 'test_success'
/** Kills the mutation. */
export const TEST_FAILURE = 'test_failure'
/** The tests could not be run, or their result could not be read. */
export const INFRASTRUCTURE_ERROR = 'infrastructure_error'

/**
 * @typedef {object} Job
 * @property {string} id
 * @property {string} featureJson the IR the generated tests are to run against
 * @property {string} [generatedDir] the generated tests to run, when not the default
 * @property {number} [timeoutMs]
 */

/**
 * A run that finished, or failed to.
 *
 * @typedef {object} FinishedRun
 * @property {number | null} [status]
 * @property {NodeJS.Signals | null} [signal]
 * @property {Error} [error]
 */

/**
 * What Vitest's JSON reporter said the run ran.
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
 * A line that is not readable JSON, or names no IR, is refused rather than run.
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
 * A report missing any of the three counts is no report: guessing at one is how a
 * run that never happened reads as a result.
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
 * A run is a test result only when it says which tests it ran: matching no test
 * file exits 1 exactly as a failing test does, and calling that a `test_failure`
 * would report every mutant killed while executing nothing.
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
 * Everything but the id and the outcome defaults, so a refusal names only what it
 * knows.
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
 * No default entry: the pattern below admits only these suffixes or none, so an
 * unreachable fallback would hide which unit a bare number is read as.
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
