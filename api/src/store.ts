import { type Pool, ping } from '@trailhead/common'

export type StatsRow = {
  repo: string
  stars: number
  language: string | null
  license: string | null
  release_tag: string | null
  release_published_at: Date | null
  fetched_at: Date
}

// What the API needs from the database: read the numbers, and say whether
// it's reachable. Read-only, matching the trailhead_api role (db/grants.sql).
export type Store = {
  listStats(): Promise<StatsRow[]>
  ping(): Promise<void>
}

export function pgStore(pool: Pool): Store {
  return {
    async listStats() {
      const { rows } = await pool.query<StatsRow>(
        'SELECT repo, stars, language, license, release_tag, release_published_at, fetched_at FROM project_stats',
      )
      return rows
    },
    ping: () => ping(pool),
  }
}
