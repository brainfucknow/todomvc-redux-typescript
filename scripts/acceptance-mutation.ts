import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
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

const MANIFEST_DIR = join(projectRoot, '.mutation', 'gherkin')
const MANIFEST_EXTENSION = '.manifest'
const MANIFEST_END = '# acceptance-mutation-manifest-end'

const featuresDir = join(projectRoot, FEATURES_DIR)
const stagedDir = join(projectRoot, MUTATION_FEATURES_DIR)
const irDir = join(projectRoot, MUTATION_IR_DIR)
const generatedDir = join(projectRoot, MUTATION_GENERATED_DIR)
const worker = join(projectRoot, 'acceptance', 'mutation-worker.ts')

const manifestPath = (slug: string): string => join(MANIFEST_DIR, `${slug}${MANIFEST_EXTENSION}`)

const storedManifest = (slug: string): string =>
  existsSync(manifestPath(slug)) ? readFileSync(manifestPath(slug), 'utf8') : ''

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

const implementationHash = (): string => {
  const metadataDir = join(generatedDir, METADATA_DIR)
  const [file] = readdirSync(metadataDir).filter((entry) => entry.endsWith('.json'))
  const metadata: { implementation_hash?: string } = JSON.parse(readFileSync(join(metadataDir, file), 'utf8'))
  if (!metadata.implementation_hash) {
    throw new Error(`${file} records no implementation_hash`)
  }
  return metadata.implementation_hash
}

const mutateFeature = (feature: string): number => {
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
    '-implementation-hash', implementationHash(),
    '-runner-worker', `${process.execPath} ${worker}`,
  ], { cwd: projectRoot, stdio: 'inherit' })

  storeManifest(staged, slug)
  return mutation.status ?? 1
}

bootstrapTools()
rmSync(join(projectRoot, MUTATION_WORK_DIR), { recursive: true, force: true })
mkdirSync(stagedDir, { recursive: true })

const failures = featureFiles().filter((feature) => mutateFeature(feature) !== 0)
if (failures.length > 0) {
  announce(`acceptance mutation failed for ${failures.join(', ')}`)
  process.exit(1)
}
