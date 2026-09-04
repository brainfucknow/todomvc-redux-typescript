// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { fingerprint, selectedFiles } from './fingerprint.ts'

const listing = (entries: Record<string, string[]>) =>
  (directory: string): string[] => entries[directory] ?? []

describe('selectedFiles', () => {
  it('takes the entries with the suffix, under the directory that held them', () => {
    const selected = selectedFiles(
      [{ directory: 'property', suffix: '.property.ts' }],
      listing({ property: ['todos.property.ts', 'notes.md'] }),
    )
    expect(selected).toEqual(['property/todos.property.ts'])
  })

  it('keeps a nested entry under its directory, so a subdirectory is covered too', () => {
    const selected = selectedFiles(
      [{ directory: 'scripts', suffix: '.spec.ts' }],
      listing({ scripts: ['crap/score.spec.ts'] }),
    )
    expect(selected).toEqual(['scripts/crap/score.spec.ts'])
  })

  it('leaves out the entries the selection excludes', () => {
    const selected = selectedFiles(
      [{ directory: 'acceptance', suffix: '.ts', without: '.spec.ts' }],
      listing({ acceptance: ['runtime.ts', 'runtime.spec.ts'] }),
    )
    expect(selected).toEqual(['acceptance/runtime.ts'])
  })

  it('covers every selection it is given', () => {
    const selected = selectedFiles(
      [
        { directory: 'acceptance', suffix: '.spec.ts' },
        { directory: 'hardening', suffix: '.hardening.ts' },
      ],
      listing({ acceptance: ['runtime.spec.ts'], hardening: ['runtime.hardening.ts'] }),
    )
    expect(selected).toEqual(['acceptance/runtime.spec.ts', 'hardening/runtime.hardening.ts'])
  })

  it('selects nothing from a directory that holds nothing', () => {
    expect(selectedFiles([{ directory: 'property', suffix: '.ts' }], listing({}))).toEqual([])
  })
})

describe('fingerprint', () => {
  const file = (path: string, content: string) => ({ path, content })

  it('reads as a sha256 digest', () => {
    expect(fingerprint([file('a.ts', 'x')])).toMatch(/^sha256:[0-9a-f]{64}$/)
  })

  it('moves when a file it covers is edited', () => {
    expect(fingerprint([file('a.ts', 'x')])).not.toBe(fingerprint([file('a.ts', 'y')]))
  })

  it('moves when a file it covers is renamed', () => {
    expect(fingerprint([file('a.ts', 'x')])).not.toBe(fingerprint([file('b.ts', 'x')]))
  })

  it('moves when a file joins the set', () => {
    expect(fingerprint([file('a.ts', 'x')])).not.toBe(fingerprint([file('a.ts', 'x'), file('b.ts', 'y')]))
  })

  it('does not move with the order the files were listed in', () => {
    const files = [file('a.ts', 'x'), file('b.ts', 'y')]
    expect(fingerprint([...files].reverse())).toBe(fingerprint(files))
  })

  it('leaves the list it was given in the order it was given', () => {
    const files = [file('b.ts', 'y'), file('a.ts', 'x')]
    fingerprint(files)
    expect(files.map(({ path }) => path)).toEqual(['b.ts', 'a.ts'])
  })
})
