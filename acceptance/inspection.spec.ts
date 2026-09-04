// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  availableScripts,
  compilerMajorVersion,
  referencedAssets,
  referencedScripts,
} from './inspection.ts'

const indexPage = [
  '<!doctype html>',
  '<html><head>',
  '<script type="module" crossorigin src="/assets/index-BPxiUVWS.js"></script>',
  '<link rel="stylesheet" crossorigin href="/assets/index-xAQXB6NR.css">',
  '</head><body><div id="root"></div></body></html>',
].join('\n')

describe('referencedAssets', () => {
  it('finds script sources and stylesheet hrefs', () => {
    expect(referencedAssets(indexPage)).toEqual(['/assets/index-BPxiUVWS.js', '/assets/index-xAQXB6NR.css'])
  })

  it('ignores inline scripts, which have nothing to request', () => {
    expect(referencedAssets('<script type="module">console.log(1)</script>')).toEqual([])
  })

  it('ignores links that are not stylesheets', () => {
    expect(referencedAssets('<link rel="icon" href="/favicon.ico">')).toEqual([])
  })

  it('accepts single-quoted attributes', () => {
    expect(referencedAssets("<script src='/a.js'></script>")).toEqual(['/a.js'])
  })

  it('returns nothing for a page with no assets', () => {
    expect(referencedAssets('<html><body>hello</body></html>')).toEqual([])
  })
})

describe('referencedScripts', () => {
  it('finds the scripts and leaves the stylesheets out', () => {
    expect(referencedScripts(indexPage)).toEqual(['/assets/index-BPxiUVWS.js'])
  })

  it('ignores an inline script, which is not a served bundle', () => {
    expect(referencedScripts('<script type="module">console.log(1)</script>')).toEqual([])
  })

  it('finds nothing on a page that references no script', () => {
    expect(referencedScripts('<link rel="stylesheet" href="/a.css">')).toEqual([])
  })
})

describe('compilerMajorVersion', () => {
  it('reads the major version out of the tsc version banner', () => {
    expect(compilerMajorVersion('Version 7.0.2\n')).toBe(7)
  })

  it('reads a two-digit major version', () => {
    expect(compilerMajorVersion('Version 12.1.0')).toBe(12)
  })

  it('fails on output that carries no version', () => {
    expect(() => compilerMajorVersion('command not found')).toThrow(/version/i)
  })
})

describe('availableScripts', () => {
  it('lists the script names declared by the manifest', () => {
    const manifest = '{"scripts":{"dev":"vite","build":"vite build"}}'
    expect(availableScripts(manifest)).toEqual(['dev', 'build'])
  })

  it('returns nothing when the manifest declares no scripts', () => {
    expect(availableScripts('{"name":"todomvc"}')).toEqual([])
  })
})
