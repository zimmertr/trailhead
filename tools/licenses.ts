// The license file each image ships and serves, built from what the build
// actually bundled (docs.md, License notices). The web build passes Rollup's
// module ids, the service bundler esbuild's inputs; both land here, so the
// two images can't format or check it differently.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export type PackageLicense = { name: string; version: string; license: string; text: string }

const LICENSE_FILE = /^(licen[cs]e|copying)(\.|-|$)/i
const README = /^readme(\.|$)/i
// A README's own License section, up to the next heading of any level.
const README_LICENSE = /^#+ *licen[cs]e\s*\n([\s\S]*?)(?=\n#+ |(?![\s\S]))/im
// The grant every MIT, ISC and BSD text carries. A section without it is a
// link or a badge, not the license itself.
const GRANT = /permission is hereby granted|redistribution and use in source and binary forms|permission to use, copy, modify/i

const MIT_GRANT = `Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`

// Packages that ship their license only as a link, each with the text that
// link gives. Checked 2026-11-12; each entry is re-read when its package
// moves a major.
const LINKED_TEXT: Record<string, string> = {
  // Fastify's dependency. Its package.json says MIT and its README links
  // http://jsumners.mit-license.org/, the MIT text under James Sumners' name.
  'abstract-logging': `The MIT License (MIT)\n\nCopyright (c) James Sumners\n\n${MIT_GRANT}`,
}

// The package folder each bundled file came from: the part of its path up to
// the last node_modules/<name>, or node_modules/@scope/<name>.
export function packageDirs(paths: string[]): string[] {
  const dirs = new Set<string>()
  for (const path of paths) {
    const match = /^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//.exec(path.replaceAll('\\', '/'))
    if (match?.[1]) dirs.add(match[1])
  }
  return [...dirs].toSorted()
}

export function readPackageLicense(dir: string): PackageLicense {
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { name: string; version: string; license?: string }
  const names = readdirSync(dir).toSorted()
  const file = names.find((name) => LICENSE_FILE.test(name))
  const readme = names.find((name) => README.test(name))
  const section = readme ? README_LICENSE.exec(readFileSync(join(dir, readme), 'utf8'))?.[1]?.trim() : undefined
  const text = file ? readFileSync(join(dir, file), 'utf8').trim() : section && GRANT.test(section) ? section : LINKED_TEXT[manifest.name]
  // A package that ships no license text can't be redistributed with its
  // notice intact, so it stops the build rather than going out unattributed.
  if (!text) throw new Error(`${manifest.name}@${manifest.version} ships no license text in ${dir}`)
  return { name: manifest.name, version: manifest.version, license: manifest.license ?? 'UNKNOWN', text }
}

// One block per package, name and version on the first line, so a smoke test
// can find every package by a line of its own.
export function licenseFile(dirs: string[]): string {
  const packages = new Map<string, PackageLicense>()
  for (const dir of dirs) {
    const pkg = readPackageLicense(dir)
    packages.set(`${pkg.name}@${pkg.version}`, pkg)
  }
  const blocks = [...packages.values()]
    .toSorted((a, b) => a.name.localeCompare(b.name))
    .map((pkg) => `${pkg.name} ${pkg.version}\nLicense: ${pkg.license}\n\n${pkg.text}\n`)
  return `Third-party software bundled into this image, with its license text.\n\n${blocks.join('\n----------------------------------------\n\n')}`
}
