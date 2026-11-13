// The composition root. Run only from the image, where the license file sits
// beside the bundle.
import { readFileSync } from 'node:fs'
import { createLogger, createPool, ping, runMain } from '@trailhead/common'
import { buildAdmin } from './app.ts'
import { loadConfig } from './config.ts'

await runMain('admin', async () => {
  const config = loadConfig(process.env)
  const logger = createLogger({ service: 'admin', level: config.logLevel })
  const pool = createPool(config.databaseUrl, 'admin', logger)
  const app = buildAdmin({
    ping: () => ping(pool),
    build: config.build,
    logger,
    licenses: readFileSync(new URL('third-party-licenses.txt', import.meta.url), 'utf8'),
  })
  await app.listen({ host: '0.0.0.0', port: config.port })
  logger.info({ port: config.port, version: config.build.version }, 'listening')
  const stop = async () => {
    await app.close()
    await pool.end()
  }
  process.once('SIGTERM', () => void stop())
  process.once('SIGINT', () => void stop())
})
