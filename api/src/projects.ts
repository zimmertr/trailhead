import type { Project } from '@trailhead/content'
import type { StatsRow } from './store.ts'

export type ProjectOut = {
  slug: string
  name: string
  repo: string
  url: string
  stars: number | null
  language: string | null
  license: string | null
  release: { tag: string; publishedAt: string } | null
  fetchedAt: string | null
}

// The content files decide which projects exist and in what order; the
// database only adds numbers. A project with no row yet answers with nulls,
// and a row for a repo the content no longer lists is ignored.
export function projectsResponse(projects: Project[], rows: StatsRow[]): { projects: ProjectOut[] } {
  const byRepo = new Map(rows.map((row) => [row.repo.toLowerCase(), row]))
  return {
    projects: projects.map((project) => {
      const row = byRepo.get(project.repo.toLowerCase())
      return {
        slug: project.slug,
        name: project.name,
        repo: project.repo,
        url: `https://github.com/${project.repo}`,
        stars: row?.stars ?? null,
        language: row?.language ?? null,
        license: row?.license ?? null,
        release:
          row?.release_tag && row.release_published_at
            ? { tag: row.release_tag, publishedAt: row.release_published_at.toISOString() }
            : null,
        fetchedAt: row?.fetched_at.toISOString() ?? null,
      }
    }),
  }
}
