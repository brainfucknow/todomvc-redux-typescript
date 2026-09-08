import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { ROOT } from './aps.mjs'

/**
 * `acceptance-entrypoint-generator <json-ir> <generated-test-output>`, this
 * project's implementation of the APS generator contract
 * (acceptance-generator.md). It is the project-specific half of the pipeline:
 * APS supplies the parser, this supplies the entry points.
 *
 * What it writes is deliberately thin - one Vitest file per feature that loads
 * JSON IR and hands it to `acceptance/run-feature.ts`, the one module that
 * knows both the runtime and this project's step vocabulary. It contains no step
 * behavior and no application binding, so a mutated IR runs through the same
 * generated file without regenerating anything.
 *
 * The IR does not record which feature it came from, and the metadata contract
 * needs that path, so it is derived as features/<ir-basename>.feature.
 * $ACCEPTANCE_FEATURE_PATH overrides for a layout that is not one-to-one.
 *
 * Exit codes: 0 generated, 1 input/output error, 2 wrong usage.
 */

const [irArgument, outputArgument] = process.argv.slice(2)

if (process.argv.length !== 4) {
  process.stderr.write(
    'usage: generate-entrypoints <json-ir> <generated-test-output>\n',
  )
  process.exit(2)
}

try {
  const written = generate(resolve(irArgument), resolve(outputArgument))
  process.stdout.write(`${written.join('\n')}\n`)
} catch (failure) {
  process.stderr.write(
    `generate-entrypoints: ${failure instanceof Error ? failure.message : String(failure)}\n`,
  )
  process.exit(1)
}

/**
 * @param {string} irPath
 * @param {string} outputDir
 * @returns {string[]} what was written, repository-relative
 */
function generate(irPath, outputDir) {
  readIr(irPath)

  const featurePath =
    process.env.ACCEPTANCE_FEATURE_PATH ??
    `features/${basename(irPath, '.json')}.feature`
  const slug = metadataSlug(featurePath)
  const testPath = join(outputDir, `${slug}.acceptance.test.mjs`)

  mkdirSync(outputDir, { recursive: true })
  writeFileSync(testPath, entrypoint(featurePath, irPath, outputDir), 'utf8')

  const metadataPath = join(outputDir, 'metadata', `${slug}.json`)
  mkdirSync(dirname(metadataPath), { recursive: true })
  writeFileSync(
    metadataPath,
    `${JSON.stringify(
      {
        schema_version: 1,
        feature_path: featurePath,
        ir_path: repoRelative(irPath),
        implementation_hash: implementationHash([testPath]),
        hash_scope: 'generated_files',
        generated_files: [repoRelative(testPath)],
      },
      null,
      2,
    )}\n`,
    'utf8',
  )

  return [repoRelative(testPath), repoRelative(metadataPath)]
}

/**
 * The generated entry point. It embeds the IR path it was generated from and
 * lets $ACCEPTANCE_IR replace it, which is how a mutation run points the same
 * generated tests at a mutated IR.
 *
 * @param {string} featurePath
 * @param {string} irPath
 * @param {string} outputDir
 * @returns {string}
 */
function entrypoint(featurePath, irPath, outputDir) {
  const runtime = importSpecifier(
    outputDir,
    join(ROOT, 'acceptance/run-feature.ts'),
  )
  const ir = importSpecifier(outputDir, irPath)

  return [
    `// Generated from ${featurePath} by scripts/acceptance/generate-entrypoints.mjs.`,
    '// Do not edit: `npm run acceptance` rewrites this file.',
    "import { fileURLToPath } from 'node:url'",
    `import { runGeneratedFeature } from '${runtime}'`,
    '',
    `const generatedFrom = fileURLToPath(new URL('${ir}', import.meta.url))`,
    '',
    'runGeneratedFeature(process.env.ACCEPTANCE_IR ?? generatedFrom)',
    '',
  ].join('\n')
}

/**
 * @param {string} irPath
 * @returns {unknown}
 */
function readIr(irPath) {
  const ir = JSON.parse(readFileSync(irPath, 'utf8'))
  if (!ir || !Array.isArray(ir.scenarios)) {
    throw new Error(`${irPath} is not parser JSON IR: no scenarios array`)
  }
  return ir
}

/**
 * The strict mapping from acceptance-generator.md: lowercase, every run of
 * non-alphanumerics to one hyphen, trimmed.
 *
 * @param {string} featurePath
 * @returns {string}
 */
function metadataSlug(featurePath) {
  return featurePath
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * @param {string[]} files
 * @returns {string} `sha256:<hex>` over the generated acceptance files alone
 */
function implementationHash(files) {
  const digest = createHash('sha256')
  for (const file of [...files].sort()) {
    digest.update(repoRelative(file))
    digest.update('\0')
    digest.update(readFileSync(file))
  }
  return `sha256:${digest.digest('hex')}`
}

/**
 * @param {string} from
 * @param {string} to
 * @returns {string} a relative ESM specifier, POSIX-separated
 */
function importSpecifier(from, to) {
  const path = relative(from, to).split(sep).join('/')
  return path.startsWith('.') ? path : `./${path}`
}

/**
 * @param {string} path
 * @returns {string}
 */
function repoRelative(path) {
  return relative(ROOT, path).split(sep).join('/')
}
