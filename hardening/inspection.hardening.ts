import { describe, expect, test } from 'vitest'
import { compilerMajorVersion, referencedAssets } from '../acceptance/inspection.ts'

// The index page these run against is emitted by Vite, which writes its tags
// one way. The tolerance the patterns carry - whitespace around `=`, attributes
// on either side of the one being read - is deliberate, and only a test that
// uses it keeps it from being narrowed away by accident.
describe('reading asset references out of markup', () => {
  test('a script src surrounded by whitespace is still a reference', () => {
    expect(referencedAssets('<script src = "/a.js"></script>')).toEqual(['/a.js'])
  })

  test('attributes after the src do not hide it', () => {
    expect(referencedAssets('<script src="/a.js" defer async></script>')).toEqual(['/a.js'])
  })

  test('a stylesheet href surrounded by whitespace is still a reference', () => {
    expect(referencedAssets('<link rel="stylesheet" href = "/a.css">')).toEqual(['/a.css'])
  })

  test('a rel attribute surrounded by whitespace still marks a stylesheet', () => {
    expect(referencedAssets('<link rel = "stylesheet" href="/a.css">')).toEqual(['/a.css'])
  })

  test('an unquoted rel still marks a stylesheet', () => {
    expect(referencedAssets('<link rel=stylesheet href="/a.css">')).toEqual(['/a.css'])
  })

  test('a stylesheet link with no href is skipped rather than reported as a reference', () => {
    expect(referencedAssets('<link rel="stylesheet"><link rel="stylesheet" href="/a.css">'))
      .toEqual(['/a.css'])
  })

  test('a page whose only stylesheet link has no href references nothing', () => {
    expect(referencedAssets('<link rel="stylesheet">')).toEqual([])
  })

  test('scripts come before stylesheets whatever order the page lists them in', () => {
    expect(referencedAssets('<link rel="stylesheet" href="/a.css"><script src="/a.js"></script>'))
      .toEqual(['/a.js', '/a.css'])
  })
})

describe('reading the compiler version banner', () => {
  test('the failure quotes the output without its surrounding whitespace', () => {
    expect(() => compilerMajorVersion('  command not found  \n'))
      .toThrow('no compiler version in output: command not found')
  })
})
