import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { projectRoot } from '../acceptance/project-files.ts'
import { mutationTierTests } from '../vitest.mutation.config.ts'

// Stryker's incremental report is the mutation manifest: it reuses a recorded
// result when the mutated source is unchanged. It decides that from source and
// test-file hashes it collects from the test runner, and the command runner
// reports one anonymous test, so an added or edited test is invisible to it and
// a stale `Survived` would be reused as fact. This records what the mutation
// tier looked like when the manifest was last written, and forces a full run
// when that has moved - the manifest stays differential without ever being
// trusted across a change in the tests that judge the mutants. A change to a
// mutated source is Stryker's own to notice, so only the tests are hashed here.

const MANIFEST_DIR = join(projectRoot, '.mutation')
const TIER_STAMP = join(MANIFEST_DIR, 'test-tier.json')
const STAMP_VERSION = 1

const stryker = join(projectRoot, 'node_modules', '.bin', 'stryker')

const testsUnder = ({ directory, suffix }: { directory: string; suffix: string }): string[] => {
  const root = join(projectRoot, directory)
  return existsSync(root)
    ? readdirSync(root, { recursive: true })
      .map((entry) => entry as string)
      .filter((entry) => entry.endsWith(suffix))
      .map((entry) => join(root, entry))
    : []
}

const tierFiles = (): string[] => [
  join(projectRoot, 'vitest.mutation.config.ts'),
  ...mutationTierTests.flatMap(testsUnder),
]

const tierHash = (): string => {
  const digest = createHash('sha256')
  for (const file of tierFiles().map((file) => relative(projectRoot, file)).sort()) {
    digest.update(`${file}\0`)
    digest.update(readFileSync(join(projectRoot, file)))
    digest.update('\0')
  }
  return `sha256:${digest.digest('hex')}`
}

const recordedHash = (): string | undefined => {
  if (!existsSync(TIER_STAMP)) {
    return undefined
  }
  const stamp: { version?: number; tier_hash?: string } = JSON.parse(readFileSync(TIER_STAMP, 'utf8'))
  return stamp.version === STAMP_VERSION ? stamp.tier_hash : undefined
}

const current = tierHash()
const reusable = recordedHash() === current
const announce = (message: string): void => {
  process.stdout.write(`${message}\n`)
}

announce(reusable
  ? 'mutation tier unchanged since the manifest was written; reusing recorded results'
  : 'mutation tier has changed since the manifest was written; re-running every mutant')

const mutation = spawnSync(stryker, ['run', ...(reusable ? [] : ['--force']), ...process.argv.slice(2)], {
  cwd: projectRoot,
  stdio: 'inherit',
})

// Stryker rewrites the manifest whether mutants survived or not, so the stamp
// records the tier alongside it either way. Stamping only successful runs would
// leave a failed run's results in the manifest under the previous tier's stamp,
// and the next run would reuse them as if the tests had never changed.
if (mutation.status !== null) {
  mkdirSync(MANIFEST_DIR, { recursive: true })
  writeFileSync(TIER_STAMP, `${JSON.stringify({ version: STAMP_VERSION, tier_hash: current }, null, 2)}\n`)
}

process.exit(mutation.status ?? 1)
