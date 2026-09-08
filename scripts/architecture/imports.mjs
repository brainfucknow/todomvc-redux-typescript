/**
 * What one module imports, as targets a boundary rule can be written against.
 *
 * A target is either a repository-relative path with no extension, for an
 * import of another module in this repository, or the specifier exactly as
 * written, for a package. So `src/actions/api.ts` importing
 * `'../todo-api/client'` yields `src/todo-api/client`, and importing
 * `'@testing-library/react'` yields `@testing-library/react`. One vocabulary,
 * so a rule never has to know whether a dependency is relative.
 *
 * This reads text rather than a syntax tree, which is the honest limit of it:
 * an `import ... from '...'` written inside a comment would be counted as a
 * real one. That direction is the safe one - the check over-reports rather than
 * missing an edge - and boundaries.spec.mjs asserts the exact edge list of the
 * modules whose boundaries this project cares about, so an invented edge fails
 * loudly rather than hiding.
 */

import { posix } from 'node:path'

/**
 * The clause between `import` and `from` holds names, braces, commas and
 * whitespace and nothing else, which is what stops these patterns running from
 * a `from` in one string literal to a quote somewhere further down the file.
 * That is not hypothetical: the first draft of this module read
 * `'Counterexample: 37 (shrunk from'` in a test as an import.
 */
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
