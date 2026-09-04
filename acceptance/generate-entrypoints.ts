import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Feature } from './runtime.ts'
import { entrypointSource, implementationHash, metadataFileName } from './generator.ts'

const USAGE = 'usage: generate-entrypoints <json-ir> <generated-test-output>'
const acceptanceDir = dirname(fileURLToPath(import.meta.url))

const toImportPath = (fromDir: string, target: string): string => {
  const relativePath = relative(fromDir, target).split('\\').join('/')
  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`
}

const generate = (irPath: string, outputDir: string): void => {
  const featureIr: Feature = JSON.parse(readFileSync(irPath, 'utf8'))
  const slug = basename(irPath, '.json')
  const featurePath = `features/${slug}.feature`
  const entrypointPath = join(outputDir, `${slug}.acceptance.ts`)
  const generatedFile = relative(process.cwd(), resolve(entrypointPath))

  const content = entrypointSource({
    featureName: featureIr.name,
    irPath: relative(process.cwd(), resolve(irPath)),
    runtimeImport: toImportPath(outputDir, join(acceptanceDir, 'runtime.ts')),
    stepsImport: toImportPath(outputDir, join(acceptanceDir, 'steps.ts')),
  })

  mkdirSync(join(outputDir, 'metadata'), { recursive: true })
  writeFileSync(entrypointPath, content)
  writeFileSync(join(outputDir, 'metadata', metadataFileName(featurePath)), `${JSON.stringify({
    schema_version: 1,
    feature_path: featurePath,
    ir_path: relative(process.cwd(), resolve(irPath)),
    implementation_hash: implementationHash([{ path: generatedFile, content }]),
    hash_scope: 'generated_files',
    generated_files: [generatedFile],
  }, null, 2)}\n`)

  process.stdout.write(`generated ${generatedFile}\n`)
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
