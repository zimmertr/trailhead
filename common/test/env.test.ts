import { describe, expect, it } from 'vitest'
import { ConfigError, buildInfo, logLevel, optional, port, required } from '../src/env.ts'

describe('env', () => {
  it('reads a required variable and names a missing one', () => {
    expect(required({ DATABASE_URL: 'postgresql://x' }, 'DATABASE_URL')).toBe('postgresql://x')
    expect(() => required({ DATABASE_URL: '  ' }, 'DATABASE_URL')).toThrow(new ConfigError('DATABASE_URL is required'))
  })

  it('treats an empty optional variable as unset', () => {
    expect(optional({ GITHUB_TOKEN: '' }, 'GITHUB_TOKEN')).toBeUndefined()
    expect(optional({ GITHUB_TOKEN: 'x' }, 'GITHUB_TOKEN')).toBe('x')
  })

  it('reads a port, falls back when unset, and refuses one out of range', () => {
    expect(port({}, 'PORT', 8080)).toBe(8080)
    expect(port({ PORT: '9000' }, 'PORT', 8080)).toBe(9000)
    for (const bad of ['0', '65536', '80.5', 'http']) {
      expect(() => port({ PORT: bad }, 'PORT', 8080)).toThrow('PORT must be a port number, 1 to 65535')
    }
  })

  it('reads the log level in any case and refuses an unknown one', () => {
    expect(logLevel({})).toBe('info')
    expect(logLevel({ LOG_LEVEL: 'DEBUG' })).toBe('debug')
    expect(() => logLevel({ LOG_LEVEL: 'loud' })).toThrow(/LOG_LEVEL must be one of/)
  })

  it('reports the baked-in build, or dev outside an image', () => {
    expect(buildInfo({})).toEqual({ version: 'dev', commit: 'dev' })
    expect(buildInfo({ APP_VERSION: '0.1.0', APP_COMMIT: 'abc123' })).toEqual({ version: '0.1.0', commit: 'abc123' })
  })
})
