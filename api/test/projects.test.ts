import { describe, expect, it } from 'vitest'
import { projectsResponse } from '../src/projects.ts'
import { START, daysAfterStart, project, row } from './fixtures.ts'

describe('projectsResponse', () => {
  it('adds the stored numbers to each project the content lists', () => {
    expect(projectsResponse([project()], [row()])).toEqual({
      projects: [
        {
          slug: 'bluebird',
          name: 'Bluebird Forecast',
          repo: 'zimmertr/bluebird',
          url: 'https://github.com/zimmertr/bluebird',
          stars: 2,
          language: 'TypeScript',
          license: 'NOASSERTION',
          release: { tag: 'v0.140.0', publishedAt: daysAfterStart(-3).toISOString() },
          fetchedAt: START.toISOString(),
        },
      ],
    })
  })

  it('answers nulls for a project whose numbers were never fetched', () => {
    expect(projectsResponse([project()], []).projects[0]).toMatchObject({ stars: null, language: null, license: null, release: null, fetchedAt: null })
  })

  it('answers a null release for a repo with none', () => {
    expect(projectsResponse([project()], [row({ release_tag: null, release_published_at: null })]).projects[0]?.release).toBeNull()
  })

  it('matches repos regardless of case, keeps the content order, and ignores rows no project lists', () => {
    const response = projectsResponse(
      [project({ slug: 'b', repo: 'zimmertr/B' }), project({ slug: 'a', repo: 'zimmertr/a' })],
      [row({ repo: 'zimmertr/a', stars: 1 }), row({ repo: 'zimmertr/b', stars: 9 }), row({ repo: 'zimmertr/gone' })],
    )
    expect(response.projects.map((p) => [p.slug, p.stars])).toEqual([
      ['b', 9],
      ['a', 1],
    ])
  })
})
