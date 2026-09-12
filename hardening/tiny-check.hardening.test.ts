import { describe, expect, it } from 'vitest'
import { failureFrom, forAll, integer, show } from '../properties/tiny-check'

// Around the one path tiny-check.property.test.ts drives: a seed nobody can override
// is not reproducible, a budget that is not spent is not a budget, and a value the
// report cannot render is a counterexample nobody can act on.

const failsAt = (limit: number) => (value: number) => {
  if (value >= limit) throw new Error('too big')
}

describe('rendering a value for a failure report', () => {
  it('names undefined rather than rendering nothing at all', () => {
    expect(show(undefined)).toBe('undefined')
  })

  it('keeps an undefined a JSON body would silently drop', () => {
    expect(show({ a: undefined })).toBe('{"a":"<undefined>"}')
  })

  it('falls back to a plain string for a value JSON cannot hold', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular

    expect(show(circular)).toBe('[object Object]')
  })
})

describe('what the failure report says', () => {
  it('says nothing about shrinking when nothing shrank', async () => {
    const failure = await failureFrom(() => forAll(integer(0, 0), failsAt(0)))

    expect(failure.message).toContain('Counterexample: 0\n')
    expect(failure.message).not.toContain('shrunk from')
  })

  it('is three lines: what failed, on what, and why', async () => {
    const failure = await failureFrom(() => forAll(integer(0, 0), failsAt(0)))

    expect(failure.message.split('\n')).toStrictEqual([
      'Property failed on case 1 of 200 (seed 20260908).',
      'Counterexample: 0',
      'Cause: too big',
    ])
  })
})

describe('the budgets a caller sets', () => {
  it('runs exactly the number of cases it was asked for', async () => {
    let seen = 0

    await forAll(
      integer(0, 1000),
      () => {
        seen += 1
      },
      { runs: 3 },
    )

    expect(seen).toBe(3)
  })

  it('does not shrink at all on a budget of none', async () => {
    const failure = await failureFrom(() =>
      forAll(integer(0, 1000), failsAt(37), { shrinks: 0 }),
    )

    expect(failure.message).toContain('Counterexample: 587\n')
  })

  it('spends a budget of one and then stops, short of the simplest case', async () => {
    const failure = await failureFrom(() =>
      forAll(integer(0, 1000), failsAt(37), { shrinks: 1 }),
    )

    expect(failure.message).toContain('Counterexample: 293 (shrunk from 587)')
  })
})

// $PROPERTY_SEED is the whole of the runner's reproducibility story, and nothing
// else drives the guard that reads it.
describe('choosing the seed', () => {
  const withSeedEnvironment = async (
    value: string | undefined,
    body: () => Promise<void>,
  ) => {
    const before = process.env.PROPERTY_SEED
    if (value === undefined) delete process.env.PROPERTY_SEED
    else process.env.PROPERTY_SEED = value
    try {
      await body()
    } finally {
      if (before === undefined) delete process.env.PROPERTY_SEED
      else process.env.PROPERTY_SEED = before
    }
  }

  const seedReportedBy = async () => {
    const failure = await failureFrom(() => forAll(integer(0, 0), failsAt(0)))
    return /\(seed (.+)\)/.exec(failure.message)?.[1]
  }

  it('takes the one the environment names', async () => {
    await withSeedEnvironment('7', async () => {
      expect(await seedReportedBy()).toBe('7')
    })
  })

  it('keeps its own when the environment names nothing usable', async () => {
    await withSeedEnvironment('', async () => {
      expect(await seedReportedBy()).toBe('20260908')
    })
    await withSeedEnvironment('soon', async () => {
      expect(await seedReportedBy()).toBe('20260908')
    })
    await withSeedEnvironment(undefined, async () => {
      expect(await seedReportedBy()).toBe('20260908')
    })
  })

  it('lets an explicit option win over the environment', async () => {
    await withSeedEnvironment('7', async () => {
      const failure = await failureFrom(() =>
        forAll(integer(0, 0), failsAt(0), { seed: 99 }),
      )
      expect(failure.message).toContain('(seed 99)')
    })
  })
})
