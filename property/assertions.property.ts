// Every acceptance step's verdict passes through this module, and until now it
// had no properties: the unit spec covers the two judgments `production build 4`
// rests on, and the hardening tier covers the rest by example. What these say is
// that each judgment agrees with the predicate it is named for, over inputs
// nobody wrote down.
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { AssetResult, World } from '../acceptance/assertions.ts'
import {
  bodyContains,
  bodyEquals,
  bodyExcludes,
  compilationSucceeded,
  createWorld,
  everyAssetRespondsWith,
  majorVersionIsAtLeast,
  nothingReferences,
  observedResponse,
  responseContains,
  scriptIsAvailable,
  scriptReferencedByResponse,
  statusIs,
} from '../acceptance/assertions.ts'
import { referencedScripts } from '../acceptance/inspection.ts'

const body = fc.string({ maxLength: 40 })
const status = fc.integer({ min: 100, max: 599 })
const served = (text: string, code = 200): World => ({ response: { status: code, body: text } })

const accepts = (judge: () => void): boolean => {
  try {
    judge()
    return true
  } catch {
    return false
  }
}

const scriptPath = fc.stringMatching(/^\/[a-z0-9][a-z0-9\-./]{0,20}$/)
const scriptTag = (src: string): string => `<script type="module" src="${src}"></script>`
const stylesheetTag = (href: string): string => `<link rel="stylesheet" href="${href}">`

describe('observedResponse', () => {
  it('hands back the response the scenario observed, whatever it holds', () => {
    fc.assert(fc.property(body, status, (text, code) => {
      expect(observedResponse(served(text, code))).toEqual({ status: code, body: text })
    }))
  })

  it('refuses a scenario that has requested nothing, rather than inventing a response', () => {
    expect(() => observedResponse(createWorld())).toThrow('no response has been requested')
  })
})

describe('statusIs', () => {
  it('accepts exactly the status the scenario observed', () => {
    fc.assert(fc.property(status, status, (observed, expected) => {
      expect(accepts(() => statusIs(served('', observed), String(expected))))
        .toBe(observed === expected)
    }))
  })

  it('names both numbers when they differ, so a failure says which way', () => {
    fc.assert(fc.property(status, status, (observed, expected) => {
      fc.pre(observed !== expected)
      expect(() => statusIs(served('', observed), String(expected)))
        .toThrow(`expected status ${expected} but got ${observed}`)
    }))
  })
})

describe('responseContains', () => {
  it('accepts a body exactly when the body holds the content', () => {
    fc.assert(fc.property(body, body, (text, content) => {
      expect(accepts(() => responseContains({ status: 200, body: text }, content)))
        .toBe(text.includes(content))
    }))
  })

  it('accepts content put anywhere into the body', () => {
    fc.assert(fc.property(body, body, body, (before, content, after) => {
      expect(() => responseContains({ status: 200, body: `${before}${content}${after}` }, content))
        .not.toThrow()
    }))
  })

  it('quotes what it looked for', () => {
    fc.assert(fc.property(body, fc.string({ minLength: 1, maxLength: 20 }), (text, content) => {
      fc.pre(!text.includes(content))
      expect(() => responseContains({ status: 200, body: text }, content))
        .toThrow(`response body does not contain "${content}"`)
    }))
  })

  it('reports a bounded excerpt, so the message does not grow with the bundle', () => {
    const tail = fc.string({ minLength: 1, maxLength: 200 })
    fc.assert(fc.property(tail, tail, (first, second) => {
      const head = 'x'.repeat(1000)
      const message = (text: string): string => {
        try {
          responseContains({ status: 200, body: text }, 'absent-marker')
          return 'accepted'
        } catch (failure) {
          return (failure as Error).message
        }
      }
      expect(message(head + first)).toBe(message(head + second))
    }))
  })
})

describe('bodyContains and bodyExcludes', () => {
  it('are exact opposites of each other on the same observation', () => {
    fc.assert(fc.property(body, body, (text, content) => {
      const world = served(text)
      expect(accepts(() => bodyContains(world, content)))
        .toBe(!accepts(() => bodyExcludes(world, content)))
    }))
  })

  it('judge the observed response, and nothing else', () => {
    fc.assert(fc.property(body, body, (text, content) => {
      const world = served(text)
      expect(accepts(() => bodyContains(world, content)))
        .toBe(accepts(() => responseContains(observedResponse(world), content)))
    }))
  })
})

describe('bodyEquals', () => {
  it('accepts the observed body and only it', () => {
    fc.assert(fc.property(body, body, (text, expected) => {
      expect(accepts(() => bodyEquals(served(text), expected))).toBe(text === expected)
    }))
  })

  it('accepts a body compared with itself, whatever it contains', () => {
    fc.assert(fc.property(body, (text) => {
      expect(() => bodyEquals(served(text), text)).not.toThrow()
    }))
  })
})

