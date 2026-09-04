import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { FileSelection } from '../scripts/mutation-reuse/fingerprint.ts'
import { fingerprint, selectedFiles } from '../scripts/mutation-reuse/fingerprint.ts'

const directory = fc.stringMatching(/^[a-z][a-z0-9-]{0,8}$/)
const suffix = fc.stringMatching(/^\.[a-z]{1,6}$/)
const entryName = fc.stringMatching(/^[a-z][a-z0-9-]{0,8}$/)

const namedContent = fc.record({
  path: fc.stringMatching(/^[a-z][a-z0-9\-/.]{0,20}$/),
  content: fc.string(),
})
const fileSet = fc.uniqueArray(namedContent, { selector: (file) => file.path, minLength: 1, maxLength: 5 })

const shuffled = <T>(items: T[]) =>
  fc.shuffledSubarray(items, { minLength: items.length, maxLength: items.length })

const listingOf = (entries: Record<string, string[]>) =>
  (asked: string): string[] => entries[asked] ?? []

describe('selectedFiles', () => {
  const selection = fc.record({ directory, suffix })

  const names = fc.uniqueArray(entryName, { maxLength: 6 })

  it('answers with entries of the directory it was asked about, carrying the suffix it asked for', () => {
    fc.assert(fc.property(selection, names, names, (choice, wanted, ignored) => {
      const others = ignored.map((name) => `${name}.other`)
      fc.pre(others.every((entry) => !entry.endsWith(choice.suffix)))
      const entries = [...wanted.map((name) => `${name}${choice.suffix}`), ...others]
      expect(selectedFiles([choice], listingOf({ [choice.directory]: entries })))
        .toEqual(wanted.map((name) => `${choice.directory}/${name}${choice.suffix}`))
    }))
  })

  it('never selects an entry the exclusion covers', () => {
    fc.assert(fc.property(directory, names, (dir, kept) => {
      const choice: FileSelection = { directory: dir, suffix: '.ts', without: '.spec.ts' }
      const entries = kept.flatMap((name) => [`${name}.ts`, `${name}.spec.ts`])
      expect(selectedFiles([choice], listingOf({ [dir]: entries })))
        .toEqual(kept.map((name) => `${dir}/${name}.ts`))
    }))
  })

  it('answers with the selections in the order it was given them', () => {
    fc.assert(fc.property(fc.uniqueArray(directory, { minLength: 2, maxLength: 4 }), (directories) => {
      const entries = Object.fromEntries(directories.map((dir) => [dir, [`${dir}.ts`]]))
      const selected = selectedFiles(directories.map((dir) => ({ directory: dir, suffix: '.ts' })), listingOf(entries))
      expect(selected).toEqual(directories.map((dir) => `${dir}/${dir}.ts`))
    }))
  })

  it('selects nothing from directories that list nothing', () => {
    fc.assert(fc.property(fc.array(selection, { maxLength: 4 }), (selections) => {
      expect(selectedFiles(selections, () => [])).toEqual([])
    }))
  })
})

describe('fingerprint', () => {
  it('reads as a sha256 digest whatever it covers', () => {
    fc.assert(fc.property(fc.array(namedContent, { maxLength: 5 }), (files) => {
      expect(fingerprint(files)).toMatch(/^sha256:[0-9a-f]{64}$/)
    }))
  })

  it('does not depend on the order the files were listed in', () => {
    fc.assert(fc.property(fileSet.chain((files) => shuffled(files).map((order) => ({ files, order }))),
      ({ files, order }) => {
        expect(fingerprint(order)).toBe(fingerprint(files))
      }))
  })

  it('leaves the list it was given in the order it was given', () => {
    fc.assert(fc.property(fileSet, (files) => {
      const before = files.map(({ path }) => path)
      fingerprint(files)
      expect(files.map(({ path }) => path)).toEqual(before)
    }))
  })

  it('moves when any one file it covers is rewritten', () => {
    fc.assert(fc.property(fileSet, fc.string(), (files, content) => {
      fc.pre(files[0].content !== content)
      expect(fingerprint([{ ...files[0], content }, ...files.slice(1)])).not.toBe(fingerprint(files))
    }))
  })

  it('moves when a file joins what it covers', () => {
    fc.assert(fc.property(fileSet, namedContent, (files, extra) => {
      fc.pre(files.every((file) => file.path !== extra.path))
      expect(fingerprint([...files, extra])).not.toBe(fingerprint(files))
    }))
  })

  // The digest runs path and content together, so without a separator between
  // them a file could be renamed into another one's content and read as
  // unchanged - which is the failure this whole module exists to prevent.
  it('tells a rename from an edit that moves the same text across the boundary', () => {
    fc.assert(fc.property(
      fc.stringMatching(/^[a-z]{1,8}$/),
      fc.stringMatching(/^[a-z]{1,8}$/),
      (left, right) => {
        expect(fingerprint([{ path: left, content: right }]))
          .not.toBe(fingerprint([{ path: `${left}${right}`, content: '' }]))
      }))
  })
})
