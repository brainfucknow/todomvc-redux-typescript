// The filesystem half of a stamped run: the runners read their own directory
// listings, because what a listing means differs between them, and read the
// files themselves through here. Nothing in this module decides anything.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { NamedContent } from './fingerprint.ts'

export const readIfPresent = (path: string): string | undefined =>
  existsSync(path) ? readFileSync(path, 'utf8') : undefined

export const readFiles = (root: string, paths: string[]): NamedContent[] =>
  paths.map((path) => ({ path, content: readFileSync(join(root, path), 'utf8') }))