describe('everyAssetRespondsWith', () => {
  const assets = fc.array(fc.record({ path: scriptPath, status }), { minLength: 1, maxLength: 6 })

  it('accepts exactly when every asset answered with the expected status', () => {
    fc.assert(fc.property(assets, status, (requested, expected) => {
      expect(accepts(() => everyAssetRespondsWith({ assets: requested }, String(expected))))
        .toBe(requested.every((asset) => asset.status === expected))
    }))
  })

  it('names every asset that did not, and no asset that did', () => {
    fc.assert(fc.property(assets, status, (requested, expected) => {
      const offenders = requested.filter((asset) => asset.status !== expected)
      fc.pre(offenders.length > 0)
      const named = (asset: AssetResult): string => `${asset.path} -> ${asset.status}`
      expect(() => everyAssetRespondsWith({ assets: requested }, String(expected)))
        .toThrow(offenders.map(named).join(', '))
    }))
  })

  it('refuses a scenario that requested no assets, rather than passing vacuously', () => {
    fc.assert(fc.property(status, (expected) => {
      expect(() => everyAssetRespondsWith({ assets: [] }, String(expected)))
        .toThrow('no referenced assets were requested')
      expect(() => everyAssetRespondsWith(createWorld(), String(expected)))
        .toThrow('no referenced assets were requested')
    }))
  })
})

describe('nothingReferences', () => {
  it('accepts exactly when nothing was found, and names everything that was', () => {
    const files = fc.array(fc.stringMatching(/^[a-z]{1,8}\.ts$/), { maxLength: 5 })
    fc.assert(fc.property(fc.stringMatching(/^[a-z-]{1,12}$/), files, (reference, offenders) => {
      const judge = (): void => nothingReferences(reference, offenders)
      expect(accepts(judge)).toBe(offenders.length === 0)
      if (offenders.length > 0) {
        expect(judge).toThrow(`"${reference}" still appears in ${offenders.join(', ')}`)
      }
    }))
  })
})

describe('scriptIsAvailable', () => {
  it('accepts exactly the scripts the manifest declared', () => {
    const name = fc.stringMatching(/^[a-z][a-z:]{0,8}$/)
    fc.assert(fc.property(name, fc.array(name, { maxLength: 8 }), (script, declared) => {
      expect(accepts(() => scriptIsAvailable(script, declared))).toBe(declared.includes(script))
    }))
  })
})

describe('compilationSucceeded', () => {
  it('accepts exit zero and nothing else, and refuses a compiler that never ran', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 20 }), body, (code, output) => {
      expect(accepts(() => compilationSucceeded({ compilation: { code, output } })))
        .toBe(code === 0)
    }))
    expect(() => compilationSucceeded(createWorld())).toThrow('has not been run')
  })
})

describe('majorVersionIsAtLeast', () => {
  it('accepts exactly the majors at or above the minimum', () => {
    fc.assert(fc.property(fc.nat(30), fc.nat(30), (major, minimum) => {
      expect(accepts(() => majorVersionIsAtLeast(major, String(minimum))))
        .toBe(major >= minimum)
    }))
  })

  it('stays accepting as the compiler gets newer', () => {
    fc.assert(fc.property(fc.nat(30), fc.nat(30), fc.nat(30), (minimum, major, bump) => {
      fc.pre(major >= minimum)
      expect(() => majorVersionIsAtLeast(major + bump, String(minimum))).not.toThrow()
    }))
  })
})

describe('scriptReferencedByResponse', () => {
  it('answers with the one script the page references', () => {
    fc.assert(fc.property(scriptPath, fc.array(scriptPath, { maxLength: 3 }), (src, sheets) => {
      const page = [scriptTag(src), ...sheets.map(stylesheetTag)].join('\n')
      expect(scriptReferencedByResponse(served(page))).toBe(src)
    }))
  })

  it('agrees with what the page inspection found, whenever there is one script', () => {
    fc.assert(fc.property(fc.array(scriptPath, { maxLength: 4 }), (sources) => {
      const page = sources.map(scriptTag).join('\n')
      fc.pre(referencedScripts(page).length === 1)
      expect(scriptReferencedByResponse(served(page))).toBe(referencedScripts(page)[0])
    }))
  })

  it('refuses a page referencing no script, whatever else it references', () => {
    fc.assert(fc.property(fc.array(scriptPath, { maxLength: 3 }), (sheets) => {
      expect(() => scriptReferencedByResponse(served(sheets.map(stylesheetTag).join('\n'))))
        .toThrow('the index page references no script')
    }))
  })

  it('refuses to guess between several, and names all of them in page order', () => {
    fc.assert(fc.property(fc.array(scriptPath, { minLength: 2, maxLength: 5 }), (sources) => {
      expect(() => scriptReferencedByResponse(served(sources.map(scriptTag).join('\n'))))
        .toThrow(`the index page references more than one script: ${sources.join(', ')}`)
    }))
  })
})
