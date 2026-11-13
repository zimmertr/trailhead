// `node migrate.js` in the fetcher image: applies db/migrations and
// db/grants.sql with the owner's credentials, then exits. The chart runs it
// before each rollout; compose runs it before the services start.
import { join } from 'node:path'
import { createLogger, createPool, logLevel, migrate, required, runMain } from '@trailhead/common'

await runMain('migrate', async () => {
  const logger = createLogger({ service: 'migrate', level: logLevel(process.env) })
  const pool = createPool(required(process.env, 'DATABASE_URL'), 'migrate', logger)
  try {
    const applied = await migrate(pool, join(import.meta.dirname, 'db'), logger)
    logger.info({ applied: applied.length }, 'the database is up to date')
  } finally {
    await pool.end()
  }
})
