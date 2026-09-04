// @vitest-environment node
//
// The rule on shells written by hand. `packages.spec.ts` runs it over the real
// entry points under `scripts/`.
import { describe, expect, it } from 'vitest'
import type { ModuleImports } from './layering.ts'
import type { ShellDependencies } from './shells.ts'
import { shellDependencyFaults } from './shells.ts'

describe('shellDependencyFaults', () => {
  const packages = ['acceptance', 'scripts/mutation-reuse']
  const declared: ShellDependencies[] = [{ module: 'scripts/run.ts', packages: ['acceptance'] }]
  const shell = (imports: string[]): ModuleImports[] => [{ module: 'scripts/run.ts', imports }]

  it('passes a shell importing the package it declares', () => {
    expect(shellDependencyFaults(shell(['../acceptance/pipeline.ts']), declared, packages)).toEqual([])
  })

  it('reports a shell importing a package it does not declare', () => {
    expect(shellDependencyFaults(shell([
      '../acceptance/pipeline.ts',
      './mutation-reuse/stamp.ts',
    ]), declared, packages))
      .toEqual(['scripts/run.ts imports scripts/mutation-reuse, which its declared dependencies do not include'])
  })

  it('reports a declared dependency the shell no longer takes', () => {
    expect(shellDependencyFaults(shell([]), declared, packages))
      .toEqual(['scripts/run.ts declares a dependency on acceptance, which it does not import'])
  })

  it('names a package once however many of its modules the shell imports', () => {
    expect(shellDependencyFaults(shell([
      '../acceptance/pipeline.ts',
      '../acceptance/layout.ts',
    ]), declared, packages)).toEqual([])
  })

  it('ignores dependencies that are not one of the project packages', () => {
    expect(shellDependencyFaults(shell([
      '../acceptance/pipeline.ts',
      'node:path',
      '../vitest.mutation.config.ts',
      './crap/score.ts',
    ]), declared, packages)).toEqual([])
  })

  // A dependency that is not relative is resolved by the package manager, not
  // against this file, so an installed package whose name happens to spell one
  // of ours is not ours.
  it('does not take an installed package for a project package it is named like', () => {
    expect(shellDependencyFaults(shell([
      '../acceptance/pipeline.ts',
      'mutation-reuse/stamp.ts',
    ]), declared, packages)).toEqual([])
  })

  it('does not take a directory a package name is a prefix of for that package', () => {
    expect(shellDependencyFaults(shell(['../acceptance-extra/pipeline.ts']), declared, packages))
      .toEqual(['scripts/run.ts declares a dependency on acceptance, which it does not import'])
  })

  it('reports a shell the map does not declare', () => {
    expect(shellDependencyFaults([{ module: 'scripts/other.ts', imports: [] }], declared, packages))
      .toEqual([
        'the shell map declares scripts/run.ts, which does not exist',
        'scripts/other.ts is not declared in the shell map',
      ])
  })

  it('reports a declared shell that no longer exists', () => {
    expect(shellDependencyFaults([], declared, packages))
      .toEqual(['the shell map declares scripts/run.ts, which does not exist'])
  })
})
