import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { DEFAULT_GATE, isGated, readOptions } from '../scripts/crap/options.ts'

const path = fc.stringMatching(/^[a-z]{1,6}(\/[a-z]{1,6}){0,2}$/)
const paths = fc.array(path, { maxLength: 4 })
const flags = fc.subarray(['--reuse', '--all'])

const interleave = (paths: string[], flags: string[], places: number[]): string[] => {
  const argv = [...paths]
  flags.forEach((flag, index) => argv.splice(places[index] % (argv.length + 1), 0, flag))
  return argv
}

describe('readOptions', () => {
  it('keeps the paths in the order they were given, and defaults everything unasked for', () => {
    fc.assert(fc.property(paths, (given) => {
      expect(readOptions(given)).toEqual({ max: DEFAULT_GATE, reuse: false, all: false, paths: given })
    }))
  })

  it('reads a flag wherever it appears among the paths', () => {
    fc.assert(fc.property(paths, flags, fc.array(fc.nat(9), { minLength: 2, maxLength: 2 }),
      (given, asked, places) => {
        const options = readOptions(interleave(given, asked, places))
        expect(options.paths).toEqual(given)
        expect(options.reuse).toBe(asked.includes('--reuse'))
        expect(options.all).toBe(asked.includes('--all'))
      }))
  })

  it('takes the gate from --max, wherever it appears', () => {
    fc.assert(fc.property(paths, fc.integer({ min: -50, max: 500 }), fc.nat(9), (given, max, place) => {
      const argv = [...given]
      argv.splice(place % (argv.length + 1), 0, '--max', String(max))
      expect(readOptions(argv).max).toBe(max)
    }))
  })

  it('refuses a gate that is not a number, naming what it was given', () => {
    fc.assert(fc.property(fc.stringMatching(/^[a-z]{1,8}$/), (value) => {
      expect(() => readOptions(['--max', value])).toThrow(`--max wants a number, got ${value}`)
    }))
  })

  it('refuses an option it does not know', () => {
    fc.assert(fc.property(fc.stringMatching(/^-{1,2}[a-z]{1,8}$/), (option) => {
      fc.pre(!['--max', '--reuse', '--all'].includes(option))
      expect(() => readOptions([option])).toThrow(`unknown option ${option}`)
    }))
  })

  it('reads a path the same however many trailing slashes it carries', () => {
    fc.assert(fc.property(path, fc.integer({ min: 1, max: 3 }), (given, slashes) => {
      expect(readOptions([`${given}${'/'.repeat(slashes)}`]).paths).toEqual(readOptions([given]).paths)
    }))
  })
})

describe('isGated', () => {
  it('gates every file when no path was named', () => {
    fc.assert(fc.property(path, (file) => {
      expect(isGated(file, [])).toBe(true)
    }))
  })

  it('gates a directory it was given, and everything under it', () => {
    fc.assert(fc.property(path, path, paths, (directory, rest, others) => {
      expect(isGated(directory, [...others, directory])).toBe(true)
      expect(isGated(`${directory}/${rest}`, [...others, directory])).toBe(true)
    }))
  })

  it('does not gate a sibling that merely starts with the same characters', () => {
    fc.assert(fc.property(path, fc.stringMatching(/^[a-z]{1,4}$/), (directory, suffix) => {
      expect(isGated(`${directory}${suffix}`, [directory])).toBe(false)
    }))
  })
})
