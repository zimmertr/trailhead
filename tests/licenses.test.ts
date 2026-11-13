import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { licenseFile, packageDirs, readPackageLicense } from '../tools/licenses.ts'

let root: string
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'licenses-'))
})
afterEach(() => rmSync(root, { recursive: true }))

function fakePackage(dir: string, name: string, files: Record<string, string>): string {
  const path = join(root, dir)
  mkdirSync(path, { recursive: true })
  writeFileSync(join(path, 'package.json'), JSON.stringify({ name, version: '1.2.3', license: 'MIT' }))
  for (const [file, text] of Object.entries(files)) writeFileSync(join(path, file), text)
  return path
}

describe('packageDirs', () => {
  it('finds the package each bundled file came from, scoped and nested ones included', () => {
    expect(
      packageDirs([
        'node_modules/fastify/fastify.js',
        'node_modules/fastify/lib/route.js',
        '/repo/node_modules/@fontsource/national-park/latin-400.css',
        'node_modules/a/node_modules/b/index.js',
        'C:\\repo\\node_modules\\pg\\lib\\index.js',
        'api/src/app.ts',
        '\u0000vite/preload-helper.js',
      ]),
    ).toEqual(['/repo/node_modules/@fontsource/national-park', 'C:/repo/node_modules/pg', 'node_modules/a/node_modules/b', 'node_modules/fastify'])
  })
})

describe('readPackageLicense', () => {
  it('reads the license text under any of its usual names', () => {
    for (const name of ['LICENSE', 'license.md', 'LICENCE.txt', 'COPYING', 'LICENSE-MIT']) {
      const dir = fakePackage(name, 'pkg', { [name]: ` text of ${name} ` })
      expect(readPackageLicense(dir)).toEqual({ name: 'pkg', version: '1.2.3', license: 'MIT', text: `text of ${name}` })
    }
  })

  it('stops the build for a package with no license file', () => {
    const dir = fakePackage('bare', 'bare', { 'README.md': 'MIT, trust me' })
    expect(() => readPackageLicense(dir)).toThrow('bare@1.2.3 ships no license file')
  })
})

describe('licenseFile', () => {
  it('writes one block per package, sorted, with its name and version on a line of its own', () => {
    const b = fakePackage('node_modules/zeta', 'zeta', { LICENSE: 'Z' })
    const a = fakePackage('node_modules/@scope/alpha', '@scope/alpha', { LICENSE: 'A' })
    const text = licenseFile([b, a, b])
    expect(text).toMatch(/^Third-party software/)
    expect(text.indexOf('@scope/alpha 1.2.3\nLicense: MIT\n\nA\n')).toBeGreaterThan(0)
    expect(text.indexOf('zeta 1.2.3\n')).toBeGreaterThan(text.indexOf('@scope/alpha'))
    expect(text.match(/^zeta 1\.2\.3$/gm)).toHaveLength(1)
  })
})
