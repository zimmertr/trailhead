// The composition root: read the settings, wire the parts, listen. Run only
// from the image, where the license file sits beside the bundle.
import { readFileSync } from 'node:fs'
import { createLogger, createPool, runMain } from '@trailhead/common'
import { content } from '@trailhead/content'
import { buildApi } from './app.ts'
import { loadConfig } from './config.ts'
import { createMetrics, metricsServer } from './metrics.ts'
import { pgStore } from './store.ts'

await runMain('api', async () => {
  const config = loadConfig(process.env)
  const logger = createLogger({ service: 'api', level: config.logLevel })
  const pool = createPool(config.databaseUrl, 'api', logger)
  const metrics = createMetrics()
  const app = await buildApi({
    store: pgStore(pool),
    projects: content.projects,
    build: config.build,
    logger,
    clientIpHeader: config.clientIpHeader,
    licenses: readFileSync(new URL('third-party-licenses.txt', import.meta.url), 'utf8'),
    metrics,
  })
  await app.listen({ host: '0.0.0.0', port: config.port })
  const metricsHttp = metricsServer(metrics).listen(config.metricsPort, '0.0.0.0')
  logger.info({ port: config.port, metricsPort: config.metricsPort, version: config.build.version }, 'listening')

  // Kubernetes sends SIGTERM and waits; finish what's in flight, then go.
  const stop = async () => {
    metricsHttp.close()
    await app.close()
    await pool.end()
  }
  process.once('SIGTERM', () => void stop())
  process.once('SIGINT', () => void stop())
})
