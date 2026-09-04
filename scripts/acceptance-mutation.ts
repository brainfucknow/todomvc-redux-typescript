import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { GeneratedFile } from '../acceptance/generator.ts'
import { implementationHash } from '../acceptance/generator.ts'
import {
  FEATURES_DIR,
  FEATURE_EXTENSION,
  METADATA_DIR,
  MUTATION_FEATURES_DIR,
  MUTATION_GENERATED_DIR,
  MUTATION_IR_DIR,
  MUTATION_WORK_DIR,
  irFileName,
} from '../acceptance/layout.ts'
import {
  announce,
  bootstrapTools,
  emptyDirectories,
  featureFiles,
  generateEntrypoints,
  gherkinMutator,
  parseFeature,
} from '../acceptance/pipeline.ts'
import { projectRoot } from '../acceptance/project-files.ts'

// Acceptance mutation: gherkin-mutator rewrites one example cell at a time and
// asks whether the generated tests notice. `--level soft` reuses a scenario's
// last clean result when the scenario, its background and the feature identity
// are unchanged, even after the implementation moves - which is what happens to
// this project between tasks.
//
// The mutator keeps that manifest in a comment block inside the feature file.
// `features/` is the Specifier's and PLAN section 4 puts mutation manifests
// under `.mutation/`, so the run works on a staged copy of the feature: the
// stored manifest goes in on the way through and comes back out afterwards, and
// the feature file itself is never opened for writing.

const MUTATION_DIR = join(projectRoot, '.mutation')
const MANIFEST_DIR = join(MUTATION_DIR, 'gherkin')
const MANIFEST_EXTENSION = '.manifest'
const MANIFEST_END = '# acceptance-mutation-manifest-end'
const IMPLEMENTATION_DIR = 'acceptance'
const IMPLEMENTATION_STAMP = join(MUTATION_DIR, 'acceptance-implementation.json')
const STAMP_VERSION = 1

const featuresDir = join(projectRoot, FEATURES_DIR)
const stagedDir = join(projectRoot, MUTATION_FEATURES_DIR)
const irDir = join(projectRoot, MUTATION_IR_DIR)
const generatedDir = join(projectRoot, MUTATION_GENERATED_DIR)
const worker = join(projectRoot, 'acceptance', 'mutation-worker.ts')

const manifestPath = (slug: string): string => join(MANIFEST_DIR, `${slug}${MANIFEST_EXTENSION}`)

// A recorded kill is only evidence about the implementation that produced it,
// and the manifest cannot tell that implementation from any other: the
// `implementation_hash` the mutator stores covers the generated entry point,
// which names its feature and its IR file and nothing else, so no step handler,
// assertion or fixture reaches it - and at `--level soft` a moved hash would not
// force a re-test anyway. A weakened assertion would therefore keep every kill
// it used to earn and the run would skip past it, green. So the run records
// what the step implementation looked like when the manifests were written and
// stages the features without them once that has moved, which tests every
// candidate against the implementation the result is reported for.
const implementationFiles = (): GeneratedFile[] =>
  readdirSync(join(projectRoot, IMPLEMENTATION_DIR))
    .filter((entry) => entry.endsWith('.ts') && !entry.endsWith('.spec.ts'))
    .map((entry) => ({
      path: `${IMPLEMENTATION_DIR}/${entry}`,
      content: readFileSync(join(projectRoot, IMPLEMENTATION_DIR, entry), 'utf8'),
    }))

const recordedImplementation = (): string | undefined => {
  if (!existsSync(IMPLEMENTATION_STAMP)) {
    return undefined
  }
  const stamp: { version?: number; implementation_hash?: string } =
    JSON.parse(readFileSync(IMPLEMENTATION_STAMP, 'utf8'))
  return stamp.version === STAMP_VERSION ? stamp.implementation_hash : undefined
}

const currentImplementation = implementationHash(implementationFiles())
const reusable = recordedImplementation() === currentImplementation

const storedManifest = (slug: string): string =>
  reusable && existsSync(manifestPath(slug)) ? readFileSync(manifestPath(slug), 'utf8') : ''

