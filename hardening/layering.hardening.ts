import { describe, expect, test } from 'vitest'
import { importCycles } from '../acceptance/layering.ts'

describe('reporting an import cycle', () => {
  test('names only the modules the cycle runs through, not the way in', () => {
    expect(importCycles([
      { module: 'a.ts', imports: ['./b.ts'] },
      { module: 'b.ts', imports: ['./c.ts'] },
      { module: 'c.ts', imports: ['./b.ts'] },
    ])).toEqual(['b.ts -> c.ts -> b.ts'])
  })

  test('an import of a module the graph does not contain is a dead end, not a cycle', () => {
    expect(importCycles([{ module: 'a.ts', imports: ['./gone.ts'] }])).toEqual([])
  })

  test('two modules that both reach a missing module still report nothing', () => {
    expect(importCycles([
      { module: 'a.ts', imports: ['./gone.ts'] },
      { module: 'b.ts', imports: ['./gone.ts'] },
    ])).toEqual([])
  })
})
