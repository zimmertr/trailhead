import { z } from 'zod'

const text = z.string().trim().min(1)
const texts = z.array(text).min(1)
const day = z.iso.date()
// Any shape of words: the interface's many small strings, nested as the game
// reads them. Text in {braces} is filled in by web/www/content.js.
type Words = string | number | boolean | null | Words[] | { [key: string]: Words }
const words: z.ZodType<Words> = z.lazy(() => z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(words), z.record(z.string(), words)]))
const table = z.record(z.string(), text)

// Strict throughout, so a misspelt field fails the build instead of vanishing.
const card = z.strictObject({
  route: text,
  // The card's address after the #. Empty for the off-route card, which has none.
  slug: z.string().regex(/^([a-z0-9-]+(\/[a-z0-9-]+)?)?$/, 'a place, or a place and a stop, in lowercase words joined by hyphens'),
  kind: text,
  from: text,
  title: text,
  draft: z.boolean().optional(),
  home: z.boolean().optional(),
  body: texts,
  aside: text.optional(),
  links: z.array(text).optional(),
  tools: texts.optional(),
  // The button that sends him on. Null on base camp, whose card is a menu.
  go: text.nullable().optional(),
})

// A project is one summit at Sideproject Spires, and one repo whose numbers
// the fetcher reads and the API serves. The numbers here are what the game
// shows when the API cannot be reached.
const project = z.strictObject({
  name: text,
  top: text,
  clue: text,
  repo: z.string().regex(/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/, 'owner/name'),
  site: z.url({ protocol: /^https$/ }).optional(),
  stars: z.number().int().min(0),
  release: text.nullable(),
  released: day.nullable(),
  language: text,
  license: text,
  body: texts,
  extra: z.array(z.tuple([text, z.url({ protocol: /^https$/ })])).optional(),
})

// Everything the game says, merged from content/game/*.yaml.
export const gameWords = z.strictObject({
  INTRO: text,
  DESTINATIONS: z.array(z.strictObject({ route: text, sign: text, about: text, dir: z.enum(['left', 'up', 'right']), slug: text })).min(1),
  LINKS: z.record(z.string(), z.tuple([text, z.url({ protocol: /^https$/ })])),
  REGISTER: z.array(z.strictObject({ name: text, date: day, note: text })),
  FINDS: z.record(z.string(), z.tuple([text, text])),
  CARDS: z.record(z.string(), card),
  PROJECTS: z.record(z.string(), project),
  LABELS: table,
  ENDS: table,
  DEST_NAMES: table,
  SIGNS: table,
  NAMES: z.record(z.string(), words),
  TRACK_NAMES: texts,
  SET_NAMES: texts,
  UI: z.record(z.string(), words),
  HELP: z.array(z.tuple([text, text])),
  CONSOLE: z.array(z.string()),
  AGO: z.strictObject({ today: text, yesterday: text, days: text, months: text, years: text }),
})

export type GameWords = z.infer<typeof gameWords>

export type Project = { slug: string; name: string; repo: string; order: number }

// The one data file the API and the fetcher read.
export type Content = { projects: Project[] }