// The mutator writes the stamp and the manifest at the very top of the file,
// ahead of the feature content it was given.
const metadataBlock = (feature: string): string => {
  const lines = feature.split('\n')
  const end = lines.findIndex((line) => line.trim() === MANIFEST_END)
  return end < 0 ? '' : `${lines.slice(0, end + 1).join('\n')}\n`
}

// The mutator records the feature path it was given in the manifest and checks
// it on the next run, so the staged path stays relative to the project root:
// an absolute one would only ever match on the machine that wrote it.
const stageFeature = (feature: string, slug: string): string => {
  const staged = `${MUTATION_FEATURES_DIR}/${feature}`
  writeFileSync(join(projectRoot, staged), `${storedManifest(slug)}${readFileSync(join(featuresDir, feature), 'utf8')}`)
  return staged
}

const storeManifest = (staged: string, slug: string): void => {
  const block = metadataBlock(readFileSync(join(projectRoot, staged), 'utf8'))
  if (block === '') {
    return
  }
  mkdirSync(MANIFEST_DIR, { recursive: true })
  writeFileSync(manifestPath(slug), block)
}

// What the generator recorded for the entry point this run generated. The
// mutator stores it and compares it on the next run; the comment above
// `storedManifest` says why it is not by itself enough to trust a reused result.
const generatedImplementationHash = (): string => {
  const metadataDir = join(generatedDir, METADATA_DIR)
  const [file] = readdirSync(metadataDir).filter((entry) => entry.endsWith('.json'))
  const metadata: { implementation_hash?: string } = JSON.parse(readFileSync(join(metadataDir, file), 'utf8'))
  if (!metadata.implementation_hash) {
    throw new Error(`${file} records no implementation_hash`)
  }
  return metadata.implementation_hash
}

const mutateFeature = (feature: string): number | null => {
  const slug = feature.slice(0, -FEATURE_EXTENSION.length)
  emptyDirectories(irDir, generatedDir)

  const staged = stageFeature(feature, slug)
  const irPath = join(irDir, irFileName(feature))
  parseFeature(staged, irPath)
  generateEntrypoints(irPath, generatedDir)

  announce(`mutating ${FEATURES_DIR}/${feature}`)
  const mutation = spawnSync(gherkinMutator, [
    '-feature', staged,
    '-work-dir', MUTATION_WORK_DIR,
    '-generated-dir', MUTATION_GENERATED_DIR,
    '-level', 'soft',
    '-workers', '1',
    '-implementation-hash', generatedImplementationHash(),
    '-runner-worker', `${process.execPath} ${worker}`,
  ], { cwd: projectRoot, stdio: 'inherit' })

  storeManifest(staged, slug)
  return mutation.status
}

bootstrapTools()
rmSync(join(projectRoot, MUTATION_WORK_DIR), { recursive: true, force: true })
mkdirSync(stagedDir, { recursive: true })

announce(reusable
  ? 'step implementation unchanged since the manifests were written; reusing recorded results'
  : 'step implementation has changed since the manifests were written; re-testing every mutation')

const results = featureFiles().map((feature) => ({ feature, status: mutateFeature(feature) }))

// The mutator rewrites a manifest whether the mutants survived or not, so the
// stamp records the implementation alongside it either way. A feature the
// mutator never finished can leave a partial manifest, and stamping that would
// claim results this implementation never earned, so a run that did not reach a
// verdict everywhere leaves the stamp where it is and the next run repeats it.
if (results.every(({ status }) => status !== null)) {
  mkdirSync(MUTATION_DIR, { recursive: true })
  writeFileSync(
    IMPLEMENTATION_STAMP,
    `${JSON.stringify({ version: STAMP_VERSION, implementation_hash: currentImplementation }, null, 2)}\n`,
  )
}

const failures = results.filter(({ status }) => status !== 0).map(({ feature }) => feature)
if (failures.length > 0) {
  announce(`acceptance mutation failed for ${failures.join(', ')}`)
  process.exit(1)
}
