// The mutation runner adapter's half of the worker protocol
// (mutator-spec.md, "Runner Adapter"): what a job says, what an answer looks
// like, and how a finished test run is classified. The worker around this
// reaches the filesystem and starts the test runner; every judgment it makes
// about a job lives here, where a test can ask about it.

export type Job = {
  id: string
  feature_json: string
  generated_dir: string
  work_dir?: string
  timeout?: string
}

export type Outcome = 'test_success' | 'test_failure' | 'infrastructure_error'

export type Completion = {
  exitCode: number | null
  output: string
  failure?: string
}

const DURATION = /^(\d+(?:\.\d+)?)(ms|s|m)$/
const SCALE = { ms: 1, s: 1_000, m: 60_000 }

export function jobTimeout(duration: string | undefined): number | undefined {
  const parsed = duration === undefined ? null : DURATION.exec(duration)
  if (!parsed) {
    return undefined
  }
  return Number(parsed[1]) * SCALE[parsed[2] as keyof typeof SCALE]
}

// A run that never reached a verdict is an error, not a surviving mutation:
// reporting it as `test_success` would record a mutant as survived on the
// strength of a test run that did not happen.
export function classify(completion: Completion): { outcome: Outcome; output: string; error: string } {
  if (completion.failure !== undefined || completion.exitCode === null) {
    return {
      outcome: 'infrastructure_error',
      output: completion.output,
      error: completion.failure ?? 'the test run was terminated before it reported',
    }
  }
  return {
    outcome: completion.exitCode === 0 ? 'test_success' : 'test_failure',
    output: completion.output,
    error: '',
  }
}

export function responseLine(
  id: string,
  result: { outcome: Outcome; output: string; error: string },
  durationNanoseconds: number,
): string {
  return `${JSON.stringify({
    id,
    outcome: result.outcome,
    output: result.output,
    error: result.error,
    duration: durationNanoseconds,
  })}\n`
}
