import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { availableScripts, compilerMajorVersion, referencedAssets } from '../acceptance/inspection.ts'

const assetPath = fc.stringMatching(/^\/[a-z0-9][a-z0-9\-./]{0,20}$/)
const assetPaths = fc.array(assetPath, { maxLength: 4 })
const quote = fc.constantFrom('"', "'")

const pageOf = (lines: string[]): string =>
  ['<!doctype html>', '<html><head>', ...lines, '</head><body><div id="root"></div></body></html>'].join('\n')

describe('referencedAssets', () => {
  it('finds every script and stylesheet the page references, in that order', () => {
    fc.assert(fc.property(assetPaths, assetPaths, quote, (scripts, stylesheets, mark) => {
      const page = pageOf([
        ...scripts.map((src) => `<script type="module" crossorigin src=${mark}${src}${mark}></script>`),
        ...stylesheets.map((href) => `<link rel=${mark}stylesheet${mark} crossorigin href=${mark}${href}${mark}>`),
      ])
      expect(referencedAssets(page)).toEqual([...scripts, ...stylesheets])
    }))
  })

  it('ignores links that are not stylesheets', () => {
    fc.assert(fc.property(assetPath, fc.stringMatching(/^[a-z]{1,10}$/), (href, rel) => {
      fc.pre(rel !== 'stylesheet')
      expect(referencedAssets(pageOf([`<link rel="${rel}" href="${href}">`]))).toEqual([])
    }))
  })

  it('ignores scripts with nothing to request', () => {
    fc.assert(fc.property(fc.stringMatching(/^[a-z0-9 ;()]{0,20}$/), (body) => {
      expect(referencedAssets(pageOf([`<script type="module">${body}</script>`]))).toEqual([])
    }))
  })
})

describe('compilerMajorVersion', () => {
  it('reads the major out of any version banner', () => {
    fc.assert(fc.property(fc.nat(999), fc.nat(99), fc.nat(99), (major, minor, patch) => {
      expect(compilerMajorVersion(`Version ${major}.${minor}.${patch}\n`)).toBe(major)
    }))
  })

  it('fails on output carrying no version', () => {
    fc.assert(fc.property(fc.stringMatching(/^[a-z :]{1,20}$/), (output) => {
      expect(() => compilerMajorVersion(output)).toThrow(/version/i)
    }))
  })
})

describe('availableScripts', () => {
  it('lists exactly the script names the manifest declares, in order', () => {
    const scriptName = fc.stringMatching(/^[a-z][a-z0-9:-]{0,10}$/)
    fc.assert(fc.property(fc.dictionary(scriptName, fc.string(), { maxKeys: 6 }), (scripts) => {
      expect(availableScripts(JSON.stringify({ name: 'todomvc', scripts }))).toEqual(Object.keys(scripts))
    }))
  })
})
