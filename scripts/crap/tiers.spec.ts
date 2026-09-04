// @vitest-environment node
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { MEASURING_TIERS, reportDirectory, reportFile } from './tiers.ts'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

// A tier measures the gate's sources by importing them from vitest.coverage.ts,
// which is the only way to get the same include and exclude as every other
// tier.
const measuringConfigs = (): string[] => readdirSync(projectRoot)
  .filter((entry) => entry.endsWith('.config.ts'))
  .filter((entry) => readFileSync(join(projectRoot, entry), 'utf8').includes('measuredCoverage'))

describe('the tiers the gate merges', () => {
  it('is every config that measures what the gate scores', () => {
    expect(MEASURING_TIERS.map((tier) => tier.config).sort()).toEqual(measuringConfigs().sort())
  })

  it('names a config that is present, so a renamed tier fails here and not mid-run', () => {
    for (const tier of MEASURING_TIERS) {
      expect(existsSync(join(projectRoot, tier.config)), tier.config).toBe(true)
    }
  })

})

describe('where a tier reports', () => {
  it('gives every tier a directory of its own, so one report cannot overwrite another', () => {
    const directories = MEASURING_TIERS.map(reportDirectory)
    expect(new Set(directories).size).toBe(MEASURING_TIERS.length)
  })

  it('names that directory after the tier, under the ignored coverage root', () => {
    expect(reportDirectory({ name: 'unit', config: 'vite.config.ts' })).toBe(join('coverage', 'unit'))
  })

  it('reads the istanbul report vitest writes there', () => {
    expect(reportFile({ name: 'unit', config: 'vite.config.ts' }))
      .toBe(join('coverage', 'unit', 'coverage-final.json'))
  })
})
