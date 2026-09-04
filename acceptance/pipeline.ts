import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { FEATURES_DIR, FEATURE_EXTENSION } from './layout.ts'
import { projectRoot } from './project-files.ts'

// Driving the APS tools and the generator over this project's feature files.
// The normal acceptance run and the acceptance mutation run differ in what they
// do with the entry points, not in how they get them.

const tool = (name: string): string => join(projectRoot, 'bin', name)

export const gherkinParser = tool('gherkin-parser')
export const gherkinMutator = tool('gherkin-mutator')

const generator = join(projectRoot, 'acceptance', 'generate-entrypoints.ts')
const bootstrap = join(projectRoot, 'scripts', 'bootstrap-aps.sh')

export function runTool(command: string, args: string[]): void {
  execFileSync(command, args, { cwd: projectRoot, stdio: 'inherit' })
}

export function announce(message: string): void {
  process.stdout.write(`${message}\n`)
}

export function bootstrapTools(): void {
  if (existsSync(gherkinParser) && existsSync(gherkinMutator)) {
    return
  }
  announce('bootstrapping the APS tools')
  runTool(bootstrap, [])
}

export function emptyDirectories(...directories: string[]): void {
  for (const directory of directories) {
    rmSync(directory, { recursive: true, force: true })
    mkdirSync(directory, { recursive: true })
  }
}

export function featureFiles(): string[] {
  const featuresDir = join(projectRoot, FEATURES_DIR)
  const features = readdirSync(featuresDir).filter((entry) => entry.endsWith(FEATURE_EXTENSION)).sort()
  if (features.length === 0) {
    throw new Error(`no feature files in ${featuresDir}`)
  }
  return features
}

export function parseFeature(featurePath: string, irPath: string): void {
  runTool(gherkinParser, [featurePath, irPath])
}

export function generateEntrypoints(irPath: string, outputDir: string): void {
  runTool(process.execPath, [generator, irPath, outputDir])
}
