import { describe, expect, it } from 'vitest'
import { WORKSPACES, files, manifest, read, readJson } from './repo.ts'

type Lock = { packages: Record<string, { version?: string; integrity?: string; link?: boolean; resolved?: string }> }

// Each lockfile and the manifests it locks (security.md, Dependencies).
const LOCKS = [
  { lock: 'package-lock.json', manifests: ['.', ...WORKSPACES] },
  { lock: 'tools/eslint/package-lock.json', manifests: ['tools/eslint'] },
]

describe.each(LOCKS)('$lock', ({ lock, manifests }) => {
  const packages = readJson<Lock>(lock).packages

  it('locks every direct pin at exactly its version', () => {
    for (const dir of manifests) {
      const { dependencies = {}, devDependencies = {} } = manifest(dir)
      for (const [name, pin] of Object.entries({ ...dependencies, ...devDependencies })) {
        if (name.startsWith('@trailhead/')) continue
        expect(pin, `${dir}: ${name} is pinned exactly`).toMatch(/^\d+\.\d+\.\d+$/)
        const nested = dir === '.' || dir === 'tools/eslint' ? undefined : packages[`${dir}/node_modules/${name}`]
        const locked = nested ?? packages[`node_modules/${name}`]
        expect(locked?.version, `${dir}: ${name} is locked at ${pin}`).toBe(pin)
      }
    }
  })

  it('records an integrity hash for every package it installs', () => {
    const unhashed = Object.entries(packages).filter(([path, entry]) => path.includes('node_modules/') && !entry.link && !entry.integrity)
    expect(unhashed.map(([path]) => path)).toEqual([])
  })
})

describe('installs', () => {
  it('turn install scripts off in every .npmrc', () => {
    for (const path of files(/(^|\/)\.npmrc$/)) expect(read(path), path).toMatch(/^ignore-scripts=true$/m)
  })

  it('pass --ignore-scripts on every npm ci, and install nothing with npm install, in the images, the Makefile and the workflows', () => {
    const sources = [...files(/(^|\/)Dockerfile$/), 'Makefile', ...files(/^\.github\/workflows\/.*\.ya?ml$/)]
    let count = 0
    for (const path of sources) {
      for (const line of read(path).split('\n')) {
        if (line.trimStart().startsWith('#')) continue
        for (const [command] of line.matchAll(/npm (?:ci|install|i)\b[^&|;"]*/g)) {
          count++
          // `npm install --package-lock-only` writes the lock and installs nothing.
          expect(command, `${path}: ${command}`).toMatch(/^npm ci .*--ignore-scripts|^npm install --package-lock-only --ignore-scripts/)
        }
      }
    }
    expect(count).toBeGreaterThan(4)
  })
})
