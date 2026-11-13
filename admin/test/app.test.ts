import { errorBody, securityHeaders } from '@trailhead/common'
import { describe, expect, it } from 'vitest'
import { loadConfig } from '../src/config.ts'
import { admin, databaseDown } from './fixtures.ts'

describe('admin', () => {
  it('answers /healthz and /version', async () => {
    const { app } = admin()
    expect((await app.inject({ url: '/healthz' })).json()).toEqual({ status: 'ok' })
    expect((await app.inject({ url: '/version' })).json()).toEqual({ version: '0.1.0', commit: 'abc1234' })
  })

  it('answers /readyz only while the database answers', async () => {
    expect((await admin().app.inject({ url: '/readyz' })).statusCode).toBe(200)
    const { app, lines } = admin({
      ping: async () => {
        throw databaseDown()
      },
    })
    const response = await app.inject({ url: '/readyz' })
    expect(response.statusCode).toBe(503)
    expect(response.json()).toEqual(errorBody('unavailable'))
    expect(lines()).toContainEqual(expect.objectContaining({ level: 'warn', msg: 'readyz: the database did not answer' }))
  })

  it('serves its placeholder page under a policy that loads nothing else', async () => {
    const { app } = admin()
    const response = await app.inject({ url: '/' })
    expect(response.headers['content-type']).toBe('text/html; charset=utf-8')
    expect(response.body).toContain('<h1>Trailhead admin</h1>')
    expect(response.body).not.toMatch(/<script|<link|style=/)
    expect(response.headers).toMatchObject(securityHeaders('html'))
  })

  it('serves its license file, and a 404 with the headers', async () => {
    const { app } = admin()
    expect((await app.inject({ url: '/third-party-licenses.txt' })).body).toContain('fastify')
    const missing = await app.inject({ url: '/approve' })
    expect(missing.statusCode).toBe(404)
    expect(missing.headers['x-frame-options']).toBe('DENY')
  })

  it('needs the database setting and nothing else', () => {
    expect(loadConfig({ DATABASE_URL: 'postgresql://x' })).toEqual({ port: 8080, databaseUrl: 'postgresql://x', logLevel: 'info', build: { version: 'dev', commit: 'dev' } })
    expect(() => loadConfig({})).toThrow('DATABASE_URL is required')
  })
})
