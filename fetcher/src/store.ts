import type { Pool } from '@trailhead/common'
import type { RepoStats } from './github.ts'

// Called only with numbers from a good fetch, so a failed run never touches
// a row (docs/DATA.md). INSERT and UPDATE, matching the trailhead_fetcher
// role (db/grants.sql).
export async function saveStats(pool: Pick<Pool, 'query'>, repo: string, stats: RepoStats, fetchedAt: Date): Promise<void> {
  await pool.query(
    `INSERT INTO project_stats (repo, stars, language, license, release_tag, release_published_at, fetched_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (repo) DO UPDATE SET
       stars = EXCLUDED.stars,
       language = EXCLUDED.language,
       license = EXCLUDED.license,
       release_tag = EXCLUDED.release_tag,
       release_published_at = EXCLUDED.release_published_at,
       fetched_at = EXCLUDED.fetched_at`,
    [repo, stats.stars, stats.language, stats.license, stats.release?.tag ?? null, stats.release?.publishedAt ?? null, fetchedAt],
  )
}
