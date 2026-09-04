// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { complexityByFunction, MODULE_SCOPE } from './complexity.ts'

const complexityOf = (name: string, source: string, fileName = 'sample.ts'): number => {
  const found = complexityByFunction(fileName, source).filter((entry) => entry.name === name)
  expect(found).toHaveLength(1)
  return found[0].complexity
}

const bodyComplexity = (body: string): number =>
  complexityOf('subject', `function subject(a, b) {\n${body}\n}`)

describe('complexityByFunction', () => {
  it('scores a function with no decision at one', () => {
    expect(bodyComplexity('return a + b')).toBe(1)
  })

  it.each([
    ['if', 'if (a) { return 1 }'],
    ['if/else, which is the same one decision', 'if (a) { return 1 } else { return 2 }'],
    ['a conditional expression', 'return a ? 1 : 2'],
    ['for', 'for (let i = 0; i < a; i += 1) { b() }'],
    ['for-in', 'for (const key in a) { b(key) }'],
    ['for-of', 'for (const item of a) { b(item) }'],
    ['while', 'while (a) { b() }'],
    ['do-while', 'do { b() } while (a)'],
    ['catch', 'try { b() } catch (failure) { return failure }'],
    ['&&', 'return a && b'],
    ['||', 'return a || b'],
    ['??', 'return a ?? b'],
    ['&&=', 'a &&= b; return a'],
    ['||=', 'a ||= b; return a'],
    ['??=', 'a ??= b; return a'],
  ])('counts %s as one decision', (_name, body) => {
    expect(bodyComplexity(body)).toBe(2)
  })

  it('counts every case clause, and a default clause as none: it decides nothing', () => {
    expect(bodyComplexity('switch (a) { case 1: return 1; case 2: return 2; default: return 3 }')).toBe(3)
  })

  it('adds up the decisions in one function', () => {
    expect(bodyComplexity('if (a && b) { return a ?? b }\nreturn a ? 1 : 2')).toBe(5)
  })

  it('charges a callback its own decisions, so the function it is passed to is not inflated', () => {
    const source = 'function subject(items) {\n  return items.map((item) => (item ? 1 : 2))\n}'
    expect(complexityOf('subject', source)).toBe(1)
    expect(complexityOf('<anonymous>', source)).toBe(2)
  })

  it('charges a nested function its own decisions', () => {
    const source = 'function subject(a) {\n  function inner(b) { return b || 1 }\n  return inner(a)\n}'
    expect(complexityOf('subject', source)).toBe(1)
    expect(complexityOf('inner', source)).toBe(2)
  })

  it('charges code outside every function to the module scope', () => {
    expect(complexityOf(MODULE_SCOPE, 'export const flag = a || b')).toBe(2)
  })

  it('reports the module scope even for an empty source', () => {
    expect(complexityByFunction('empty.ts', '')).toEqual([
      { name: MODULE_SCOPE, span: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } }, complexity: 1 },
    ])
  })
})

describe('the name a function is reported under', () => {
  const namesIn = (source: string): string[] =>
    complexityByFunction('sample.ts', source).map((entry) => entry.name)

  it.each([
    ['a declaration', 'function named() {}'],
    ['a const arrow', 'const named = () => {}'],
    ['a const function expression', 'const named = function () {}'],
    ['an object member', 'const held = { named: () => {} }'],
    ['an object method', 'const held = { named() {} }'],
    ['a class method', 'class Held { named() {} }'],
    ['an assignment', 'let named; named = () => {}'],
    ['a getter', 'class Held { get named() { return 1 } }'],
  ])('takes it from %s', (_kind, source) => {
    expect(namesIn(source)).toContain('named')
  })

  it('reports a constructor under the name of the class it builds', () => {
    expect(namesIn('class Held { constructor() {} }')).toContain('Held')
  })

  it('reports the constructor of a class with no name of its own as class.constructor', () => {
    expect(namesIn('const held = class { constructor() {} }')).toContain('class.constructor')
  })

  it('reports a function nothing names as anonymous', () => {
    expect(namesIn('run(() => {})')).toContain('<anonymous>')
  })
})

describe('the span a function is reported at', () => {
  const source = [
    'const first = () => 1',
    '',
    'function second(a) {',
    '  return a',
    '}',
  ].join('\n')

  it('starts at a one-based line and a zero-based column, as istanbul reports positions', () => {
    const [, first] = complexityByFunction('sample.ts', source)
    expect(first.span.start).toEqual({ line: 1, column: 14 })
  })

  it('runs to the end of the function', () => {
    const second = complexityByFunction('sample.ts', source)[2]
    expect(second.span).toEqual({ start: { line: 3, column: 0 }, end: { line: 5, column: 1 } })
  })

  it('spans the whole file for the module scope', () => {
    const [moduleScope] = complexityByFunction('sample.ts', source)
    expect(moduleScope.span).toEqual({ start: { line: 1, column: 0 }, end: { line: 5, column: 1 } })
  })
})

describe('parsing', () => {
  it('reads a .tsx file as TSX, where an element is not a type assertion', () => {
    expect(complexityOf('view', 'const view = (busy) => <p>{busy ? 1 : 2}</p>', 'sample.tsx')).toBe(2)
  })

  it('reads type syntax without charging for it', () => {
    expect(complexityOf('widen', 'const widen = (a: string | undefined): string => a ?? ""')).toBe(2)
  })
})
