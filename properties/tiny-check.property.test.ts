import { describe, expect, it } from 'vitest'
import {
  arrayOf,
  boolean,
  elementOf,
  failureFrom,
  forAll,
  integer,
  text,
  tuple,
} from './tiny-check'

// If `forAll` never reported a counterexample, every property in this directory
// would pass against any implementation at all.

describe('running a property', () => {
  it('passes a property that holds for every generated value', async () => {
    await forAll(integer(0, 1000), (value) => {
      expect(Number.isInteger(value)).toBe(true)
    })
  })

  it('fails a property that does not, naming the case and the seed', async () => {
    const failure = await failureFrom(() =>
      forAll(integer(0, 1000), (value) => {
        expect(value).toBeLessThan(500)
      }),
    )

    expect(failure.message).toMatch(
      /^Property failed on case \d+ of 200 \(seed 20260908\)\./,
    )
    expect(failure.message).toContain('Counterexample: 500')
    expect(failure.message).toContain('Cause:')
  })

  it('shrinks a failing number to the smallest one that still fails', async () => {
    const failure = await failureFrom(() =>
      forAll(integer(0, 1000), (value) => {
        expect(value).toBeLessThan(37)
      }),
    )

    expect(failure.message).toContain('Counterexample: 37 (shrunk from')
  })

  it('shrinks a failing string toward the shortest one that still fails', async () => {
    const failure = await failureFrom(() =>
      forAll(text(), (value) => {
        expect(value).not.toContain('"')
      }),
    )

    expect(failure.message).toContain('Counterexample: "\\""')
  })

  it('shrinks a failing array to the fewest elements that still fail', async () => {
    const failure = await failureFrom(() =>
      forAll(arrayOf(integer(0, 9)), (value) => {
        expect(value.length).toBeLessThan(2)
      }),
    )

    expect(failure.message).toContain('Counterexample: [0,0]')
  })

  it('shrinks each part of a tuple', async () => {
    const failure = await failureFrom(() =>
      forAll(tuple(integer(0, 99), boolean), ([number, flag]) => {
        expect(number < 5 || !flag).toBe(true)
      }),
    )

    expect(failure.message).toContain('Counterexample: [5,true]')
  })

  it('draws the same values twice from the same seed, and other values from another', async () => {
    const drawn = (seed: number) => {
      const values: number[] = []
      return forAll(
        integer(0, 1_000_000),
        (value) => {
          values.push(value)
        },
        { seed, runs: 20 },
      ).then(() => values)
    }

    expect(await drawn(1)).toStrictEqual(await drawn(1))
    expect(await drawn(1)).not.toStrictEqual(await drawn(2))
  })

  it('reports an asynchronous failure like any other', async () => {
    const failure = await failureFrom(() =>
      forAll(integer(0, 10), async (value) => {
        await Promise.resolve()
        expect(value).toBeLessThan(0)
      }),
    )

    expect(failure.message).toContain('Counterexample: 0')
  })

  it('refuses to call a passing property a failure', async () => {
    await expect(failureFrom(() => forAll(boolean, () => {}))).rejects.toThrow(
      'Expected the property to fail, and it passed',
    )
  })
})

describe('drawing values', () => {
  it('stays inside the range it was given', async () => {
    await forAll(integer(-5, 5), (value) => {
      expect(value).toBeGreaterThanOrEqual(-5)
      expect(value).toBeLessThanOrEqual(5)
    })
  })

  it('draws only from the values it was given', async () => {
    const values = ['a', 'b', 'c']
    await forAll(elementOf(values), (value) => {
      expect(values).toContain(value)
    })
  })

  it('draws text that a naive JSON body would break on', async () => {
    const seen = new Set<string>()
    await forAll(text(), (value) => {
      for (const character of ['"', '\\', '\n']) {
        if (value.includes(character)) seen.add(character)
      }
    })

    expect([...seen].sort()).toStrictEqual(['\n', '"', '\\'])
  })

  it('draws the empty string and the empty array, which are where edges are', async () => {
    const lengths = new Set<number>()
    await forAll(tuple(text(), arrayOf(boolean)), ([value, values]) => {
      lengths.add(value.length + values.length)
    })

    expect(lengths.has(0)).toBe(true)
  })
})
