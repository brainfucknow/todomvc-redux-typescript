import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { projectRoot } from './fixtures.ts'

const IGNORED_DIRECTORIES = new Set(['node_modules', '.git', 'dist', 'build', 'bin', 'coverage'])

const filesUnder = (absolutePath: string): string[] => {
  if (!statSync(absolutePath).isDirectory()) {
    return [absolutePath]
  }
  return readdirSync(absolutePath)
    .filter((entry) => !IGNORED_DIRECTORIES.has(entry))
    .flatMap((entry) => filesUnder(join(absolutePath, entry)))
}

export function filesReferencing(location: string, needle: string): string[] {
  return filesUnder(join(projectRoot, location))
    .filter((file) => readFileSync(file, 'utf8').includes(needle))
    .map((file) => relative(projectRoot, file))
}

export function readProjectFile(location: string): string {
  return readFileSync(join(projectRoot, location), 'utf8')
}
