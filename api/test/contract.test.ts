import { describe, expect, it } from 'vitest'
import { loadConfig } from '../src/config.ts'
import { createMetrics, metricsServer } from '../src/metrics.ts'
import { openApiDocument } from '../src/openapi.ts'
import { ROUTES } from '../src/routes.ts'
import { api } from './fixtures.ts'

type Document = { paths: Record<string, { get: { operationId: string; responses: Record<string, unknown> } }> }

describe('the OpenAPI document', () => {
  const document = openApiDocument() as Document

  it('describes exactly the routes the app serves', async () => {
    const { app } = await api()
    await app.ready()
    expect(Object.keys(document.paths)).toEqual(ROUTES.map((r) => r.url))
    for (const url of Object.keys(document.paths)) expect(app.hasRoute({ method: 'GET', url })).toBe(true)
  })

  it('names each operation from its path', () => {
    expect(Object.values(document.paths).map((p) => p.get.operationId)).toEqual(['healthz', 'readyz', 'version', 'v1Projects', 'thirdPartyLicensesTxt'])
  })

  it('lists 429 only where the rate limit applies, and 503 only where the database is read', () => {
    expect(Object.keys(document.paths['/healthz']?.get.responses ?? {})).toEqual(['200', '400', '413', '500'])
    expect(Object.keys(document.paths['/api/v1/projects']?.get.responses ?? {})).toEqual(['200', '400', '413', '429', '500', '503'])
  })
})

describe('loadConfig', () => {
  it('reads the defaults and needs only the database', () => {
    expect(loadConfig({ DATABASE_URL: 'postgresql://x' })).toEqual({
      port: 8080,
      metricsPort: 9464,
      databaseUrl: 'postgresql://x',
      logLevel: 'info',
      clientIpHeader: 'cf-connecting-ip',
      build: { version: 'dev', commit: 'dev' },
    })
  })

  it('lower-cases a custom client header, since Node does', () => {
    expect(loadConfig({ DATABASE_URL: 'x', CLIENT_IP_HEADER: 'X-Real-IP' }).clientIpHeader).toBe('x-real-ip')
  })

  it('refuses to start without a database', () => {
    expect(() => loadConfig({})).toThrow('DATABASE_URL is required')
  })
})

describe('metricsServer', () => {
  it('serves /metrics in the Prometheus format and nothing else', async () => {
    const server = metricsServer(createMetrics()).listen(0, '127.0.0.1')
    await new Promise((resolve) => server.once('listening', resolve))
    const { port } = server.address() as { port: number }
    try {
      const metrics = await fetch(`http://127.0.0.1:${port}/metrics`)
      expect(metrics.status).toBe(200)
      expect(await metrics.text()).toContain('# TYPE trailhead_api_requests_total counter')
      expect((await fetch(`http://127.0.0.1:${port}/`)).status).toBe(404)
    } finally {
      server.close()
    }
  })
})
