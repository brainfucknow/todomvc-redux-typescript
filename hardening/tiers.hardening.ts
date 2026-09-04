import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { MEASURING_TIERS, reportDirectory, reportFile } from '../scripts/crap/tiers.ts'

const COVERAGE_ROOT = 'coverage'

// A tier's name is not a label. It picks the directory the tier's report is
// written to and read back from, and it is what the gate calls the tier in its
// summary line and in the message it fails with when a report is missing. A
// tier that lost its name would still run: it would write into the coverage
// root itself, which is where a hand-run `vitest run --coverage` lands, and the
// gate would then score the project against whatever that left behind.
describe('every tier is named, and its name keeps its report to itself', () => {
  test.each(MEASURING_TIERS)('$name reports below the coverage root, not into it', (tier) => {
    expect(reportDirectory(tier)).toBe(join(COVERAGE_ROOT, tier.name))
    expect(reportDirectory(tier)).not.toBe(COVERAGE_ROOT)
  })

  test.each(MEASURING_TIERS)('$name reads back the report it wrote', (tier) => {
    expect(reportFile(tier).startsWith(`${reportDirectory(tier)}/`)).toBe(true)
  })

  test('the tiers are named for the commands a reader runs to reproduce them', () => {
    expect(MEASURING_TIERS.map((tier) => tier.name)).toEqual(['unit', 'property', 'hardening'])
  })
})
