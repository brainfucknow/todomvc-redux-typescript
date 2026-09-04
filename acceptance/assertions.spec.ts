// @vitest-environment node
//
// The judgments `production build 4` rests on. The rest of this module's
// judgments are exercised by `hardening/assertions.hardening.ts`.
import { describe, expect, it } from 'vitest'
import type { Response, World } from './assertions.ts'
import { createWorld, responseContains, scriptReferencedByResponse } from './assertions.ts'

const responseOf = (body: string): Response => ({ status: 200, body })

const served = (body: string): World => ({ response: responseOf(body) })

const indexPage = '<script type="module" crossorigin src="/assets/index-BPxiUVWS.js"></script>'
  + '<link rel="stylesheet" href="/assets/index-xAQXB6NR.css">'

describe('scriptReferencedByResponse', () => {
  it('returns the script the index page references', () => {
    expect(scriptReferencedByResponse(served(indexPage))).toBe('/assets/index-BPxiUVWS.js')
  })

  it('does not offer a stylesheet as the bundle', () => {
    expect(() => scriptReferencedByResponse(served('<link rel="stylesheet" href="/a.css">')))
      .toThrow('the index page references no script')
  })

  it('refuses to guess when the page references more than one script', () => {
    expect(() => scriptReferencedByResponse(served('<script src="/a.js"></script><script src="/b.js"></script>')))
      .toThrow('the index page references more than one script: /a.js, /b.js')
  })

  it('needs a response before it can read one', () => {
    expect(() => scriptReferencedByResponse(createWorld()))
      .toThrow('no response has been requested in this scenario')
  })
})

describe('responseContains', () => {
  it('accepts a marker anywhere in the body', () => {
    expect(() => responseContains(responseOf('x Minified React error y'), 'Minified React error'))
      .not.toThrow()
  })

  it('rejects a body without the marker, quoting what it looked for', () => {
    expect(() => responseContains(responseOf('Invalid hook call'), 'Minified React error'))
      .toThrow('response body does not contain "Minified React error"')
  })

  it('reports the body it looked in', () => {
    expect(() => responseContains(responseOf('a development bundle'), 'Minified React error'))
      .toThrow('a development bundle')
  })
})
