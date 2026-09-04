import { describe, expect, test } from 'vitest'
import type { World } from '../acceptance/assertions.ts'
import {
  assetsReferencedByResponse,
  bodyContains,
  bodyEquals,
  bodyExcludes,
  compilationSucceeded,
  createWorld,
  everyAssetRespondsWith,
  majorVersionIsAtLeast,
  nothingReferences,
  observedResponse,
  scriptIsAvailable,
  statusIs,
} from '../acceptance/assertions.ts'

const responded = (status: number, body: string): World => ({ response: { status, body } })

describe('what the scenario has observed', () => {
  test('a fresh world has observed nothing', () => {
    expect(createWorld()).toEqual({})
  })

  test('the observed response is the one the request step recorded', () => {
    expect(observedResponse(responded(204, 'no content'))).toEqual({ status: 204, body: 'no content' })
  })

  test('reading a response before one was requested names the scenario, not the field', () => {
    expect(() => observedResponse(createWorld()))
      .toThrow('no response has been requested in this scenario')
  })

  test('a recorded response is returned even when it is empty and unsuccessful', () => {
    expect(observedResponse(responded(0, ''))).toEqual({ status: 0, body: '' })
  })
})

describe('the response status', () => {
  test('accepts the expected status', () => {
    expect(() => statusIs(responded(200, ''), '200')).not.toThrow()
  })

  test('rejects any other status, reporting both', () => {
    expect(() => statusIs(responded(404, ''), '200'))
      .toThrow('expected status 200 but got 404')
  })

  test('compares numerically, so 200 does not satisfy an expectation of 2000', () => {
    expect(() => statusIs(responded(200, ''), '2000')).toThrow('expected status 2000 but got 200')
  })

  test('needs a response before it can judge one', () => {
    expect(() => statusIs(createWorld(), '200'))
      .toThrow('no response has been requested in this scenario')
  })
})

describe('the response body', () => {
  test('contains accepts a substring anywhere in the body', () => {
    expect(() => bodyContains(responded(200, '<div id="root"></div>'), 'id="root"')).not.toThrow()
  })

  test('contains rejects a substring the body lacks, quoting what was wanted', () => {
    expect(() => bodyContains(responded(200, 'nothing here'), 'id="root"'))
      .toThrow('response body does not contain "id="root""')
  })

  test('contains reports the body it looked in', () => {
    expect(() => bodyContains(responded(200, 'nothing here'), 'missing'))
      .toThrow('nothing here')
  })

  test('does-not-contain accepts a body without the text', () => {
    expect(() => bodyExcludes(responded(200, 'bundled'), '/src/index.tsx')).not.toThrow()
  })

  test('does-not-contain rejects a body that still has it', () => {
    expect(() => bodyExcludes(responded(200, 'see /src/index.tsx'), '/src/index.tsx'))
      .toThrow('response body unexpectedly contains "/src/index.tsx"')
  })

  test('equals accepts only the exact body', () => {
    expect(() => bodyEquals(responded(200, '{"id":1}'), '{"id":1}')).not.toThrow()
  })

  test('equals rejects a body that merely contains the expected text', () => {
    expect(() => bodyEquals(responded(200, '{"id":1} '), '{"id":1}'))
      .toThrow('expected response body\n{"id":1}\nbut got\n{"id":1} ')
  })

  test('a body of exactly 400 characters is reported whole', () => {
    const body = 'x'.repeat(400)
    expect(() => bodyContains(responded(200, body), 'absent')).toThrow(`${body}`)
    expect(() => bodyContains(responded(200, body), 'absent')).not.toThrow('...')
  })

  test('a body of 401 characters is reported as its first 400 followed by an ellipsis', () => {
    const body = `${'x'.repeat(400)}Z`
    const failure = (): void => bodyContains(responded(200, body), 'absent')
    expect(failure).toThrow(`${'x'.repeat(400)}...`)
    expect(failure).not.toThrow('Z')
  })
})

