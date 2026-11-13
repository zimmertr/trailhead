import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ContentError, buildContent, readContentFiles, splitFrontMatter } from '../src/build.ts'
import { file, milestone, place, project, site, valid } from './fixtures.ts'

const problemsOf = (files: Parameters<typeof buildContent>[0]): string[] => {
  try {
    buildContent(files)
  } catch (error) {
    if (error instanceof ContentError) return error.problems
    throw error
  }
  throw new Error('expected the build to refuse these files')
}

describe('buildContent', () => {
  it('builds the smallest valid set, rendering prose to HTML', () => {
    const content = buildContent(valid())
    expect(content.site.name).toBe('TJ Zimmerman')
    expect(content.places).toEqual([{ slug: 'meadow', title: 'Meadow', order: 0, signs: [], html: '' }])
    expect(content.milestones[0]).toMatchObject({ slug: 'first', links: [], tools: [], html: '<p>He stops here.</p>' })
    expect(content.projects[0]).toMatchObject({ repo: 'zimmertr/thing', html: '<p>It does one thing.</p>' })
  })

  it('escapes raw HTML in prose instead of passing it through', () => {
    const content = buildContent([site(), place(), milestone({}, '<script>alert(1)</script>'), project()])
    expect(content.milestones[0]?.html).not.toContain('<script>')
    expect(content.milestones[0]?.html).toContain('&lt;script&gt;')
  })

  it('sorts places by order, milestones by place then order, and projects by order', () => {
    const content = buildContent([
      site(),
      place({ slug: 'lake', title: 'Lake', order: 2 }),
      place({ slug: 'meadow', order: 1 }),
      milestone({ slug: 'b', place: 'lake', order: 1 }),
      milestone({ slug: 'a', place: 'meadow', order: 2 }),
      milestone({ slug: 'c', place: 'meadow', order: 1 }),
      project({ slug: 'z', repo: 'zimmertr/z', order: 2 }),
      project({ slug: 'y', repo: 'zimmertr/y', order: 1 }),
    ])
    expect(content.places.map((p) => p.slug)).toEqual(['meadow', 'lake'])
    expect(content.milestones.map((m) => m.slug)).toEqual(['c', 'a', 'b'])
    expect(content.projects.map((p) => p.slug)).toEqual(['y', 'z'])
  })

  it('refuses first-person words and email addresses', () => {
    const problems = problemsOf([site(), place(), milestone({}, "I'm here and this is my note."), project({}, `Write to ${['tj', 'example.com'].join('@')}.`)])
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/milestones\/first\.md: "I'm" is first person/),
        expect.stringMatching(/milestones\/first\.md: "my" is first person/),
        'projects/thing.md: holds an email address',
      ]),
    )
  })

  it('refuses a misspelt field, a bad slug and a missing body', () => {
    const problems = problemsOf([
      site(),
      place({ titel: 'Meadow' }),
      milestone({ slug: 'Not A Slug' }),
      milestone({ slug: 'empty', order: 2 }, ''),
      project({}, ''),
    ])
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^places\/meadow\.md: .*titel/),
        expect.stringMatching(/^milestones\/Not A Slug\.md: slug: lowercase words joined by hyphens/),
        "milestones/empty.md: a milestone needs its card's words below the fields",
        "projects/thing.md: a project needs its card's words below the fields",
      ]),
    )
  })

  it('refuses links, signs and places that point at nothing', () => {
    const problems = problemsOf([
      site(),
      place({ signs: [{ text: 'Go to the moon', place: 'moon' }] }),
      milestone({ links: ['myspace'], place: 'meadow' }),
      milestone({ slug: 'lost', place: 'nowhere', order: 2 }),
      project(),
    ])
    expect(problems).toEqual([
      'place meadow: a sign points at moon, which is no place',
      'milestone first: link myspace is no profile in site.md',
      'milestone lost: place nowhere does not exist',
    ])
  })

  it('refuses duplicates of every kind', () => {
    const problems = problemsOf([
      site({ profiles: [1, 2].map(() => ({ id: 'github', label: 'GitHub', url: 'https://github.com/zimmertr' })) }),
      site(),
      place(),
      place(),
      milestone(),
      milestone(),
      project(),
      project({ repo: 'ZIMMERTR/thing' }),
    ])
    expect(problems).toEqual([
      'site.md: a second site file',
      'profile id github is used twice',
      'place meadow is defined twice',
      'two places share order 0',
      'project thing is defined twice',
      'repo zimmertr/thing is listed twice',
      'two projects share order 1',
      'milestone meadow/first is defined twice',
      'two milestones share order meadow/1',
    ])
  })

  it('refuses a file without fields, an unknown kind, prose in the site file, and no site file', () => {
    expect(problemsOf([file('loose.md', null, 'Just words.'), file('odd.md', { kind: 'trail' }), place(), milestone(), project()])).toEqual([
      'loose.md: starts without a --- block of YAML fields',
      'odd.md: kind must be site, place, milestone or project',
      'no site file',
    ])
    expect(problemsOf([{ ...site(), source: `${site().source}Words.\n` }, place(), milestone(), project()])).toEqual([
      'site.md: the site file holds fields only',
    ])
  })

  it('refuses a profile link that is not https', () => {
    const problems = problemsOf([site({ profiles: [{ id: 'old', label: 'Old', url: 'http://example.com' }] }), place(), milestone(), project()])
    expect(problems).toEqual([expect.stringMatching(/^site\.md: profiles\.0\.url: /), 'no site file'])
  })

  it('reports every problem in one message', () => {
    expect(() => buildContent([])).toThrow(/The content has 1 problem\(s\):\n {2}no site file/)
  })
})

describe('splitFrontMatter', () => {
  it('refuses a key given twice', () => {
    expect(() => splitFrontMatter('x.md', '---\nkind: place\nkind: site\n---\n')).toThrow(/unique/)
  })
})

describe('the real content', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const content = buildContent(readContentFiles(root))

  it('reads every file under the content folders and nothing beside them', () => {
    const paths = readContentFiles(root).map((f) => f.path)
    expect(paths).toContain('site.md')
    expect(paths.filter((p) => p.startsWith('projects/'))).toHaveLength(6)
    expect(paths).not.toContain('CLAUDE.md')
  })

  it('holds the four places, in the order a visitor meets them', () => {
    expect(content.places.map((p) => p.slug)).toEqual(['trailhead', 'about-lake', 'the-stack', 'sideproject-spires'])
  })

  it('holds the PRD\u2019s Trailhead words', () => {
    const trailhead = content.places[0]
    expect(content.site.name).toBe('TJ Zimmerman')
    expect(trailhead?.html).toContain('is a principal platform engineer based out of Seattle, WA.')
    expect(trailhead?.signs.map((s) => s.text)).toEqual([
      'Run to About Lake to learn more about TJ',
      'Climb The Stack to learn more about his skills',
      'Climb the Sideproject Spires to see some of his personal projects',
    ])
  })

  it('holds the six projects with their repos', () => {
    expect(content.projects.map((p) => p.repo)).toEqual([
      'zimmertr/bluebird',
      'zimmertr/TJs-Kubernetes-Service',
      'zimmertr/hevy-garmin-sync',
      'zimmertr/trailhead',
      'zimmertr/yggdrasil',
      'zimmertr/Kubernetes-Manifests',
    ])
  })

  it('holds the five profiles', () => {
    expect(content.site.profiles.map((p) => p.label)).toEqual(['LinkedIn', 'GitHub', 'Strava', 'Peakbagger', 'Mountain Project'])
  })
})
