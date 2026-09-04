const SCRIPT_TAG = /<script\b[^>]*\bsrc\s*=\s*("([^"]*)"|'([^']*)')[^>]*>/gi
const STYLESHEET_TAG = /<link\b[^>]*>/gi
const HREF_ATTRIBUTE = /\bhref\s*=\s*("([^"]*)"|'([^']*)')/i
const STYLESHEET_REL = /\brel\s*=\s*("stylesheet"|'stylesheet'|stylesheet\b)/i
const VERSION_BANNER = /\b(\d+)\.\d+\.\d+/

const attributeValue = (match: RegExpMatchArray, doubleQuoted: number, singleQuoted: number): string =>
  match[doubleQuoted] ?? match[singleQuoted]

export function referencedAssets(html: string): string[] {
  const scripts = [...html.matchAll(SCRIPT_TAG)].map((match) => attributeValue(match, 2, 3))
  const stylesheets = [...html.matchAll(STYLESHEET_TAG)]
    .filter((match) => STYLESHEET_REL.test(match[0]))
    .map((match) => HREF_ATTRIBUTE.exec(match[0]))
    .filter((href): href is RegExpExecArray => href !== null)
    .map((href) => attributeValue(href, 2, 3))
  return [...scripts, ...stylesheets]
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
