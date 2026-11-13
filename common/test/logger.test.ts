import { describe, expect, it } from 'vitest'
import { redact } from '../src/logger.ts'
import { captureLogger } from './fixtures.ts'

describe('redact', () => {
  it.each([
    ['a classic GitHub token', `sent ghp_${'a'.repeat(36)} upstream`, 'sent [redacted] upstream'],
    ['a fine-grained GitHub token', `github_pat_${'B1_'.repeat(20)}`, '[redacted]'],
    ['a bearer header', 'Authorization: Bearer abc.def.ghi-123', 'Authorization: Bearer [redacted]'],
    ['a connection string password', 'postgresql://api:s3cret!@db:5432/trailhead', 'postgresql://api:[redacted]@db:5432/trailhead'],
    ['an IPv4 address', 'from 203.0.113.7 at noon', 'from [redacted] at noon'],
    ['a full IPv6 address', 'from 2001:0db8:0000:0000:0000:ff00:0042:8329', 'from [redacted]'],
    ['a compressed IPv6 address', '"peer":"2001:db8::1"', '"peer":"[redacted]"'],
    ['the IPv6 loopback', 'peer ::1 said hi', 'peer [redacted] said hi'],
  ])('masks %s', (_name, input, output) => {
    expect(redact(input)).toBe(output)
  })

  it.each([
    ['a clock reading', '"time":"2030-01-01T03:04:05.000Z"'],
    ['a version', 'v0.1.0'],
    ['a repo name', 'zimmertr/TJs-Kubernetes-Service'],
    ['the word token in a sentence', 'GitHub refused the token: rejected'],
  ])('leaves %s alone', (_name, input) => {
    expect(redact(input)).toBe(input)
  })

  it('escapes the controls JSON leaves raw', () => {
    expect(redact('a\u0085b\u2028c\u007f')).toBe('a\\u0085b\\u2028c\\u007f')
  })
})

describe('createLogger', () => {
  it('writes one JSON line per record with the service, a label level and an ISO time', () => {
    const { logger, lines } = captureLogger('api')
    logger.info({ route: '/healthz' }, 'hello')
    expect(lines()).toEqual([{ level: 'info', time: expect.stringMatching(/^\d{4}-\d\d-\d\dT/), service: 'api', route: '/healthz', msg: 'hello' }])
  })

  it('masks a secret wherever it sits in the record, the error stack included', () => {
    const { logger, raw } = captureLogger()
    const token = `ghp_${'z'.repeat(36)}`
    logger.error({ err: new Error(`GitHub refused ${token}`), header: `Bearer ${token}` }, `failed with ${token}`)
    expect(raw()).not.toContain(token)
    expect(raw()).toContain('[redacted]')
  })

  it('drops records below its level', () => {
    const { logger, lines } = captureLogger('api', 'warn')
    logger.info('quiet')
    logger.warn('loud')
    expect(lines().map((l) => l.msg)).toEqual(['loud'])
  })
})
