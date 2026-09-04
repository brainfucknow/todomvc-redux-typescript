// The stamp a mutation runner writes beside its manifest, and what it takes to
// believe one.
//
// A runner reuses recorded results only while the fingerprint it stamped still
// matches the project in front of it. Everything about that record is here: the
// field it is written under, the version that field is read at, when a stamp
// counts as a match, and when a run has earned the right to write one.

export type Stamp = {
  field: string
  version: number
}

// One stamp per runner. The version travels with the field, so widening what a
// fingerprint covers is a version bump away from re-testing everything once,
// rather than reusing results the new fingerprint was never compared against.
export const ACCEPTANCE_IMPLEMENTATION: Stamp = { field: 'implementation_hash', version: 1 }
export const MUTATION_TIER: Stamp = { field: 'tier_hash', version: 1 }

const claimedHash = (stamp: Stamp, recorded: string): string | undefined => {
  const claim: Record<string, unknown> = JSON.parse(recorded)
  const hash = claim[stamp.field]
  return claim.version === stamp.version && typeof hash === 'string' ? hash : undefined
}

// No stamp yet, a stamp from another version of this runner, and a stamp
// missing the hash it was supposed to carry all mean the same thing: nothing
// recorded describes the project in front of us, so nothing may be reused.
export const resultsAreReusable = (
  stamp: Stamp,
  recorded: string | undefined,
  current: string,
): boolean => recorded !== undefined && claimedHash(stamp, recorded) === current

export const stampText = (stamp: Stamp, hash: string): string =>
  `${JSON.stringify({ version: stamp.version, [stamp.field]: hash }, null, 2)}\n`

// A runner rewrites its manifest whether the mutants survived or not, so a
// stamp follows a red run as readily as a green one. What must not be stamped
// is a run that never reached a verdict: a runner that could not be spawned, or
// that died on a signal, can leave a partial manifest behind, and stamping that
// would claim results this fingerprint never earned. `null` is the exit status
// of a process that did not exit on its own.
export const reachedVerdict = (statuses: (number | null)[]): boolean =>
  statuses.every((status) => status !== null)
