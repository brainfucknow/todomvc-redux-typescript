import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { manifestBlock, stagedFeature } from '../scripts/mutation-reuse/manifest.ts'

const END = '# acceptance-mutation-manifest-end'

const commentLine = fc.stringMatching(/^# [a-z0-9 :/._-]{1,30}$/)
const featureLine = fc.stringMatching(/^[A-Za-z0-9 :|@#-]{0,30}$/).filter((line) => line.trim() !== END)

const manifest = fc.array(commentLine, { maxLength: 5 })
  .map((lines) => `${[...lines, END].join('\n')}\n`)

const feature = fc.array(featureLine, { minLength: 1, maxLength: 8 })
  .map((lines) => `${lines.join('\n')}\n`)

describe('a stored manifest through a staged feature and back', () => {
  it('comes back exactly as it went in', () => {
    fc.assert(fc.property(manifest, feature, (stored, text) => {
      expect(manifestBlock(stagedFeature(stored, text))).toBe(stored)
    }))
  })

  it('leaves the feature text the mutator is given below it, unchanged', () => {
    fc.assert(fc.property(manifest, feature, (stored, text) => {
      expect(stagedFeature(stored, text).slice(stored.length)).toBe(text)
    }))
  })

  it('stages a feature the mutator has recorded nothing for unchanged, and finds no manifest in it', () => {
    fc.assert(fc.property(feature, (text) => {
      expect(stagedFeature('', text)).toBe(text)
      expect(manifestBlock(text)).toBe('')
    }))
  })

  // Restaging what came back has to reach the same place, or a manifest would
  // grow or shrink by a line on every run that reuses it.
  it('reaches the same staged text when what came back is staged again', () => {
    fc.assert(fc.property(manifest, feature, (stored, text) => {
      const staged = stagedFeature(stored, text)
      expect(stagedFeature(manifestBlock(staged), text)).toBe(staged)
    }))
  })

  it('stops at the manifest the mutator wrote, whatever the feature says below it', () => {
    fc.assert(fc.property(manifest, feature, (stored, text) => {
      expect(manifestBlock(stagedFeature(stored, `${text}${END}\n`))).toBe(stored)
    }))
  })
})
