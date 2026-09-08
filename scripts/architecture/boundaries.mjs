/**
 * How a boundary rule is decided.
 *
 * Two kinds of statement are checked here, and neither is a style rule:
 *
 *   - an allowed- or forbidden-dependency list per group of modules, which is
 *     how a layer says what it is allowed to know about;
 *   - no import cycles anywhere, including cycles made only of type imports,
 *     which erase at run time but still mean two modules each define the other.
 *
 * Deciding only: this module reads no files and knows no paths of its own -
 * `rules.mjs` holds the rules this repository is checked against, and the spec
 * supplies the repository. The two were one file until a mutation scan showed
 * they were two jobs: the deciding half killed 95 of its mutants and the rule
 * data survived nearly all of its own, because data is not falsified by the
 * same tests that falsify an algorithm.
 */

/**
 * @typedef {object} Module
 * @property {string} path repository-relative, with its extension
 * @property {string[]} targets what it imports, per imports.mjs
 */

/**
 * @typedef {object} Rule
 * @property {string} name
 * @property {string[]} files globs over module paths
 * @property {string[]} [except] globs over module paths the rule skips
 * @property {string[]} [allow] the only targets permitted; anything else fails
 * @property {string[]} [deny] targets not permitted
 * @property {string} reason
 */

/**
 * @param {Module[]} modules
 * @param {Rule[]} rules
 * @returns {{module: string, target: string, rule: string, reason: string}[]}
 */
export function violationsOf(modules, rules) {
  return modules.flatMap((module) =>
    rules
      .filter((rule) => appliesTo(rule, module.path))
      .flatMap((rule) =>
        module.targets
          .filter((target) => forbids(rule, target))
          .map((target) => ({
            module: module.path,
            target,
            rule: rule.name,
            reason: rule.reason,
          })),
      ),
  )
}

/**
 * Every import cycle among the given modules, each reported once as the loop
 * itself: the modules in the order they call each other, first repeated last.
 *
 * @param {Module[]} modules
 * @returns {string[][]}
 */
export function cyclesOf(modules) {
  const edges = internalEdges(modules)
  /** @type {Set<string>} */
  const settled = new Set()
  /** @type {string[][]} */
  const found = []

  for (const module of modules) {
    walk(module.path, [], edges, settled, found)
  }
  return distinct(found)
}

/**
 * One entry per loop. A diamond reaches the same loop by two routes and would
 * otherwise report it twice.
 *
 * @param {string[][]} cycles
 * @returns {string[][]}
 */
function distinct(cycles) {
  /** @type {Map<string, string[]>} */
  const byMembers = new Map()
  for (const cycle of cycles) {
    const key = [...new Set(cycle)].sort().join(' ')
    if (!byMembers.has(key)) byMembers.set(key, cycle)
  }
  return [...byMembers.values()]
}

/**
 * @param {string} path
 * @param {string[]} stack
 * @param {Map<string, string[]>} edges
 * @param {Set<string>} settled
 * @param {string[][]} found
 */
function walk(path, stack, edges, settled, found) {
  const looped = stack.indexOf(path)
  if (looped !== -1) {
    found.push([...stack.slice(looped), path])
    return
  }
  if (settled.has(path)) return

  for (const next of edges.get(path) ?? []) {
    walk(next, [...stack, path], edges, settled, found)
  }
  settled.add(path)
}

/**
 * The import graph restricted to modules in the set, with a target matched to
 * the module it names - `acceptance/steps` to `acceptance/steps/index.ts`.
 *
 * @param {Module[]} modules
 * @returns {Map<string, string[]>}
 */
function internalEdges(modules) {
  /** @type {Map<string, string>} */
  const byTarget = new Map()
  for (const module of modules) {
    const withoutExtension = module.path.replace(/\.[^./]+$/, '')
    byTarget.set(withoutExtension, module.path)
    if (withoutExtension.endsWith('/index')) {
      byTarget.set(withoutExtension.slice(0, -'/index'.length), module.path)
    }
  }

  return new Map(
    modules.map((module) => [
      module.path,
      module.targets.flatMap((target) => {
        const resolved = byTarget.get(target)
        return resolved && resolved !== module.path ? [resolved] : []
      }),
    ]),
  )
}

/**
 * @param {Rule} rule
 * @param {string} path
 * @returns {boolean}
 */
function appliesTo(rule, path) {
  return (
    rule.files.some((pattern) => matches(pattern, path)) &&
    !(rule.except ?? []).some((pattern) => matches(pattern, path))
  )
}

/**
 * @param {Rule} rule
 * @param {string} target
 * @returns {boolean}
 */
function forbids(rule, target) {
  if (rule.allow) {
    return !rule.allow.some((pattern) => matches(pattern, target))
  }
  return (rule.deny ?? []).some((pattern) => matches(pattern, target))
}

/**
 * A path glob with the two wildcards a dependency list needs: `*` for one
 * segment, `**` for any number.
 *
 * @param {string} pattern
 * @param {string} value
 * @returns {boolean}
 */
function matches(pattern, value) {
  const expression = pattern
    .split('**')
    .map((part) =>
      part
        .split('*')
        .map((literal) => literal.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
        .join('[^/]*'),
    )
    .join('.*')
  return new RegExp(`^${expression}$`).test(value)
}
