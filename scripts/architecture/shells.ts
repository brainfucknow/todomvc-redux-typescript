// Whether the command-line entry points reach only the packages they say they
// do. Data in, faults out, like `./layering.ts`, but about a different subject:
// that one governs the inside of a package, this one governs what a module
// belonging to no package is allowed to depend on.
import { posix } from 'node:path'
import type { ModuleImports } from './layering.ts'

// A CLI shell belongs to no package, so no layer map governs it. What governs
// it is which packages it may reach: a runner that drives the acceptance
// pipeline depends on it, and one that has nothing to do with acceptance must
// not borrow from it. The list is read in both directions, like a layer map, so
// a dependency that is no longer taken stops being granted.
export type ShellDependencies = {
  module: string
  packages: string[]
}

// Which package a specifier lands in, or none for a dependency that is not one
// of the project's own. Package directories do not nest - every module of a
// package sits directly in its directory - so the first match is the only one.
const importedPackage = (module: string, specifier: string, packages: string[]): string | undefined => {
  if (!specifier.startsWith('.')) {
    return undefined
  }
  const target = posix.join(posix.dirname(module), specifier)
  return packages.find((directory) => target.startsWith(`${directory}/`))
}

const packagesReached = (shell: ModuleImports, packages: string[]): string[] => [
  ...new Set(shell.imports.flatMap((specifier) => importedPackage(shell.module, specifier, packages) ?? [])),
]

const dependencyFaults = (module: string, reached: string[], allowed: string[]): string[] => [
  ...reached
    .filter((directory) => !allowed.includes(directory))
    .map((directory) => `${module} imports ${directory}, which its declared dependencies do not include`),
  ...allowed
    .filter((directory) => !reached.includes(directory))
    .map((directory) => `${module} declares a dependency on ${directory}, which it does not import`),
]

export function shellDependencyFaults(
  shells: ModuleImports[],
  declared: ShellDependencies[],
  packages: string[],
): string[] {
  const allowedBy = new Map(declared.map((entry) => [entry.module, entry.packages]))
  const present = new Set(shells.map((shell) => shell.module))
  return [
    ...declared
      .filter((entry) => !present.has(entry.module))
      .map((entry) => `the shell map declares ${entry.module}, which does not exist`),
    ...shells.flatMap((shell) => {
      const allowed = allowedBy.get(shell.module)
      return allowed === undefined
        ? [`${shell.module} is not declared in the shell map`]
        : dependencyFaults(shell.module, packagesReached(shell, packages), allowed)
    }),
  ]
}
