// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { manifestBlock, stagedFeature } from './manifest.ts'

const block = [
  '# acceptance-mutation-manifest',
  '# feature: features/api-proxy.feature',
  '# acceptance-mutation-manifest-end',
  '',
].join('\n')

const feature = ['Feature: api proxy', '', '  Scenario: it proxies', '    Given a request', ''].join('\n')

describe('manifestBlock', () => {
  it('takes everything the mutator wrote, up to and including the end marker', () => {
    expect(manifestBlock(stagedFeature(block, feature))).toBe(block)
  })

  it('finds no manifest in a feature the mutator has recorded nothing for', () => {
    expect(manifestBlock(feature)).toBe('')
  })

  it('stops at the first end marker, so feature text below it stays in the feature', () => {
    const staged = stagedFeature(block, `${feature}# acceptance-mutation-manifest-end\n`)
    expect(manifestBlock(staged)).toBe(block)
  })

  it('reads an end marker the mutator indented', () => {
    const indented = block.replace('# acceptance-mutation-manifest-end', '  # acceptance-mutation-manifest-end  ')
    expect(manifestBlock(stagedFeature(indented, feature))).toBe(indented)
  })
})

describe('stagedFeature', () => {
  it('puts the stored manifest ahead of the feature the mutator is given', () => {
    expect(stagedFeature(block, feature)).toBe(`${block}${feature}`)
  })

  it('stages a feature with no stored manifest unchanged', () => {
    expect(stagedFeature('', feature)).toBe(feature)
  })
})
