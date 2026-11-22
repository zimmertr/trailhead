import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse, stringify } from 'yaml'
import { ContentError, type SourceFile, buildContent, buildWords, readGameFiles, wordsModule } from '../src/build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const real = (): SourceFile[] => readGameFiles(root)
const extra = (data: unknown, path = 'content/game/extra.yaml'): SourceFile => ({ path, source: typeof data === 'string' ? data : stringify(data) })
// One real file, changed the way a test needs.
type Spires = { PROJECTS: Record<string, { repo: string }> }
const edited = (name: string, change: (data: Spires) => void): SourceFile[] =>
  real().map((file) => {
    if (!file.path.endsWith(name)) return file
    const data = parse(file.source) as Spires
    change(data)
    return { path: file.path, source: stringify(data) }
  })
const card = { route: 'lake', slug: 'reflection-lake/extra', kind: 'sign', from: 'A sign', title: 'Extra', body: ['He stops here.'] }

const problemsOf = (files: SourceFile[]): string[] => {
  try {
    buildWords(files)
  } catch (error) {
    if (error instanceof ContentError) return error.problems
    throw error
  }
  throw new Error('expected the build to refuse these files')
}

describe('the game words', () => {
  it('build from content/game, and give the API the projects in base camp order', () => {
    const words = buildWords(real())
    expect(real().every((file) => file.path.startsWith('content/game/') && file.path.endsWith('.yaml'))).toBe(true)
    const { projects } = buildContent(words)
    expect(projects.map((p) => p.slug)).toEqual(Object.keys(words.PROJECTS))
    expect(projects.map((p) => p.order)).toEqual(projects.map((_, i) => i))
    expect(projects[0]).toEqual({ slug: 'bluebird', name: 'Bluebird Forecast', repo: 'zimmertr/bluebird', order: 0 })
  })

  it('are copied into web/www/words.js as they are now (run make words after an edit)', () => {
    expect(readFileSync(join(root, '..', 'web', 'www', 'words.js'), 'utf8')).toBe(wordsModule(buildWords(real())))
  })

  it('refuse an email address and a section the game does not read', () => {
    expect(problemsOf([...real(), extra({ CONTACT: `Write to ${['tj', 'example.com'].join('@')}.` })])).toEqual([
      'content/game/extra.yaml: CONTACT holds an email address',
      'content/game/extra.yaml: CONTACT: the game reads no such name',
    ])
  })

  it('refuse a section in two files, and a card twice', () => {
    expect(problemsOf([...real(), extra({ INTRO: 'Hello.', CARDS: { who: card } })])).toEqual([
      'content/game/extra.yaml: INTRO is also in content/game/trailhead.yaml',
      'content/game/extra.yaml: CARDS.who is also in content/game/reflection-lake.yaml',
    ])
  })

  it('refuse a misspelt field, a field of the wrong kind and a missing section, naming the file', () => {
    const files = edited('names.yaml', (data) => {
      delete (data as unknown as Record<string, unknown>).SET_NAMES
    })
    expect(
      problemsOf([...files, extra({ CARDS: { extra: { ...card, titel: 'Extra' }, more: { ...card, body: 'One line.' } } })]),
    ).toEqual([
      'content/game/extra.yaml: CARDS.extra.titel: the game reads no such name',
      'content/game/extra.yaml: CARDS.more.body: Invalid input: expected array, received string',
      'content/game: SET_NAMES: Invalid input: expected array, received undefined',
    ])
  })

  it('refuse a link to no profile, and a repo listed twice', () => {
    const files = edited('sideproject-spires.yaml', (data) => {
      data.PROJECTS.copy = { ...data.PROJECTS.bluebird, repo: 'Zimmertr/Bluebird' }
    })
    expect(problemsOf([...files, extra({ CARDS: { extra: { ...card, links: ['myspace'] } } })])).toEqual([
      'content/game/extra.yaml: CARDS.extra links to myspace, which is not in LINKS',
      'content/game/sideproject-spires.yaml: repo zimmertr/bluebird is listed twice',
    ])
  })

  it('refuse a file that is not YAML, and one that holds no sections', () => {
    const problems = problemsOf([...real(), extra('INTRO: [', 'content/game/a.yaml'), extra('- one\n', 'content/game/b.yaml')])
    expect(problems).toHaveLength(2)
    expect(problems[0]).toMatch(/^content\/game\/a\.yaml: /)
    expect(problems[1]).toBe('content/game/b.yaml: holds no sections')
  })
})

// The parts of the game's content.js this test calls. It is untyped browser
// JavaScript (record 0001), so the shape is written out here.
type Say = (...values: (string | number)[]) => string
type GameContent = {
  ago: (iso: string, now: Date) => string
  UI: {
    auto: Say
    found: Say
    card: { summit: Say }
    map: { lake: [string, Say]; stack: [string, Say]; spires: [string, Say]; plank: Record<'lake' | 'stack' | 'spires', Say>; takes: Say; legend: string }
    kiosk: { up: Say; summits: Say; checklist: Say }
    register: { todo: { spires: Say } }
    plain: { facts: Say; released: Say }
  }
}

describe('web/www/content.js', () => {
  it('fills every {brace} in the words it builds sentences from', async () => {
    const path = join(root, '..', 'web', 'www', 'content.js')
    const { UI, ago } = (await import(path)) as GameContent
    const said = [
      UI.auto('Day'),
      UI.found('Doot Doot', 3, 12),
      UI.card.summit('A cairn'),
      UI.map.lake[1](4.2),
      UI.map.stack[1](7),
      UI.map.spires[1](3),
      UI.map.plank.lake(4.2),
      UI.map.plank.stack(7),
      UI.map.plank.spires(3),
      UI.map.takes(90),
      UI.map.legend,
      UI.kiosk.up(1),
      UI.kiosk.up(30),
      UI.kiosk.up(600),
      UI.kiosk.summits(2),
      UI.kiosk.checklist(1, 12),
      UI.register.todo.spires('Sideproject Spires'),
      UI.plain.facts(5, 'v1.0.0', 'Go', 'MIT'),
      UI.plain.released('v1.0.0', 'today'),
      ...['2026-11-21', '2026-11-20', '2026-10-01', '2025-01-01', '2020-01-01'].map((day) => ago(day, new Date('2026-11-21T12:00:00Z'))),
    ]
    for (const line of said) expect(line).not.toMatch(/[{}]|undefined|NaN/)
    expect(said.at(-3)).toBe('51 days ago')
    expect(UI.map.legend).toMatch(/: .+, .+ and .+\.$/)
  })
})
