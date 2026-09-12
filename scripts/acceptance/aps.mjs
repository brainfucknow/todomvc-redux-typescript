import { accessSync, constants, existsSync } from 'node:fs'
import { delimiter, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Finds the APS tools; `install-aps.mjs` is what puts them somewhere findable.
 * Search order, first hit wins:
 *
 *   1. $GHERKIN_PARSER (per tool: the name upper-cased, hyphens to underscores)
 *   2. $APS_BIN_DIR/<tool>
 *   3. <repo>/.aps/bin/<tool>
 *   4. <tool> on PATH
 */

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const APS_HOME = join(ROOT, '.aps')
export const APS_BIN = join(APS_HOME, 'bin')

export class ApsToolMissing extends Error {}

/**
 * @param {string} tool
 * @returns {string} absolute path to the executable
 * @throws {ApsToolMissing} when the tool is nowhere this project looks
 */
export function resolveApsTool(tool) {
  const candidates = [
    process.env[tool.toUpperCase().replaceAll('-', '_')],
    process.env.APS_BIN_DIR && join(process.env.APS_BIN_DIR, tool),
    join(APS_BIN, tool),
    ...onPath(tool),
  ]

  for (const candidate of candidates) {
    if (candidate && isExecutable(candidate)) return candidate
  }

  throw new ApsToolMissing(
    `${tool} not found. It is an APS tool, so this project does not ship one.\n` +
      `Install the APS commands with \`npm run acceptance:install\`, or point\n` +
      `$APS_BIN_DIR at a directory that already holds them.`,
  )
}

/**
 * @param {string} tool
 * @returns {string[]}
 */
function onPath(tool) {
  return (process.env.PATH ?? '')
    .split(delimiter)
    .filter(Boolean)
    .map((entry) => join(entry, tool))
}

/**
 * @param {string} candidate
 * @returns {boolean}
 */
function isExecutable(candidate) {
  if (!existsSync(candidate)) return false
  try {
    accessSync(candidate, constants.X_OK)
    return true
  } catch {
    return false
  }
}
