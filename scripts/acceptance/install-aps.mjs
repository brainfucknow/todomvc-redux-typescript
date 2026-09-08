import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { APS_BIN, APS_HOME, ROOT } from './aps.mjs'

/**
 * `npm run acceptance:install`. Puts the APS commands where `aps.mjs` looks for
 * them, by building them from the specification repository rather than
 * reimplementing or vendoring them.
 *
 * Babashka is the primary runtime APS names; where it is absent - as it is
 * here - the repository's Go commands are the documented fallback, so this
 * needs Go and, the first time, network access to clone.
 *
 * $APS_SOURCE points at a checkout that already exists and skips the clone.
 * $GO_BIN names a Go that is not on PATH.
 */

const APS_REPO =
  'https://github.com/unclebob/Acceptance-Pipeline-Specification.git'
const source = process.env.APS_SOURCE ?? join(APS_HOME, 'src')

const go = resolveGo()
if (!go) {
  fail(
    'No Go toolchain. APS builds its fallback commands with Go; install Go, or\n' +
      'set $APS_BIN_DIR to a directory that already holds the APS commands.',
  )
}

if (!existsSync(source)) {
  mkdirSync(APS_HOME, { recursive: true })
  run('git', ['clone', '--depth', '1', APS_REPO, source], ROOT)
}

mkdirSync(APS_BIN, { recursive: true })
run(String(go), ['build', '-o', APS_BIN, './cmd/...'], source)

process.stdout.write(`APS commands built into ${APS_BIN}\n`)

/** @returns {string | undefined} */
function resolveGo() {
  for (const candidate of [process.env.GO_BIN, '/usr/local/go/bin/go', 'go']) {
    if (!candidate) continue
    const { status } = spawnSync(candidate, ['version'], { stdio: 'ignore' })
    if (status === 0) return candidate
  }
  return undefined
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {string} cwd
 */
function run(command, args, cwd) {
  const { status, error } = spawnSync(command, args, { cwd, stdio: 'inherit' })
  if (error) fail(`${command} could not be started: ${error.message}`)
  if (status !== 0) fail(`${command} ${args.join(' ')} exited ${status}`)
}

/** @param {string} message */
function fail(message) {
  process.stderr.write(`acceptance:install: ${message}\n`)
  process.exit(1)
}
