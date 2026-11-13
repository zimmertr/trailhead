import type { Logger } from '@trailhead/common'
import type { RepoStats } from './github.ts'

export type RunDeps = {
  repos: string[]
  fetchStats: (repo: string) => Promise<RepoStats>
  save: (repo: string, stats: RepoStats, fetchedAt: Date) => Promise<void>
  logger: Logger
  now: () => Date
}

// One repo at a time: six repos and twelve reads don't need more. A repo
// that fails is logged and skipped, so its last good numbers stay; the others
// still update, and the run reports the failure so the job exits non-zero.
export async function runFetch({ repos, fetchStats, save, logger, now }: RunDeps): Promise<{ saved: string[]; failed: string[] }> {
  const saved: string[] = []
  const failed: string[] = []
  for (const repo of repos) {
    try {
      const stats = await fetchStats(repo)
      await save(repo, stats, now())
      saved.push(repo)
      logger.info({ repo, stars: stats.stars, release: stats.release?.tag ?? null }, 'saved numbers')
    } catch (error) {
      failed.push(repo)
      logger.error({ repo, err: error }, 'kept the last good numbers: this repo failed')
    }
  }
  logger.info({ saved: saved.length, failed: failed.length }, 'fetch finished')
  return { saved, failed }
}
