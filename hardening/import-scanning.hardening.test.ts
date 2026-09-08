import { describe, expect, it } from 'vitest'
import { importTargetsOf } from '../scripts/architecture/imports.mjs'

/**
 * Eleven of 48 mutants survived `scripts/architecture/imports.mjs`, and every
 * one of them was a widened regex: a character class opened up, a `\s*` that
 * stopped tolerating whitespace, an anchor removed. The spec drove each pattern
 * with one well-formed example, so nothing pinned where a pattern stops.
 *
 * That matters more here than the mutation score suggests. This module builds
 * the graph every boundary rule is checked against, and the two directions it
 * can be wrong in are not symmetrical: a pattern that reads too little drops an
 * edge and lets a real violation through silently, while one that reads too
 * much invents an edge and fails a rule nobody broke. The architect met the
 * second when a `from` inside a test's prose was read as an import. These are
 * the first.
 *
 * Module paths below are deliberately under `x/`, not `src/`: this file's own
 * string literals are read as imports when the boundary checker scans
 * `hardening/`, which is the over-reading it exists to catch.
 */

describe('where a side-effect import starts and stops', () => {
  it('finds one after a statement on the same line, and one with no space at all', () => {
    expect(
      importTargetsOf(
        'x/tool.mjs',
        ["const one = 1; import './side.mjs'", "import'./tight.mjs'"].join(
          '\n',
        ),
      ),
    ).toStrictEqual(['x/side', 'x/tight'])
  })

  it('does not find one inside a longer word', () => {
    expect(
      importTargetsOf('x/tool.mjs', "reimport './nothing-here.mjs'"),
    ).toStrictEqual([])
  })
})

describe('where a call-shaped import starts and stops', () => {
  it('reads a dynamic import and a require spaced out inside their parentheses', () => {
    expect(
      importTargetsOf(
        'x/tool.mjs',
        ["await import( './late.mjs' )", "require( 'node:fs' )"].join('\n'),
      ),
    ).toStrictEqual(['x/late', 'node:fs'])
  })

  it('does not read a call whose name merely begins with import or require', () => {
    expect(
      importTargetsOf(
        'x/tool.mjs',
        [
          "importSomething('./nothing-here.mjs')",
          "requireAll('./modules')",
        ].join('\n'),
      ),
    ).toStrictEqual([])
  })
})

describe('stripping the extension off a resolved path', () => {
  it('strips a plain one, not only the .mjs the spec happened to use', () => {
    expect(importTargetsOf('x/a.ts', "import b from './b.ts'")).toStrictEqual([
      'x/b',
    ])
    expect(importTargetsOf('x/a.ts', "import c from './c.js'")).toStrictEqual([
      'x/c',
    ])
  })

  it('strips the last one only, leaving a dotted filename alone', () => {
    expect(
      importTargetsOf('x/a.ts', "import fixture from './config.test.ts'"),
    ).toStrictEqual(['x/config.test'])
  })

  it('leaves an extension it does not know, however it looks inside', () => {
    expect(
      importTargetsOf('x/a.ts', "import data from './data.json'"),
    ).toStrictEqual(['x/data.json'])
  })
})
