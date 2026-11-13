// What the repo-level tests read: files under the repo, found by walking it
// rather than by a list that could miss a new one. Every reader fails when it
// finds nothing, so a moved folder can't turn a test into a pass.
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

export const ROOT = join(import.meta.dirname, '..')
const SKIP = new Set(['node_modules', '.git', 'dist', 'coverage', 'playwright-report', 'test-results'])

export function files(pattern: RegExp, from = ROOT): string[] {
  const found: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP.has(entry.name)) continue
      const path = join(dir, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (pattern.test(relative(ROOT, path))) found.push(relative(ROOT, path))
    }
  }
  walk(from)
  if (found.length === 0) throw new Error(`no file under ${relative(ROOT, from) || '.'} matches ${pattern}`)
  return found.toSorted()
}

export const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8')
export const readJson = <T>(path: string): T => JSON.parse(read(path)) as T

export const WORKSPACES = ['content', 'common', 'web', 'api', 'admin', 'fetcher', 'e2e'] as const
export const SERVICES = ['web', 'api', 'admin', 'fetcher'] as const

type Manifest = { name: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string>; workspaces?: string[] }
export const manifest = (dir: string): Manifest => readJson<Manifest>(join(dir, 'package.json'))
