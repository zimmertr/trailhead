import { stringify } from 'yaml'
import type { SourceFile } from '../src/build.ts'

type Fields = Record<string, unknown>

// The file name follows the slug a test gives, so its problems name it.
const slugOf = (fields: Fields, fallback: string): string => (typeof fields.slug === 'string' ? fields.slug : fallback)

export function file(path: string, fields: Fields | null, body = ''): SourceFile {
  const top = fields === null ? '' : `---\n${stringify(fields)}---\n`
  return { path, source: `${top}${body}\n` }
}

export const site = (fields: Fields = {}): SourceFile =>
  file('site.md', {
    kind: 'site',
    name: 'TJ Zimmerman',
    profiles: [
      { id: 'github', label: 'GitHub', url: 'https://github.com/zimmertr' },
      { id: 'strava', label: 'Strava', url: 'https://www.strava.com/athletes/zimmertr' },
    ],
    ...fields,
  })

export const place = (fields: Fields = {}, body = ''): SourceFile =>
  file(`places/${slugOf(fields, 'meadow')}.md`, { kind: 'place', slug: 'meadow', title: 'Meadow', order: 0, ...fields }, body)

export const milestone = (fields: Fields = {}, body = 'He stops here.'): SourceFile =>
  file(
    `milestones/${slugOf(fields, 'first')}.md`,
    { kind: 'milestone', place: 'meadow', slug: 'first', title: 'First', order: 1, ...fields },
    body,
  )

export const project = (fields: Fields = {}, body = 'It does one thing.'): SourceFile =>
  file(
    `projects/${slugOf(fields, 'thing')}.md`,
    { kind: 'project', slug: 'thing', name: 'Thing', repo: 'zimmertr/thing', order: 1, ...fields },
    body,
  )

// The smallest set that builds.
export const valid = (): SourceFile[] => [site(), place(), milestone(), project()]
