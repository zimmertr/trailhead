import { describe, expect, it } from 'vitest'
import { WORKSPACES, manifest, read, readJson } from './repo.ts'

// The table under "Bundled software" in NOTICES.md: its name and license
// columns.
function noticed(): Map<string, string> {
  const text = read('NOTICES.md')
  const section = text.split(/^## /m).find((s) => s.startsWith('Bundled software'))
  if (!section) throw new Error('NOTICES.md has no "Bundled software" section')
  const rows = [...section.matchAll(/^\| \[?`?([@\w./-]+)`?\]?(?:\([^)]*\))? \| [^|]+ \| ([^|]+) \|$/gm)]
  return new Map(rows.filter(([, name]) => name !== 'Package').map(([, name, license]) => [name ?? '', (license ?? '').trim()]))
}

describe('NOTICES.md', () => {
  // Every package an image ships comes in as some workspace's direct
  // dependency; development tools are devDependencies and ship nowhere.
  const shipped = new Set(WORKSPACES.flatMap((dir) => Object.keys(manifest(dir).dependencies ?? {})).filter((name) => !name.startsWith('@trailhead/')))
  const lock = readJson<{ packages: Record<string, { license?: string }> }>('package-lock.json').packages

  it('lists exactly the direct dependencies the images ship', () => {
    expect([...noticed().keys()].toSorted()).toEqual([...shipped].toSorted())
  })

  it('gives each the license the lock records for it', () => {
    for (const [name, license] of noticed()) expect(license, name).toBe(lock[`node_modules/${name}`]?.license)
  })
})
