// The tiers the gate runs and merges, and where each one's report goes.
import { join } from 'node:path'

export type Tier = {
  name: string
  config: string
}

// Every tier here reports over the sources vitest.coverage.ts names, so their
// coverage can be unioned. The acceptance tier is deliberately absent: it
// drives the built application through servers and step handlers that are
// excluded adapter shells, so every statement it reaches inside a measured
// module is one the unit tier reaches too (checked, not assumed), and running
// it would cost a parse-and-generate cycle and the bootstrapped Go binaries
// for no change in any number. `tiers.spec.ts` holds the other half of that
// decision: a tier that does measure the same sources has to be listed here,
// or the gate would score functions on less coverage than the project has.
export const MEASURING_TIERS: Tier[] = [
  { name: 'unit', config: 'vite.config.ts' },
  { name: 'property', config: 'vitest.property.config.ts' },
  { name: 'hardening', config: 'vitest.hardening.config.ts' },
]

// Project-relative, and one directory per tier, so one tier's report cannot
// overwrite another's and a manual `vitest run --coverage` into the default
// `coverage/` is ignored.
export const reportDirectory = (tier: Tier): string => join('coverage', tier.name)

export const reportFile = (tier: Tier): string =>
  join(reportDirectory(tier), 'coverage-final.json')
