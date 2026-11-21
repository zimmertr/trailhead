import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { type Content, type GameWords, gameWords } from './schema.ts'

export type SourceFile = { path: string; source: string }

export class ContentError extends Error {
  readonly problems: string[]
  constructor(problems: string[]) {
    super(`The content has ${problems.length} problem(s):\n${problems.map((p) => `  ${p}`).join('\n')}`)
    this.problems = problems
  }
}

// The site carries no email address (the repo is public). There is no first
// person check: the journal card, the register and TJ's note in it, and the
// visitor's own buttons speak as themselves on purpose.
const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i

// Each card file adds its cards to the one CARDS table; every other section
// lives in exactly one file.
const MERGED = new Set(['CARDS'])

function strings(value: unknown, path: string, out: [string, string][] = []): [string, string][] {
  if (typeof value === 'string') out.push([path, value])
  else if (Array.isArray(value)) value.forEach((v, i) => strings(v, `${path}.${i}`, out))
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) strings(v, `${path}.${k}`, out)
  return out
}

export function buildWords(files: SourceFile[]): GameWords {
  const problems: string[] = []
  const merged: Record<string, unknown> = {}
  const from: Record<string, string> = {}

  for (const { path, source } of files) {
    let data: unknown
    try {
      data = parseYaml(source, { uniqueKeys: true })
    } catch (error) {
      problems.push(`${path}: ${(error as Error).message.split('\n')[0]}`)
      continue
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      problems.push(`${path}: holds no sections`)
      continue
    }
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      for (const [where] of strings(value, key).filter(([, s]) => EMAIL.test(s))) problems.push(`${path}: ${where} holds an email address`)
      if (MERGED.has(key) && value && typeof value === 'object') {
        const into = (merged[key] ??= {}) as Record<string, unknown>
        for (const [id, item] of Object.entries(value as Record<string, unknown>)) {
          if (id in into) problems.push(`${path}: ${key}.${id} is also in ${from[`${key}.${id}`]}`)
          into[id] = item
          from[`${key}.${id}`] = path
        }
      } else if (key in merged) problems.push(`${path}: ${key} is also in ${from[key]}`)
      else {
        merged[key] = value
        from[key] = path
      }
    }
  }

  const result = gameWords.safeParse(merged)
  if (!result.success) {
    // A misspelt name is reported once per name, at the name itself, so the
    // file it is in can be found.
    const report = (path: PropertyKey[], message: string) =>
      problems.push(`${from[path.slice(0, 2).join('.')] ?? from[String(path[0])] ?? 'content/game'}: ${path.join('.')}: ${message}`)
    for (const issue of result.error.issues) {
      if (issue.code === 'unrecognized_keys') for (const key of issue.keys) report([...issue.path, key], 'the game reads no such name')
      else report(issue.path, issue.message)
    }
  }
  if (problems.length > 0 || !result.success) throw new ContentError(problems)

  const words = result.data
  for (const [id, card] of Object.entries(words.CARDS)) {
    for (const link of card.links ?? []) if (!(link in words.LINKS)) problems.push(`${from[`CARDS.${id}`]}: CARDS.${id} links to ${link}, which is not in LINKS`)
  }
  const repos = Object.values(words.PROJECTS).map((p) => p.repo.toLowerCase())
  for (const repo of repos.filter((r, i) => repos.indexOf(r) !== i)) problems.push(`${from.PROJECTS}: repo ${repo} is listed twice`)
  if (problems.length > 0) throw new ContentError(problems)
  return words
}

// What the API and the fetcher need: the projects, in the order base camp
// lists them.
export function buildContent(words: GameWords): Content {
  return { projects: Object.entries(words.PROJECTS).map(([slug, p], order) => ({ slug, name: p.name, repo: p.repo, order })) }
}

// The game's copy of the words. It is checked in because the game runs with
// no build step (record 0001); a unit test fails when it falls behind.
export function wordsModule(words: GameWords): string {
  return `// Written by \`npm run words\` from content/game/*.yaml. Edit those files, not this one.\nexport const W = ${JSON.stringify(words, null, 1)};\n`
}

export function readGameFiles(root: string): SourceFile[] {
  const dir = join(root, 'game')
  return readdirSync(dir)
    .filter((name) => name.endsWith('.yaml'))
    .toSorted()
    .map((name) => ({ path: relative(join(root, '..'), join(dir, name)), source: readFileSync(join(dir, name), 'utf8') }))
}
