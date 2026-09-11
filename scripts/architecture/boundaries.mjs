/**
 * Deciding only: it reads no files and knows no paths of its own. `rules.mjs` holds
 * the rules, and the spec supplies the repository.
 *
 * A cycle counts even when it is made only of type imports: those erase at run
 * time, but two modules still define each other.
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
 * Each cycle once, as the loop itself: the modules in order, first repeated last.
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
 * A diamond reaches the same loop by two routes and would otherwise report it twice.
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
 * Restricted to modules in the set, with a target matched to the module it names -
 * `acceptance/steps` to `acceptance/steps/index.ts`.
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
 * `*` matches one segment, `**` any number.
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
