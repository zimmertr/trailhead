import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { micromark } from 'micromark'
import { parse as parseYaml } from 'yaml'
import type { z } from 'zod'
import {
  type Content,
  type Milestone,
  type Place,
  type Project,
  milestoneFields,
  placeFields,
  projectFields,
  siteFields,
} from './schema.ts'

export type SourceFile = { path: string; source: string }

export class ContentError extends Error {
  readonly problems: string[]
  constructor(problems: string[]) {
    super(`The content has ${problems.length} problem(s):\n${problems.map((p) => `  ${p}`).join('\n')}`)
    this.problems = problems
  }
}

const FRONT_MATTER = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/

// The site talks about TJ, never as him (PRD requirement 10). Curly and
// straight apostrophes both, since an editor may swap one for the other.
const FIRST_PERSON = [/\bI(?:['\u2019](?:m|ve|d|ll))?\b/, /\b(?:me|my|mine|myself)\b/i]
// The site carries no email address (PRD, and the repo is public).
const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i

export function splitFrontMatter(path: string, source: string): { fields: unknown; body: string } {
  const match = FRONT_MATTER.exec(source)
  if (!match) throw new ContentError([`${path}: starts without a --- block of YAML fields`])
  return { fields: parseYaml(match[1] ?? '', { uniqueKeys: true }), body: (match[2] ?? '').trim() }
}

// micromark escapes raw HTML unless told otherwise, so prose can't smuggle
// markup or script into the pages that print it.
function render(body: string): string {
  return body === '' ? '' : micromark(body).trim()
}

function issues(path: string, error: z.ZodError): string[] {
  return error.issues.map((issue) => `${path}: ${issue.path.join('.') || '(fields)'}: ${issue.message}`)
}

function duplicates(values: string[]): string[] {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))]
}

export function buildContent(files: SourceFile[]): Content {
  const problems: string[] = []
  let site: Content['site'] | undefined
  const places: Place[] = []
  const milestones: Milestone[] = []
  const projects: Project[] = []

  for (const { path, source } of files) {
    for (const pattern of FIRST_PERSON) {
      const hit = pattern.exec(source)
      if (hit) problems.push(`${path}: "${hit[0]}" is first person; the site talks about TJ in the third person`)
    }
    if (EMAIL.test(source)) problems.push(`${path}: holds an email address`)

    let parsed: { fields: unknown; body: string }
    try {
      parsed = splitFrontMatter(path, source)
    } catch (error) {
      if (!(error instanceof ContentError)) throw error
      problems.push(...error.problems)
      continue
    }
    const { fields, body } = parsed
    const kind = (fields as { kind?: unknown } | null)?.kind

    if (kind === 'site') {
      const result = siteFields.safeParse(fields)
      if (!result.success) problems.push(...issues(path, result.error))
      else if (site) problems.push(`${path}: a second site file`)
      else if (body !== '') problems.push(`${path}: the site file holds fields only`)
      else site = { name: result.data.name, profiles: result.data.profiles }
    } else if (kind === 'place') {
      const result = placeFields.safeParse(fields)
      if (!result.success) problems.push(...issues(path, result.error))
      else {
        const { kind: _, ...rest } = result.data
        places.push({ ...rest, html: render(body) })
      }
    } else if (kind === 'milestone') {
      const result = milestoneFields.safeParse(fields)
      if (!result.success) problems.push(...issues(path, result.error))
      else if (body === '') problems.push(`${path}: a milestone needs its card's words below the fields`)
      else {
        const { kind: _, ...rest } = result.data
        milestones.push({ ...rest, html: render(body) })
      }
    } else if (kind === 'project') {
      const result = projectFields.safeParse(fields)
      if (!result.success) problems.push(...issues(path, result.error))
      else if (body === '') problems.push(`${path}: a project needs its card's words below the fields`)
      else {
        const { kind: _, ...rest } = result.data
        projects.push({ ...rest, html: render(body) })
      }
    } else {
      problems.push(`${path}: kind must be site, place, milestone or project`)
    }
  }

  if (!site) problems.push('no site file')
  const profileIds = new Set(site?.profiles.map((p) => p.id))
  const placeSlugs = new Set(places.map((p) => p.slug))

  for (const id of duplicates(site?.profiles.map((p) => p.id) ?? [])) problems.push(`profile id ${id} is used twice`)
  for (const slug of duplicates(places.map((p) => p.slug))) problems.push(`place ${slug} is defined twice`)
  for (const order of duplicates(places.map((p) => String(p.order)))) problems.push(`two places share order ${order}`)
  for (const slug of duplicates(projects.map((p) => p.slug))) problems.push(`project ${slug} is defined twice`)
  for (const repo of duplicates(projects.map((p) => p.repo.toLowerCase()))) problems.push(`repo ${repo} is listed twice`)
  for (const order of duplicates(projects.map((p) => String(p.order)))) problems.push(`two projects share order ${order}`)
  for (const key of duplicates(milestones.map((m) => `${m.place}/${m.slug}`))) problems.push(`milestone ${key} is defined twice`)
  for (const key of duplicates(milestones.map((m) => `${m.place}/${m.order}`))) problems.push(`two milestones share order ${key}`)

  for (const place of places) {
    for (const sign of place.signs) {
      if (!placeSlugs.has(sign.place)) problems.push(`place ${place.slug}: a sign points at ${sign.place}, which is no place`)
    }
  }
  for (const milestone of milestones) {
    if (!placeSlugs.has(milestone.place)) problems.push(`milestone ${milestone.slug}: place ${milestone.place} does not exist`)
    for (const link of milestone.links) {
      if (!profileIds.has(link)) problems.push(`milestone ${milestone.slug}: link ${link} is no profile in site.md`)
    }
  }

  if (problems.length > 0 || !site) throw new ContentError(problems)

  return {
    site,
    places: places.toSorted((a, b) => a.order - b.order),
    milestones: milestones.toSorted(
      (a, b) =>
        (places.find((p) => p.slug === a.place)?.order ?? 0) - (places.find((p) => p.slug === b.place)?.order ?? 0) ||
        a.order - b.order,
    ),
    projects: projects.toSorted((a, b) => a.order - b.order),
  }
}

function markdownIn(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => join(entry.parentPath, entry.name))
}

// Only these folders hold words, so a README or CLAUDE.md beside them is
// never read as content.
export function readContentFiles(root: string): SourceFile[] {
  const paths = [join(root, 'site.md'), ...['places', 'milestones', 'projects'].flatMap((dir) => markdownIn(join(root, dir)))]
  return paths.toSorted().map((path) => ({ path: relative(root, path), source: readFileSync(path, 'utf8') }))
}
