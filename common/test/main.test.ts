import { afterEach, describe, expect, it } from 'vitest'
import { ConfigError } from '../src/env.ts'
import { runMain } from '../src/main.ts'
import { captureLogger } from './fixtures.ts'

describe('runMain', () => {
  afterEach(() => {
    process.exitCode = undefined
  })

  it('runs the entry point and leaves the exit code alone when it succeeds', async () => {
    const { logger, lines } = captureLogger()
    let ran = false
    await runMain('test', async () => {
      ran = true
    }, logger)
    expect(ran).toBe(true)
    expect(process.exitCode).toBeUndefined()
    expect(lines()).toEqual([])
  })

  it('logs a failure as one fatal line and exits non-zero', async () => {
    const { logger, lines } = captureLogger()
    await runMain('test', async () => {
      throw new ConfigError('DATABASE_URL is required')
    }, logger)
    expect(process.exitCode).toBe(1)
    expect(lines()).toEqual([expect.objectContaining({ level: 'fatal', msg: 'stopped on an error', err: expect.objectContaining({ message: 'DATABASE_URL is required' }) })])
  })
})
