import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { APS_BIN, APS_HOME, ROOT } from './aps.mjs'

/**
 * `npm run acceptance:install`: builds the APS commands from the specification
 * repository into where `aps.mjs` looks. APS's Go commands are the documented
 * fallback where Babashka is absent, so this needs Go and, first time, a clone.
 *
 * $APS_SOURCE points at an existing checkout; $GO_BIN names a Go off PATH.
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
