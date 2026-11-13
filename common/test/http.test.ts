import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'
import { ERRORS, MAX_BODY_BYTES, codeFor, errorBody, installHttpBasics, securityHeaders, serverOptions } from '../src/http.ts'
import { captureLogger } from './fixtures.ts'

function app() {
  const { logger, lines } = captureLogger()
  const instance = Fastify(serverOptions(logger))
  installHttpBasics(instance, 'json')
  instance.get('/ok', async () => ({ ok: true }))
  instance.get('/boom', async () => {
    throw new Error('the database password is hunter2')
  })
  instance.get('/teapot', async () => {
    throw Object.assign(new Error('short and stout'), { statusCode: 418 })
  })
  instance.get('/busy', async () => {
    throw Object.assign(new Error('slow down'), { statusCode: 429 })
  })
  return { instance, lines }
}

describe('errorBody', () => {
  it('builds the one error shape from the table', () => {
    expect(errorBody('rate_limited')).toEqual({ error: { code: 'rate_limited', message: 'Too many requests. Try again later.', retryable: true } })
  })

  it('ends every retryable message with the remedy that works', () => {
    for (const { retryable, message } of Object.values(ERRORS)) {
      expect(message.endsWith('Try again later.')).toBe(retryable)
    }
  })
})

describe('codeFor', () => {
  it('maps a known status to its code and anything else to internal', () => {
    expect(codeFor({ statusCode: 413 })).toBe('payload_too_large')
    expect(codeFor({ statusCode: 418 })).toBe('internal')
    expect(codeFor({})).toBe('internal')
  })
})

describe('installHttpBasics', () => {
  it('puts the security headers on a success, a 404 and an error alike', async () => {
    const { instance } = app()
    for (const url of ['/ok', '/nowhere', '/boom']) {
      const response = await instance.inject({ url })
      expect(response.headers).toMatchObject(securityHeaders('json'))
    }
  })

  it('answers an unknown address with not_found', async () => {
    const { instance } = app()
    const response = await instance.inject({ url: '/nowhere' })
    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual(errorBody('not_found'))
  })

  it('answers an unhandled error as internal, logs it, and never shows its text', async () => {
    const { instance, lines } = app()
    const response = await instance.inject({ url: '/boom' })
    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual(errorBody('internal'))
    expect(response.body).not.toContain('hunter2')
    expect(lines().filter((l) => l.level === 'error')).toEqual([
      expect.objectContaining({ msg: 'unhandled error', err: expect.objectContaining({ stack: expect.any(String) }) }),
    ])
  })

  it('answers an error with a status the table lacks as internal', async () => {
    const { instance } = app()
    const response = await instance.inject({ url: '/teapot' })
    expect(response.statusCode).toBe(500)
  })

  it('keeps a known status and does not log it as a failure', async () => {
    const { instance, lines } = app()
    const response = await instance.inject({ url: '/busy' })
    expect(response.statusCode).toBe(429)
    expect(response.json()).toEqual(errorBody('rate_limited'))
    expect(lines().filter((l) => l.level === 'error')).toEqual([])
  })

  it('refuses a body over the cap before reading it, on any address', async () => {
    const { instance } = app()
    for (const url of ['/ok', '/nowhere']) {
      const response = await instance.inject({ method: 'POST', url, headers: { 'content-type': 'text/plain', 'content-length': String(MAX_BODY_BYTES + 1) }, payload: 'x'.repeat(MAX_BODY_BYTES + 1) })
      expect(response.statusCode).toBe(413)
      expect(response.json()).toEqual(errorBody('payload_too_large'))
      expect(response.headers['x-content-type-options']).toBe('nosniff')
    }
  })

  it('logs no request id and no client address', async () => {
    const { instance, lines } = app()
    await instance.inject({ url: '/boom', remoteAddress: '203.0.113.9' })
    expect(lines()[0]).not.toHaveProperty('reqId')
    expect(JSON.stringify(lines())).not.toContain('203.0.113.9')
  })

  it('logs one line per response with the route pattern, never the URL', async () => {
    const { instance, lines } = app()
    instance.get('/things/:id', async () => ({ ok: true }))
    await instance.inject({ url: '/things/secret-id?q=private' })
    await instance.inject({ url: '/nowhere?q=private' })
    expect(lines()).toEqual([
      expect.objectContaining({ level: 'info', msg: 'response', method: 'GET', route: '/things/:id', status: 200, ms: expect.any(Number) }),
      expect.objectContaining({ route: 'unmatched', status: 404 }),
    ])
    expect(JSON.stringify(lines())).not.toContain('private')
  })

  it('logs probes at debug, so they stay out of an info log', async () => {
    const { logger, lines } = captureLogger('test', 'info')
    const instance = Fastify(serverOptions(logger))
    installHttpBasics(instance, 'json')
    instance.get('/healthz', async () => ({ status: 'ok' }))
    await instance.inject({ url: '/healthz' })
    expect(lines()).toEqual([])
  })

  it('refuses an unknown query parameter instead of dropping it', async () => {
    const { instance } = app()
    instance.get('/strict', { schema: { querystring: { type: 'object', additionalProperties: false, properties: {} } } }, async () => ({ ok: true }))
    const response = await instance.inject({ url: '/strict?extra=1' })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual(errorBody('bad_request'))
  })

  it('serves a page policy that lets the admin panel load only itself', () => {
    expect(securityHeaders('html')['content-security-policy']).toMatch(/^default-src 'none'; style-src 'self'/)
  })
})
