/**
 * A property runner, small enough to own rather than install: a suite that only
 * runs after an unrecorded `npm install` is a gate nobody can run.
 *
 * The seed is fixed unless $PROPERTY_SEED says otherwise, so a red run is red
 * again rather than flickering; the cost is a fixed sample, widened by passing a
 * seed or raising `runs`.
 */

export interface Arbitrary<T> {
  generate(random: () => number): T
  /** Most aggressive first; empty when nothing is simpler. */
  shrink(value: T): T[]
}

export interface PropertyOptions {
  runs?: number
  seed?: number
  shrinks?: number
}

export type Property<T> = (value: T) => void | Promise<void>

const DEFAULT_SEED = 20260908
const DEFAULT_RUNS = 200
const DEFAULT_SHRINKS = 200

/** Rejects with the shrunk counterexample, the case number and the seed. */
export async function forAll<T>(
  arbitrary: Arbitrary<T>,
  property: Property<T>,
  options: PropertyOptions = {},
): Promise<void> {
  const seed = options.seed ?? environmentSeed() ?? DEFAULT_SEED
  const runs = options.runs ?? DEFAULT_RUNS
  const random = randomFrom(seed)

  for (let run = 1; run <= runs; run += 1) {
    const value = arbitrary.generate(random)
    const failure = await failureOf(property, value)
    if (failure) {
      throw await report(
        arbitrary,
        property,
        value,
        failure,
        run,
        seed,
        options,
      )
    }
  }
}

/** Throws when `forAll` passed, which is the failure this is looking for. */
export async function failureFrom(run: () => Promise<void>): Promise<Error> {
  try {
    await run()
  } catch (failure) {
    return failure instanceof Error ? failure : new Error(String(failure))
  }
  throw new Error('Expected the property to fail, and it passed')
}

async function report<T>(
  arbitrary: Arbitrary<T>,
  property: Property<T>,
  value: T,
  failure: Error,
  run: number,
  seed: number,
  options: PropertyOptions,
): Promise<Error> {
  const simplest = await shrink(arbitrary, property, value, options)
  const shrunk = simplest.value === value ? '' : ` (shrunk from ${show(value)})`
  return new Error(
    [
      `Property failed on case ${run} of ${options.runs ?? DEFAULT_RUNS} (seed ${seed}).`,
      `Counterexample: ${show(simplest.value)}${shrunk}`,
      `Cause: ${simplest.failure.message}`,
    ].join('\n'),
  )
}

async function shrink<T>(
  arbitrary: Arbitrary<T>,
  property: Property<T>,
  value: T,
  options: PropertyOptions,
): Promise<{ value: T; failure: Error }> {
  let current = value
  let failure = (await failureOf(property, value)) as Error
  const budget = options.shrinks ?? DEFAULT_SHRINKS

  for (let step = 0; step < budget; step += 1) {
    const simpler = await firstFailing(arbitrary.shrink(current), property)
    if (!simpler) break
    current = simpler.value
    failure = simpler.failure
  }
  return { value: current, failure }
}

async function firstFailing<T>(
  candidates: T[],
  property: Property<T>,
): Promise<{ value: T; failure: Error } | undefined> {
  for (const value of candidates) {
    const failure = await failureOf(property, value)
    if (failure) return { value, failure }
  }
  return undefined
}

async function failureOf<T>(
  property: Property<T>,
  value: T,
): Promise<Error | undefined> {
  try {
    await property(value)
    return undefined
  } catch (failure) {
    return failure instanceof Error ? failure : new Error(String(failure))
  }
}

function environmentSeed(): number | undefined {
  const seed = Number(process.env.PROPERTY_SEED)
  return Number.isFinite(seed) && process.env.PROPERTY_SEED ? seed : undefined
}

/** mulberry32: small, fast, and the same sequence everywhere for a given seed. */
function randomFrom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let drawn = Math.imul(state ^ (state >>> 15), 1 | state)
    drawn = (drawn + Math.imul(drawn ^ (drawn >>> 7), 61 | drawn)) ^ drawn
    return ((drawn ^ (drawn >>> 14)) >>> 0) / 4294967296
  }
}

export function show(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value)
  if (value === undefined) return 'undefined'
  try {
    return JSON.stringify(value, (_, held: unknown) =>
      held === undefined ? '<undefined>' : held,
    )
  } catch {
    return String(value)
  }
}

// --- Arbitraries -----------------------------------------------------------

export function integer(low: number, high: number): Arbitrary<number> {
  return {
    generate: (random) => low + Math.floor(random() * (high - low + 1)),
    shrink: (value) =>
      [low, 0, Math.trunc(value / 2), value - 1].filter(
        (candidate) =>
          candidate >= low &&
          candidate <= high &&
          Math.abs(candidate) < Math.abs(value),
      ),
  }
}

export const boolean: Arbitrary<boolean> = {
  generate: (random) => random() < 0.5,
  shrink: (value) => (value ? [false] : []),
}

// What a JSON body has to survive. A generator of `[a-z]+` would pass a
// string-concatenating implementation.
const CHARACTERS = [
  ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,-_/',
  '"',
  '\\',
  '\n',
  '\t',
  '\r',
  '\0',
  '<',
  '>',
  '&',
  '{',
  '}',
  'é',
  'ß',
  'ø',
  'カ',
  '中',
  '🙂',
  '👩‍👩‍👧',
  '​',
  '',
]

export function text(maxLength = 24): Arbitrary<string> {
  return {
    generate: (random) => {
      const length = Math.floor(random() * (maxLength + 1))
      let drawn = ''
      for (let index = 0; index < length; index += 1) {
        drawn += CHARACTERS[Math.floor(random() * CHARACTERS.length)]
      }
      return drawn
    },
    shrink: (value) =>
      value === ''
        ? []
        : [
            '',
            value.slice(0, Math.floor(value.length / 2)),
            value.slice(1),
            value.slice(0, -1),
          ].filter((candidate) => candidate.length < value.length),
  }
}

export function elementOf<T>(values: readonly T[]): Arbitrary<T> {
  return {
    generate: (random) => values[Math.floor(random() * values.length)],
    shrink: (value) => values.slice(0, values.indexOf(value)),
  }
}

export function tuple<T extends unknown[]>(
  ...arbitraries: { [K in keyof T]: Arbitrary<T[K]> }
): Arbitrary<T> {
  return {
    generate: (random) =>
      arbitraries.map((arbitrary) => arbitrary.generate(random)) as T,
    shrink: (value) =>
      arbitraries.flatMap((arbitrary, index) =>
        arbitrary.shrink(value[index]).map((simpler) => {
          const candidate = [...value] as T
          candidate[index] = simpler
          return candidate
        }),
      ),
  }
}

export function arrayOf<T>(
  arbitrary: Arbitrary<T>,
  maxLength = 6,
): Arbitrary<T[]> {
  return {
    generate: (random) => {
      const length = Math.floor(random() * (maxLength + 1))
      return Array.from({ length }, () => arbitrary.generate(random))
    },
    shrink: (value) => [
      ...(value.length > 0 ? [[] as T[]] : []),
      ...value.map((_, index) => value.filter((__, at) => at !== index)),
      ...value.flatMap((element, index) =>
        arbitrary.shrink(element).map((simpler) => {
          const candidate = [...value]
          candidate[index] = simpler
          return candidate
        }),
      ),
    ],
  }
}
