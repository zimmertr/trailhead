// The composition root of the CronJob. Exits non-zero when any repo failed,
// so the job's history and its alert show it.
import { createLogger, createPool, runMain } from '@trailhead/common'
import { content } from '@trailhead/content'
import { loadConfig } from './config.ts'
import { fetchRepoStats } from './github.ts'
import { runFetch } from './run.ts'
import { saveStats } from './store.ts'

await runMain('fetcher', async () => {
  const config = loadConfig(process.env)
  const logger = createLogger({ service: 'fetcher', level: config.logLevel })
  const pool = createPool(config.databaseUrl, 'fetcher', logger)
  try {
    const { failed } = await runFetch({
      repos: content.projects.map((p) => p.repo),
      fetchStats: (repo) => fetchRepoStats(repo, { fetch: globalThis.fetch, token: config.githubToken }),
      save: (repo, stats, fetchedAt) => saveStats(pool, repo, stats, fetchedAt),
      logger,
      now: () => new Date(),
    })
    if (failed.length > 0) process.exitCode = 1
  } finally {
    await pool.end()
  }
})
