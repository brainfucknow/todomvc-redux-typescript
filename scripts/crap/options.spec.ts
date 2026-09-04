// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { DEFAULT_GATE, isGated, readOptions } from './options.ts'

describe('readOptions', () => {
  it('gates the whole project at the default when asked for nothing', () => {
    expect(readOptions([])).toEqual({ max: DEFAULT_GATE, reuse: false, all: false, paths: [] })
  })

  it('takes the gate from --max', () => {
    expect(readOptions(['--max', '4']).max).toBe(4)
  })

  it('reads a fractional gate, so a run can ask for more than the whole numbers', () => {
    expect(readOptions(['--max', '2.5']).max).toBe(2.5)
  })

  it('refuses a --max that is not a number, naming what it got', () => {
    expect(() => readOptions(['--max', 'ten'])).toThrow('--max wants a number, got ten')
  })

  it('refuses a --max with nothing after it', () => {
    expect(() => readOptions(['--max'])).toThrow('--max wants a number, got nothing')
  })

  it('reads --reuse and --all', () => {
    const options = readOptions(['--reuse', '--all'])
    expect(options.reuse).toBe(true)
    expect(options.all).toBe(true)
  })

  it('refuses an option it does not know, naming it', () => {
    expect(() => readOptions(['--verbose'])).toThrow('unknown option --verbose')
  })

  it('collects the paths to gate, in the order they were given', () => {
    expect(readOptions(['acceptance', 'src/reducers']).paths).toEqual(['acceptance', 'src/reducers'])
  })

  it('takes the trailing slash off a path, so tab completion gates what it says', () => {
    expect(readOptions(['acceptance//']).paths).toEqual(['acceptance'])
  })

  it('reads options and paths in any order', () => {
    expect(readOptions(['src', '--max', '3', 'acceptance'])).toEqual({
      max: 3,
      reuse: false,
      all: false,
      paths: ['src', 'acceptance'],
    })
  })
})

describe('isGated', () => {
  it('gates every file when no path was named', () => {
    expect(isGated('src/reducers/todos.ts', [])).toBe(true)
  })

  it('gates a file named exactly', () => {
    expect(isGated('src/reducers/todos.ts', ['src/reducers/todos.ts'])).toBe(true)
  })

  it('gates a file under a directory named', () => {
    expect(isGated('src/reducers/todos.ts', ['src/reducers'])).toBe(true)
  })

  it('gates a file under any of the paths named', () => {
    expect(isGated('acceptance/runtime.ts', ['src', 'acceptance'])).toBe(true)
  })

  it('leaves a file outside every path named', () => {
    expect(isGated('src/reducers/todos.ts', ['acceptance'])).toBe(false)
  })

  it('does not gate a sibling whose name merely starts the same way', () => {
    expect(isGated('scripts-old/crap.ts', ['scripts'])).toBe(false)
  })
})
