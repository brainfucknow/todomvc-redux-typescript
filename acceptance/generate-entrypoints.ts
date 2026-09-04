import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Feature } from './runtime.ts'
import type { GeneratedFile } from './generator.ts'
import { featureArtifacts } from './generator.ts'

const USAGE = 'usage: generate-entrypoints <json-ir> <generated-test-output>'
const acceptanceDir = dirname(fileURLToPath(import.meta.url))

const write = (cwd: string, file: GeneratedFile): void => {
  const target = resolve(cwd, file.path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, file.content)
}

const generate = (irPath: string, outputDir: string): void => {
  const featureIr: Feature = JSON.parse(readFileSync(irPath, 'utf8'))
  const cwd = process.cwd()
  const { entrypoint, metadata } = featureArtifacts({
    featureName: featureIr.name,
    irPath,
    outputDir,
    acceptanceDir,
    cwd,
  })

  write(cwd, entrypoint)
  write(cwd, metadata)
  process.stdout.write(`generated ${entrypoint.path}\n`)
}

const [irPath, outputDir] = process.argv.slice(2)
if (!irPath || !outputDir || process.argv.length > 4) {
  process.stderr.write(`${USAGE}\n`)
  process.exit(2)
}

try {
  generate(irPath, outputDir)
} catch (failure) {
  process.stderr.write(`${(failure as Error).message}\n`)
  process.exit(1)
}
