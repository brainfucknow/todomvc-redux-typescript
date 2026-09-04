import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const featuresDir = join(projectRoot, 'features')
const irDir = join(projectRoot, 'build', 'acceptance', 'ir')
const generatedDir = join(projectRoot, 'build', 'acceptance', 'generated')
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

const features = readdirSync(featuresDir).filter((entry) => entry.endsWith('.feature')).sort()
if (features.length === 0) {
  throw new Error(`no feature files in ${featuresDir}`)
}

for (const feature of features) {
  const irPath = join(irDir, `${basename(feature, '.feature')}.json`)
  announce(`parsing features/${feature}`)
  run(parser, [join(featuresDir, feature), irPath])
  run(process.execPath, [generator, irPath, generatedDir])
}

announce('running generated acceptance tests')
run(process.execPath, [vitest, 'run', '--config', 'vitest.acceptance.config.ts'])
