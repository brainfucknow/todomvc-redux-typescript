import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { FEATURES_DIR, FEATURE_EXTENSION, GENERATED_DIR, IR_DIR, irFileName } from '../acceptance/layout.ts'
import { projectRoot } from '../acceptance/project-files.ts'

const featuresDir = join(projectRoot, FEATURES_DIR)
const irDir = join(projectRoot, IR_DIR)
const generatedDir = join(projectRoot, GENERATED_DIR)
const parser = join(projectRoot, 'bin', 'gherkin-parser')
const generator = join(projectRoot, 'acceptance', 'generate-entrypoints.ts')
const vitest = join(projectRoot, 'node_modules', 'vitest', 'vitest.mjs')

const run = (command: string, args: string[]): void => {
  execFileSync(command, args, { cwd: projectRoot, stdio: 'inherit' })
}

const announce = (message: string): void => {
  process.stdout.write(`${message}\n`)
}

if (!existsSync(parser)) {
  announce('bootstrapping the APS tools')
  run(join(projectRoot, 'scripts', 'bootstrap-aps.sh'), [])
}

rmSync(irDir, { recursive: true, force: true })
rmSync(generatedDir, { recursive: true, force: true })
mkdirSync(irDir, { recursive: true })
mkdirSync(generatedDir, { recursive: true })

const features = readdirSync(featuresDir).filter((entry) => entry.endsWith(FEATURE_EXTENSION)).sort()
if (features.length === 0) {
  throw new Error(`no feature files in ${featuresDir}`)
}

for (const feature of features) {
  const irPath = join(irDir, irFileName(feature))
  announce(`parsing ${FEATURES_DIR}/${feature}`)
  run(parser, [join(featuresDir, feature), irPath])
  run(process.execPath, [generator, irPath, generatedDir])
}

announce('running generated acceptance tests')
run(process.execPath, [vitest, 'run', '--config', 'vitest.acceptance.config.ts'])
