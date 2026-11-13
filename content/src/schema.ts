import { z } from 'zod'

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'lowercase words joined by hyphens')
const text = z.string().trim().min(1)
const order = z.number().int().min(0)

// A profile is a page about TJ elsewhere. Only https, since every one of them
// is a navigation away from the site.
const profile = z.strictObject({
  id: slug,
  label: text,
  url: z.url({ protocol: /^https$/ }),
})

// What the YAML fields on top of each file may hold. Strict, so a misspelt
// field fails the build instead of vanishing.
export const siteFields = z.strictObject({
  kind: z.literal('site'),
  name: text,
  profiles: z.array(profile).min(1),
})

export const placeFields = z.strictObject({
  kind: z.literal('place'),
  slug,
  title: text,
  order,
  signs: z.array(z.strictObject({ text, place: slug })).default([]),
})

export const milestoneFields = z.strictObject({
  kind: z.literal('milestone'),
  place: slug,
  slug,
  title: text,
  order,
  links: z.array(slug).default([]),
  tools: z.array(text).default([]),
})

export const projectFields = z.strictObject({
  kind: z.literal('project'),
  slug,
  name: text,
  repo: z.string().regex(/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/, 'owner/name'),
  order,
})

export type Profile = z.infer<typeof profile>
type Prose = { html: string }
export type Place = Omit<z.infer<typeof placeFields>, 'kind'> & Prose
export type Milestone = Omit<z.infer<typeof milestoneFields>, 'kind'> & Prose
export type Project = Omit<z.infer<typeof projectFields>, 'kind'> & Prose

// The one data file the site, the API and the fetcher read.
export type Content = {
  site: { name: string; profiles: Profile[] }
  places: Place[]
  milestones: Milestone[]
  projects: Project[]
}
