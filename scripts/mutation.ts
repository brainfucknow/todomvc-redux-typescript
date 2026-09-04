import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFiles, readIfPresent } from './mutation-reuse/files.ts'
import { fingerprint, selectedFiles } from './mutation-reuse/fingerprint.ts'
import { MUTATION_TIER_STAMP } from './mutation-reuse/layout.ts'
import { MUTATION_TIER, reachedVerdict, resultsAreReusable, stampText } from './mutation-reuse/stamp.ts'
import { mutationTierTests } from '../vitest.mutation.config.ts'

// Stryker's incremental report is the mutation manifest: it reuses a recorded
// result when the mutated source is unchanged. It decides that from source and
// test-file hashes it collects from the test runner, and the command runner
// reports one anonymous test, so an added or edited test is invisible to it and
// a stale `Survived` would be reused as fact. This fingerprints the mutation
// tier as it was when the manifest was last written, and forces a full run once
// that has moved - the manifest stays differential without ever being trusted
// across a change in the tests that judge the mutants. A change to a mutated
// source is Stryker's own to notice, so only the tests are fingerprinted here.

// Found from this file's own location, the way every shell outside the
// acceptance package finds it. That package exports a `projectRoot` of its own,
// but this runner mutates the whole tree and has no other business with the APS
// pipeline: importing it would make the language-mutation tier depend on the
// acceptance tier for one constant. `scripts/architecture/packages.ts` records
// that as a dependency this shell is not granted, and `packages.spec.ts`
// enforces it.
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const tierStamp = join(projectRoot, MUTATION_TIER_STAMP)

const stryker = join(projectRoot, 'node_modules', '.bin', 'stryker')

// What the tier is made of: the config naming the tests that judge the mutants,
// and every test file the directories it names hold.
const TIER_CONFIG = 'vitest.mutation.config.ts'

const entriesIn = (directory: string): string[] => {
  const root = join(projectRoot, directory)
  return existsSync(root) ? readdirSync(root, { recursive: true }).map((entry) => entry as string) : []
}

const tierFingerprint = (): string =>
  fingerprint(readFiles(projectRoot, [TIER_CONFIG, ...selectedFiles(mutationTierTests, entriesIn)]))

// Spelled here rather than shared with `scripts/acceptance-mutation.ts`, which
// takes its own from `acceptance/pipeline.ts`: the only module with one to
// share belongs to the acceptance package, and a line on stdout is not
// knowledge two unrelated pieces of tooling hold in common - it is a shell
// doing its own output.
const announce = (message: string): void => {
  process.stdout.write(`${message}\n`)
}

const current = tierFingerprint()
const reusable = resultsAreReusable(MUTATION_TIER, readIfPresent(tierStamp), current)

announce(reusable
  ? 'mutation tier unchanged since the manifest was written; reusing recorded results'
  : 'mutation tier has changed since the manifest was written; re-running every mutant')

const mutation = spawnSync(stryker, ['run', ...(reusable ? [] : ['--force']), ...process.argv.slice(2)], {
  cwd: projectRoot,
  stdio: 'inherit',
})

if (reachedVerdict([mutation.status])) {
  mkdirSync(dirname(tierStamp), { recursive: true })
  writeFileSync(tierStamp, stampText(MUTATION_TIER, current))
}

process.exit(mutation.status ?? 1)
