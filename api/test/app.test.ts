import { errorBody, securityHeaders } from '@trailhead/common'
import { describe, expect, it } from 'vitest'
import { RATE_LIMIT_MAX } from '../src/limits.ts'
import { api, connectionRefused, fakeStore, project, row } from './fixtures.ts'

const visitor = (address: string) => ({ 'cf-connecting-ip': address })

describe('the probes', () => {
  it('answers /healthz without touching the database', async () => {
    const { app } = await api({ store: fakeStore([], connectionRefused()) })
    const response = await app.inject({ url: '/healthz' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })

  it('answers /readyz only while the database answers', async () => {
    expect((await (await api()).app.inject({ url: '/readyz' })).json()).toEqual({ status: 'ok' })
    const { app, lines } = await api({ store: fakeStore([], connectionRefused()) })
    const response = await app.inject({ url: '/readyz' })
    expect(response.statusCode).toBe(503)
    expect(response.json()).toEqual(errorBody('unavailable'))
    expect(lines()).toContainEqual(expect.objectContaining({ level: 'warn', msg: 'readyz: the database did not answer' }))
  })

  it('never rate limits a probe', async () => {
    const { app } = await api()
    for (let i = 0; i < RATE_LIMIT_MAX + 5; i++) {
      expect((await app.inject({ url: '/healthz' })).statusCode).toBe(200)
    }
  })
})

describe('GET /api/version', () => {
  it('answers the baked-in version and commit, uncached', async () => {
    const { app } = await api()
    const response = await app.inject({ url: '/api/version' })
    expect(response.json()).toEqual({ version: '0.1.0', commit: 'abc1234' })
    expect(response.headers['cache-control']).toBe('no-store')
  })
})

describe('GET /api/v1/projects', () => {
  it('answers each project with its numbers, cached for five minutes', async () => {
    const { app } = await api({ store: fakeStore([row()]) })
    const response = await app.inject({ url: '/api/v1/projects' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ projects: [{ slug: 'bluebird', stars: 2, release: { tag: 'v0.140.0' } }] })
    expect(response.headers['cache-control']).toBe('public, max-age=300')
  })

  it('answers nulls when no numbers are stored', async () => {
    const { app } = await api({ projects: [project(), project({ slug: 'trailhead', repo: 'zimmertr/trailhead', order: 2 })] })
    const body = (await app.inject({ url: '/api/v1/projects' })).json<{ projects: { stars: null }[] }>()
    expect(body.projects.map((p) => p.stars)).toEqual([null, null])
  })

  it('answers unavailable, retryable, when the database is down', async () => {
    const { app } = await api({ store: fakeStore([], connectionRefused()) })
    const response = await app.inject({ url: '/api/v1/projects' })
    expect(response.statusCode).toBe(503)
    expect(response.json()).toEqual(errorBody('unavailable'))
  })

  it('refuses an unknown query parameter', async () => {
    const { app } = await api()
    const response = await app.inject({ url: '/api/v1/projects?sort=stars' })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual(errorBody('bad_request'))
  })

  it('sends only the documented fields, whatever the store hands back', async () => {
    const { app } = await api({ store: fakeStore([{ ...row(), secret: 'x' } as never]) })
    expect((await app.inject({ url: '/api/v1/projects' })).body).not.toContain('secret')
  })
})

describe('GET /api/third-party-licenses.txt', () => {
  it('serves the bundled license file as text', async () => {
    const { app } = await api()
    const response = await app.inject({ url: '/api/third-party-licenses.txt' })
    expect(response.headers['content-type']).toBe('text/plain; charset=utf-8')
    expect(response.body).toBe('fastify 5.12.8\nMIT\n')
  })
})

describe('the rate limit', () => {
  it('answers 429 with Retry-After once a client spends its budget', async () => {
    const { app } = await api()
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      expect((await app.inject({ url: '/api/version', headers: visitor('203.0.113.7') })).statusCode).toBe(200)
    }
    const response = await app.inject({ url: '/api/version', headers: visitor('203.0.113.7') })
    expect(response.statusCode).toBe(429)
    expect(response.json()).toEqual(errorBody('rate_limited'))
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0)
    expect(response.headers).toMatchObject(securityHeaders('json'))
  })

  it('gives each client its own bucket', async () => {
    const { app } = await api()
    for (let i = 0; i < RATE_LIMIT_MAX + 1; i++) await app.inject({ url: '/api/version', headers: visitor('203.0.113.7') })
    expect((await app.inject({ url: '/api/version', headers: visitor('198.51.100.1') })).statusCode).toBe(200)
  })

  it('takes identity from the proxy header alone: neither the socket nor X-Forwarded-For moves the bucket', async () => {
    const { app } = await api()
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      await app.inject({ url: '/api/version', headers: { ...visitor('203.0.113.7'), 'x-forwarded-for': `198.51.100.${i}` }, remoteAddress: `192.0.2.${i}` })
    }
    const response = await app.inject({ url: '/api/version', headers: { ...visitor('203.0.113.7'), 'x-forwarded-for': '198.51.100.250' }, remoteAddress: '192.0.2.250' })
    expect(response.statusCode).toBe(429)
  })

  it('counts every address in one IPv6 /64 as one client', async () => {
    const { app } = await api()
    for (let i = 0; i < RATE_LIMIT_MAX; i++) await app.inject({ url: '/api/version', headers: visitor(`2001:db8:1:2::${i.toString(16)}`) })
    expect((await app.inject({ url: '/api/version', headers: visitor('2001:db8:1:2:ffff::1') })).statusCode).toBe(429)
    expect((await app.inject({ url: '/api/version', headers: visitor('2001:db8:1:3::1') })).statusCode).toBe(200)
  })
})

describe('every response', () => {
  it('carries the security headers, a 404 included', async () => {
    const { app } = await api()
    for (const url of ['/api/version', '/api/nope', '/']) {
      expect((await app.inject({ url })).headers).toMatchObject(securityHeaders('json'))
    }
    const notFound = await app.inject({ url: '/api/nope' })
    expect(notFound.statusCode).toBe(404)
    expect(notFound.json()).toEqual(errorBody('not_found'))
  })

  it('refuses an oversized body with 413 before reading it', async () => {
    const { app } = await api()
    const response = await app.inject({ method: 'POST', url: '/api/v1/projects', headers: { 'content-type': 'application/json' }, payload: JSON.stringify({ x: 'y'.repeat(4096) }) })
    expect(response.statusCode).toBe(413)
  })

  it('logs no client address, not even one a caller sends', async () => {
    const { app, raw } = await api({ store: fakeStore([], connectionRefused()) })
    await app.inject({ url: '/api/v1/projects', headers: visitor('203.0.113.7'), remoteAddress: '192.0.2.9' })
    expect(raw()).not.toMatch(/203\.0\.113\.7|192\.0\.2\.9|10\.0\.0\.5/)
  })

  it('is counted in the metrics by route pattern and status', async () => {
    const { app, metrics } = await api()
    await app.inject({ url: '/api/version' })
    await app.inject({ url: '/api/nope' })
    const text = await metrics.registry.metrics()
    expect(text).toContain('trailhead_api_requests_total{method="GET",route="/api/version",status="200"} 1')
    expect(text).toContain('trailhead_api_requests_total{method="GET",route="unmatched",status="404"} 1')
  })
})
