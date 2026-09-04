// Where a mutation run keeps what it records between runs.
//
// PLAN section 4 puts mutation manifests under `.mutation/`, and this is the
// one place that spells it: a runner asks for the record it wants rather than
// for the directory the records happen to share, so neither runner has to know
// what the other one keeps beside its own.
import { join } from 'node:path'

const RECORDS_DIR = '.mutation'

export const ACCEPTANCE_IMPLEMENTATION_STAMP = join(RECORDS_DIR, 'acceptance-implementation.json')
export const MUTATION_TIER_STAMP = join(RECORDS_DIR, 'test-tier.json')

// One manifest per feature, named after the feature's slug, so a renamed
// feature starts from no record rather than from the one its old name earned.
export const gherkinManifest = (slug: string): string =>
  join(RECORDS_DIR, 'gherkin', `${slug}.manifest`)
