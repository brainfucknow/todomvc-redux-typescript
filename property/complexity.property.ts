import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { complexityByFunction, MODULE_SCOPE } from '../scripts/crap/complexity.ts'

// One decision point each, one per form the counter recognises.
const DECISIONS = [
  'if (a) { a = 1 }',
  'a = a ? 1 : 2',
  'a = a && 1',
  'a = a || 1',
  'a = a ?? 1',
  'a &&= 1',
  'a ||= 1',
  'a ??= 1',
  'while (a) { a = 0 }',
  'for (a = 0; a < 1; a += 1) { a = 1 }',
  'for (const item of [1]) { a = item }',
  'for (const key in { a }) { a = 1 }',
  'do { a = 0 } while (a)',
  'try { a = 1 } catch { a = 2 }',
  'switch (a) { case 1: a = 2 }',
]

const decisions = fc.array(fc.constantFrom(...DECISIONS), { maxLength: 6 })

// The generated source is parsed, so a name has to be an identifier: the digit
// keeps `do` and `if` out.
const functionName = fc.stringMatching(/^[a-z]{1,8}[0-9]$/)

const complexityOf = (source: string, name: string): number => {
  const found = complexityByFunction('measured.ts', source).filter((entry) => entry.name === name)
  expect(found).toHaveLength(1)
  return found[0].complexity
}

describe('complexityByFunction', () => {
  it('charges the module scope one for itself and one per decision outside any function', () => {
    fc.assert(fc.property(decisions, (lines) => {
      const source = ['let a = 0', ...lines].join('\n')
      expect(complexityByFunction('measured.ts', source).map((entry) => entry.name)).toEqual([MODULE_SCOPE])
      expect(complexityOf(source, MODULE_SCOPE)).toBe(lines.length + 1)
    }))
  })

  it('charges a decision to the function holding it, and leaves the module at one', () => {
    fc.assert(fc.property(decisions, functionName, (lines, name) => {
      const source = `let a = 0\nconst ${name} = () => {\n${lines.join('\n')}\n}`
      expect(complexityOf(source, name)).toBe(lines.length + 1)
      expect(complexityOf(source, MODULE_SCOPE)).toBe(1)
    }))
  })

  it('charges a callback its own decisions, so the function it is passed to keeps none', () => {
    fc.assert(fc.property(decisions, functionName, (lines, name) => {
      const source = `let a = 0\nconst ${name} = () => {\n[1].forEach(() => {\n${lines.join('\n')}\n})\n}`
      expect(complexityOf(source, name)).toBe(1)
      expect(complexityOf(source, '<anonymous>')).toBe(lines.length + 1)
    }))
  })

  it('never scores anything below one, and reports every function it found once', () => {
    fc.assert(fc.property(fc.array(decisions, { minLength: 1, maxLength: 4 }), (bodies) => {
      const source = bodies
        .map((lines, index) => `const f${index} = () => {\n${lines.join('\n')}\n}`)
        .join('\nlet a = 0\n')
      const measured = complexityByFunction('measured.ts', source)
      expect(measured.map((entry) => entry.name))
        .toEqual([MODULE_SCOPE, ...bodies.map((_, index) => `f${index}`)])
      expect(measured.every((entry) => entry.complexity >= 1)).toBe(true)
    }))
  })

  it('reports the line a function starts on, so the report can name it', () => {
    fc.assert(fc.property(fc.nat(6), functionName, (blanks, name) => {
      const source = `${'\n'.repeat(blanks)}const ${name} = () => {\n  return 1\n}\n`
      const [found] = complexityByFunction('measured.ts', source).filter((entry) => entry.name === name)
      expect(found.span.start.line).toBe(blanks + 1)
      expect(found.span.end.line).toBe(blanks + 3)
    }))
  })
})
