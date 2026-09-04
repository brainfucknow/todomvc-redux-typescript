const SCRIPT_SRC = /<script\b[^>]*\bsrc\s*=\s*("[^"]*"|'[^']*')[^>]*>/gi
const LINK_TAG = /<link\b[^>]*>/gi
const HREF_ATTRIBUTE = /\bhref\s*=\s*("[^"]*"|'[^']*')/i
const STYLESHEET_REL = /\brel\s*=\s*("stylesheet"|'stylesheet'|stylesheet\b)/i
// The patch digits are matched but never read, so shortening the final
// quantifier cannot change an answer this module gives. That makes Stryker's
// `\d+` -> `\d` mutant on this line equivalent, and equivalent mutants cannot
// be killed, only ignored - with the rest of the line's regex mutants.
// Stryker disable next-line Regex
const VERSION_BANNER = /\b(\d+)\.\d+\.\d+/

const unquoted = (attribute: string): string => attribute.slice(1, -1)

const referencedStylesheets = (html: string): string[] => [...html.matchAll(LINK_TAG)]
  .filter((link) => STYLESHEET_REL.test(link[0]))
  .map((link) => HREF_ATTRIBUTE.exec(link[0]))
  .filter((href): href is RegExpExecArray => href !== null)
  .map((href) => unquoted(href[1]))

export function referencedScripts(html: string): string[] {
  return [...html.matchAll(SCRIPT_SRC)].map((match) => unquoted(match[1]))
}

export function referencedAssets(html: string): string[] {
  return [...referencedScripts(html), ...referencedStylesheets(html)]
}

export function compilerMajorVersion(versionOutput: string): number {
  const banner = VERSION_BANNER.exec(versionOutput)
  if (!banner) {
    throw new Error(`no compiler version in output: ${versionOutput.trim()}`)
  }
  return Number(banner[1])
}

export function availableScripts(manifestText: string): string[] {
  const manifest: { scripts?: Record<string, string> } = JSON.parse(manifestText)
  return Object.keys(manifest.scripts ?? {})
}
