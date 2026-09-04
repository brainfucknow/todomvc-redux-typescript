// What a recorded mutation result depends on, reduced to one string: the files
// its manifest cannot see for itself, and what they held.
//
// Listing a directory is the caller's, because what a listing means differs
// between the runners. Which of its entries the fingerprint covers is decided
// here: a fingerprint that leaves out a file it claims to cover reads as
// unchanged while that file changes underneath it, which is the defect this
// module exists to keep out.
import { createHash } from 'node:crypto'
import { join } from 'node:path'

export type FileSelection = {
  directory: string
  suffix: string
  without?: string
}

export type NamedContent = {
  path: string
  content: string
}

const isSelected = (entry: string, { suffix, without }: FileSelection): boolean =>
  entry.endsWith(suffix) && (without === undefined || !entry.endsWith(without))

export const selectedFiles = (
  selections: FileSelection[],
  listing: (directory: string) => string[],
): string[] =>
  selections.flatMap((selection) =>
    listing(selection.directory)
      .filter((entry) => isSelected(entry, selection))
      .map((entry) => join(selection.directory, entry)))

// Path and content both go in, so a renamed file moves the fingerprint even
// when nothing was edited, and the paths are sorted so the order the caller
// listed them in cannot change the answer.
export const fingerprint = (files: NamedContent[]): string => {
  const digest = createHash('sha256')
  for (const file of [...files].sort((left, right) => left.path.localeCompare(right.path))) {
    digest.update(`${file.path}\0${file.content}\0`)
  }
  return `sha256:${digest.digest('hex')}`
}
