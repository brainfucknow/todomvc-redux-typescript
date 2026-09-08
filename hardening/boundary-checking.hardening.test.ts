import { describe, expect, it } from 'vitest'
import { cyclesOf, violationsOf } from '../scripts/architecture/boundaries.mjs'

/**
 * The deciding half of `scripts/architecture/boundaries.mjs`. Its spec drives
 * every rule shape with one glob and one target, and every graph it walks is
 * either a single clean loop or no loop at all, so the parts that only matter
 * when a rule has two patterns or a cycle has a way in survived mutation.
 *
 * Each test below is one of those: a rule whose second pattern is the one that
 * matches, a loop reached from outside it, a module that imports itself, and
 * two paths whose shapes the extension stripper has to tell apart.
 */

/**
 * @param path a repository-relative module path, with its extension
 * @param targets what it imports, per imports.mjs
 */
const module = (path: string, ...targets: string[]) => ({ path, targets })

describe('a rule with more than one pattern in a list', () => {
  const rules = [
    {
      name: 'the harnesses avoid the clock',
      files: ['acceptance/**', 'properties/**'],
      deny: ['node:timers', 'node:perf_hooks'],
      reason: 'a harness that waits is a harness that flakes',
    },
  ]

  it('applies to a module matching any one of its file patterns', () => {
    expect(
      violationsOf([module('properties/slow.ts', 'node:timers')], rules),
    ).toHaveLength(1)
    expect(
      violationsOf([module('acceptance/slow.ts', 'node:timers')], rules),
    ).toHaveLength(1)
    expect(
      violationsOf([module('scripts/slow.mjs', 'node:timers')], rules),
    ).toStrictEqual([])
  })

  it('forbids a target matching any one of its denied patterns', () => {
    expect(
      violationsOf(
        [module('acceptance/slow.ts', 'node:perf_hooks')],
        rules,
      ).map((violation) => violation.target),
    ).toStrictEqual(['node:perf_hooks'])
  })
})

describe('reporting a cycle as the loop and nothing else', () => {
  it('drops the way in, keeping only the modules that call each other', () => {
    expect(
      cyclesOf([
        module('entry.ts', 'a'),
        module('a.ts', 'b'),
        module('b.ts', 'a'),
      ]),
    ).toStrictEqual([['a.ts', 'b.ts', 'a.ts']])
  })

  it('reports two separate loops separately', () => {
    expect(
      cyclesOf([
        module('a.ts', 'b'),
        module('b.ts', 'a'),
        module('c.ts', 'd'),
        module('d.ts', 'c'),
      ]),
    ).toStrictEqual([
      ['a.ts', 'b.ts', 'a.ts'],
      ['c.ts', 'd.ts', 'c.ts'],
    ])
  })

  it('is not fooled by a module that imports itself', () => {
    expect(cyclesOf([module('x/a.ts', 'x/a')])).toStrictEqual([])
  })
})

describe('matching a target to the module it names', () => {
  it('strips the last extension only, so a dotted filename still resolves', () => {
    expect(
      cyclesOf([module('x/a.b.ts', 'x/c'), module('x/c.ts', 'x/a.b')]),
    ).toStrictEqual([['x/a.b.ts', 'x/c.ts', 'x/a.b.ts']])
  })

  it('gives a directory alias to an index module and to nothing else', () => {
    expect(
      cyclesOf([
        module('x/indexes.ts', 'x/thing'),
        module('x/thing.ts', 'x/i'),
      ]),
    ).toStrictEqual([])
    expect(
      cyclesOf([module('x/index.ts', 'x/thing'), module('x/thing.ts', 'x')]),
    ).toStrictEqual([['x/index.ts', 'x/thing.ts', 'x/index.ts']])
  })
})
