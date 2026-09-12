import { describe, expect, it } from 'vitest'
import { cyclesOf, violationsOf } from '../scripts/architecture/boundaries.mjs'

// What boundaries.spec.mjs cannot reach with one glob, one target and a clean loop:
// a rule whose second pattern matches, a loop reached from outside, a module that
// imports itself, two path shapes the extension stripper must tell apart.

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
