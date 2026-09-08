import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { ApsToolMissing, ROOT, resolveApsTool } from './aps.mjs'

/**
 * `npm run acceptance`: parse, generate, execute.
 *
 *   features/*.feature -> gherkin-parser -> build/acceptance/ir/*.json
 *                      -> generate-entrypoints -> build/acceptance/generated/
 *                      -> vitest --config vitest.acceptance.config.mts
 *
 * The generated tests are a Vitest run of their own, never part of
 * `npm test`: acceptance tests and unit tests answer different questions and
 * are counted separately.
 *
 * Both derived directories are rebuilt from scratch each run, so a feature that
 * was renamed or deleted cannot leave an entry point behind that still passes.
 */

const FEATURES = join(ROOT, 'features')
const IR_DIR = join(ROOT, 'build/acceptance/ir')
const GENERATED_DIR = join(ROOT, 'build/acceptance/generated')
const GENERATOR = join(ROOT, 'scripts/acceptance/generate-entrypoints.mjs')

const parser = resolveParser()
const features = readdirSync(FEATURES)
  .filter((entry) => entry.endsWith('.feature'))
  .sort()

if (features.length === 0) fail(`No .feature files in ${FEATURES}`)

for (const directory of [IR_DIR, GENERATED_DIR]) {
  rmSync(directory, { recursive: true, force: true })
  mkdirSync(directory, { recursive: true })
}

for (const feature of features) {
  const ir = join(IR_DIR, `${feature.replace(/\.feature$/, '')}.json`)
  run(parser, [join(FEATURES, feature), ir])
  run(process.execPath, [GENERATOR, ir, GENERATED_DIR])
}

process.exit(runVitest())

/** @returns {string} */
function resolveParser() {
  try {
    return resolveApsTool('gherkin-parser')
  } catch (failure) {
    if (!(failure instanceof ApsToolMissing)) throw failure
    fail(failure.message)
  }
}

/** @returns {number} */
function runVitest() {
  const vitest = join(ROOT, 'node_modules/vitest/vitest.mjs')
  if (!existsSync(vitest)) fail(`Vitest is not installed at ${vitest}`)

  const { status, error } = spawnSync(
    process.execPath,
    [
      vitest,
      'run',
      '--config',
      'vitest.acceptance.config.mts',
      ...process.argv.slice(2),
    ],
    { cwd: ROOT, stdio: 'inherit' },
  )
  if (error) fail(`vitest could not be started: ${error.message}`)
  return status ?? 1
}

/**
 * @param {string} command
 * @param {string[]} args
 */
function run(command, args) {
  const { status, error, stderr } = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
  })
  if (error) fail(`${command} could not be started: ${error.message}`)
  if (status !== 0) {
    fail(`${command} ${args.join(' ')} exited ${status}\n${stderr ?? ''}`)
  }
}

/**
 * @param {string} message
 * @returns {never}
 */
function fail(message) {
  process.stderr.write(`acceptance: ${message}\n`)
  process.exit(1)
}
