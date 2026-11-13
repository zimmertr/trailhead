// The license file each image ships and serves, built from what the build
// actually bundled (docs.md, License notices). The web build passes Rollup's
// module ids, the service bundler esbuild's inputs; both land here, so the
// two images can't format or check it differently.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export type PackageLicense = { name: string; version: string; license: string; text: string }

const LICENSE_FILE = /^(licen[cs]e|copying)(\.|-|$)/i

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
  const file = readdirSync(dir).toSorted().find((name) => LICENSE_FILE.test(name))
  // A package that ships no license text can't be redistributed with its
  // notice intact, so it stops the build rather than going out unattributed.
  if (!file) throw new Error(`${manifest.name}@${manifest.version} ships no license file in ${dir}`)
  return { name: manifest.name, version: manifest.version, license: manifest.license ?? 'UNKNOWN', text: readFileSync(join(dir, file), 'utf8').trim() }
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
