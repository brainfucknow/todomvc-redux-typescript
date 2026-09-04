import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { ModuleImports } from '../scripts/architecture/layering.ts'
import type { ShellDependencies } from '../scripts/architecture/shells.ts'
import { shellDependencyFaults } from '../scripts/architecture/shells.ts'

describe('shellDependencyFaults', () => {
  const packageNames = fc.uniqueArray(fc.stringMatching(/^[a-z]{1,6}$/), { minLength: 2, maxLength: 5 })
  const shellName = fc.stringMatching(/^[a-z]{1,6}$/).map((name) => `scripts/${name}.ts`)

  const memberOf = (directory: string): string => `../${directory}/member.ts`

  const declaring = (module: string, packages: string[]): ShellDependencies[] => [{ module, packages }]
  const importing = (module: string, imports: string[]): ModuleImports[] => [{ module, imports }]

  it('reports nothing when a shell imports exactly the packages it declares', () => {
    fc.assert(fc.property(shellName, packageNames, fc.nat(4), (module, packages, pick) => {
      const taken = packages.slice(0, (pick % packages.length) + 1)
      expect(shellDependencyFaults(
        importing(module, taken.map(memberOf)),
        declaring(module, taken),
        packages,
      )).toEqual([])
    }))
  })

  it('reports every package a shell reaches without declaring it', () => {
    fc.assert(fc.property(shellName, packageNames, (module, packages) => {
      const [declared, ...undeclared] = packages
      expect(shellDependencyFaults(
        importing(module, packages.map(memberOf)),
        declaring(module, [declared]),
        packages,
      )).toEqual(undeclared.map((directory) =>
        `${module} imports ${directory}, which its declared dependencies do not include`))
    }))
  })

  it('reports every declared dependency a shell has stopped taking', () => {
    fc.assert(fc.property(shellName, packageNames, (module, packages) => {
      expect(shellDependencyFaults(importing(module, []), declaring(module, packages), packages))
        .toEqual(packages.map((directory) =>
          `${module} declares a dependency on ${directory}, which it does not import`))
    }))
  })

  // Node builtins, npm packages and the project's root-level configs are not
  // packages, so nothing about them is this rule's business.
  it('says nothing about a dependency that lands in no declared package', () => {
    const outside = fc.array(
      fc.stringMatching(/^(node:[a-z]{1,6}|[a-z]{1,8}|\.\.\/[a-z]{1,8}\.ts|\.\/[a-z]{1,8}\.ts)$/),
      { maxLength: 4 },
    )
    fc.assert(fc.property(shellName, packageNames, outside, (module, packages, imports) => {
      fc.pre(imports.every((specifier) => !packages.some((directory) => specifier.includes(`${directory}/`))))
      expect(shellDependencyFaults(importing(module, imports), declaring(module, []), packages)).toEqual([])
    }))
  })

  it('makes the shell map and the tree agree in both directions', () => {
    fc.assert(fc.property(shellName, shellName, packageNames, (declared, found, packages) => {
      fc.pre(declared !== found)
      expect(shellDependencyFaults(importing(found, []), declaring(declared, []), packages)).toEqual([
        `the shell map declares ${declared}, which does not exist`,
        `${found} is not declared in the shell map`,
      ])
    }))
  })
})