describe('the assets the index page references', () => {
  const indexPage = '<link rel="stylesheet" href="/assets/index.css"><script src="/assets/index.js"></script>'

  test('are read out of the response the scenario has already made', () => {
    expect(assetsReferencedByResponse(responded(200, indexPage)))
      .toEqual(['/assets/index.js', '/assets/index.css'])
  })

  test('an index page referencing nothing is a failure, not an empty pass', () => {
    expect(() => assetsReferencedByResponse(responded(200, '<p>hello</p>')))
      .toThrow('the index page references no scripts or stylesheets')
  })

  test('needs a response first', () => {
    expect(() => assetsReferencedByResponse(createWorld()))
      .toThrow('no response has been requested in this scenario')
  })
})

describe('every referenced asset responds', () => {
  const requested = (...statuses: number[]): World => ({
    assets: statuses.map((status, index) => ({ path: `/asset-${index}`, status })),
  })

  test('accepts when every asset carries the expected status', () => {
    expect(() => everyAssetRespondsWith(requested(200, 200, 200), '200')).not.toThrow()
  })

  test('rejects when a single asset differs, naming that asset and its status', () => {
    expect(() => everyAssetRespondsWith(requested(200, 404, 200), '200'))
      .toThrow('assets did not respond with 200: /asset-1 -> 404')
  })

  test('names every failing asset, not just the first', () => {
    expect(() => everyAssetRespondsWith(requested(500, 200, 404), '200'))
      .toThrow('assets did not respond with 200: /asset-0 -> 500, /asset-2 -> 404')
  })

  test('an unasked scenario fails rather than passing vacuously', () => {
    expect(() => everyAssetRespondsWith(createWorld(), '200'))
      .toThrow('no referenced assets were requested in this scenario')
  })

  test('an empty asset list fails the same way', () => {
    expect(() => everyAssetRespondsWith({ assets: [] }, '200'))
      .toThrow('no referenced assets were requested in this scenario')
  })
})

describe('a location contains no reference', () => {
  test('accepts when nothing referenced it', () => {
    expect(() => nothingReferences('react-scripts', [])).not.toThrow()
  })

  test('rejects on one offender, naming it', () => {
    expect(() => nothingReferences('react-scripts', ['src/vite-env.d.ts']))
      .toThrow('"react-scripts" still appears in src/vite-env.d.ts')
  })

  test('lists every offender', () => {
    expect(() => nothingReferences('react-scripts', ['package.json', 'README.md']))
      .toThrow('"react-scripts" still appears in package.json, README.md')
  })
})

describe('an npm script is available', () => {
  test('accepts a declared script', () => {
    expect(() => scriptIsAvailable('build', ['dev', 'build'])).not.toThrow()
  })

  test('rejects an undeclared script and lists what is declared', () => {
    expect(() => scriptIsAvailable('eject', ['dev', 'build']))
      .toThrow('package.json declares no "eject" script; it has: dev, build')
  })

  test('matches a whole script name, not a prefix of one', () => {
    expect(() => scriptIsAvailable('test', ['test:acceptance']))
      .toThrow('package.json declares no "test" script')
  })
})

describe('the compiler run', () => {
  test('accepts exit code zero', () => {
    expect(() => compilationSucceeded({ compilation: { code: 0, output: '' } })).not.toThrow()
  })

  test('rejects a non-zero exit, reporting the code and the output', () => {
    expect(() => compilationSucceeded({ compilation: { code: 2, output: 'TS1005: expected' } }))
      .toThrow('tsc exited 2:\nTS1005: expected')
  })

  test('a compiler that was never run is a failure, not a pass', () => {
    expect(() => compilationSucceeded(createWorld()))
      .toThrow('the TypeScript compiler has not been run in this scenario')
  })
})

describe('the compiler major version', () => {
  test('accepts a version above the minimum', () => {
    expect(() => majorVersionIsAtLeast(5, '4')).not.toThrow()
  })

  test('accepts a version exactly at the minimum', () => {
    expect(() => majorVersionIsAtLeast(5, '5')).not.toThrow()
  })

  test('rejects a version below the minimum, reporting both', () => {
    expect(() => majorVersionIsAtLeast(4, '5'))
      .toThrow('TypeScript major version 4 is below the required 5')
  })

  test('compares numerically rather than as text', () => {
    expect(() => majorVersionIsAtLeast(10, '9')).not.toThrow()
  })
})
