/**
 * A target is a repository-relative path without its extension, or a package
 * specifier exactly as written, so a rule never has to know whether a dependency is
 * relative.
 *
 * It reads text, not a syntax tree, so an import written inside a comment counts as
 * one. That over-reports rather than missing an edge, and boundaries.spec.mjs pins
 * the exact edges of the modules whose boundaries matter.
 */

import { posix } from 'node:path'

// Names, braces, commas and whitespace only: anything wider lets a pattern run from
// a `from` inside a string literal to a quote further down the file.
const NAMES = String.raw`[\w*{},\s]*?`

const SPECIFIERS = [
  new RegExp(
    String.raw`\b(?:import|export)\s+(?:type\s+)?${NAMES}\bfrom\s*['"]([^'"]+)['"]`,
    'g',
  ),
  /(?:^|[\s;{])import\s*['"]([^'"]+)['"]/gm,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
]

/**
 * @param {string} modulePath repository-relative, with its extension
 * @param {string} source
 * @returns {string[]} targets, deduplicated, in the order they first appear
 */
export function importTargetsOf(modulePath, source) {
  const specifiers = SPECIFIERS.flatMap((pattern) =>
    [...source.matchAll(pattern)].map((match) => match[1]),
  )
  return [
    ...new Set(specifiers.map((specifier) => targetOf(modulePath, specifier))),
  ]
}

/**
 * @param {string} modulePath
 * @param {string} specifier
 * @returns {string}
 */
function targetOf(modulePath, specifier) {
  if (!specifier.startsWith('.')) return specifier
  const resolved = posix.join(posix.dirname(modulePath), specifier)
  return resolved.replace(/\.(m|c)?(ts|tsx|js|jsx|mjs|cjs)$/, '')
}
