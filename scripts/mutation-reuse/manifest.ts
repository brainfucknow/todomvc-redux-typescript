// The gherkin manifest, as it travels in and out of a staged feature file.
//
// gherkin-mutator keeps its record of what it has already killed in a comment
// block at the top of the feature file it is given. `features/` is the
// Specifier's and PLAN section 4 puts mutation manifests under `.mutation/`, so
// the runner works on a staged copy: the stored manifest goes in ahead of the
// feature text on the way through, and comes back out afterwards.

const MANIFEST_END = '# acceptance-mutation-manifest-end'

// Everything up to and including the end marker. A feature the mutator has not
// recorded anything for yet carries no marker, and so no manifest to store.
export const manifestBlock = (staged: string): string => {
  const lines = staged.split('\n')
  const end = lines.findIndex((line) => line.trim() === MANIFEST_END)
  return end < 0 ? '' : `${lines.slice(0, end + 1).join('\n')}\n`
}

export const stagedFeature = (manifest: string, feature: string): string => `${manifest}${feature}`
