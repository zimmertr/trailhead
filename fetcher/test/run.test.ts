import { describe, expect, it } from 'vitest'
import { loadConfig } from '../src/config.ts'
import { GitHubError } from '../src/github.ts'
import { runFetch } from '../src/run.ts'
import { START, captureLogger, stats } from './fixtures.ts'

describe('runFetch', () => {
  it('saves each repo it fetched, stamped with the run time', async () => {
    const { logger } = captureLogger('fetcher')
    const saves: [string, number, Date][] = []
    const result = await runFetch({
      repos: ['zimmertr/a', 'zimmertr/b'],
      fetchStats: async (repo) => stats({ stars: repo === 'zimmertr/a' ? 1 : 2 }),
      save: async (repo, s, at) => {
        saves.push([repo, s.stars, at])
      },
      logger,
      now: () => START,
    })
    expect(result).toEqual({ saved: ['zimmertr/a', 'zimmertr/b'], failed: [] })
    expect(saves).toEqual([
      ['zimmertr/a', 1, START],
      ['zimmertr/b', 2, START],
    ])
  })

  it('skips a repo that fails, saving nothing for it, and still saves the rest', async () => {
    const { logger, lines } = captureLogger('fetcher')
    const saved: string[] = []
    const result = await runFetch({
      repos: ['zimmertr/a', 'zimmertr/broken', 'zimmertr/c'],
      fetchStats: async (repo) => {
        if (repo === 'zimmertr/broken') throw new GitHubError('GET /repos/zimmertr/broken answered 502')
        return stats()
      },
      save: async (repo) => {
        saved.push(repo)
      },
      logger,
      now: () => START,
    })
    expect(result).toEqual({ saved: ['zimmertr/a', 'zimmertr/c'], failed: ['zimmertr/broken'] })
    expect(saved).toEqual(['zimmertr/a', 'zimmertr/c'])
    expect(lines()).toContainEqual(expect.objectContaining({ level: 'error', repo: 'zimmertr/broken', msg: 'kept the last good numbers: this repo failed' }))
  })

  it('counts a failed save as a failure too', async () => {
    const { logger } = captureLogger('fetcher')
    const result = await runFetch({
      repos: ['zimmertr/a'],
      fetchStats: async () => stats(),
      save: async () => {
        throw new Error('permission denied for table project_stats')
      },
      logger,
      now: () => START,
    })
    expect(result.failed).toEqual(['zimmertr/a'])
  })

  it('never logs the token', async () => {
    const { logger, raw } = captureLogger('fetcher')
    const token = `ghp_${'x'.repeat(36)}`
    await runFetch({
      repos: ['zimmertr/a'],
      fetchStats: async () => {
        throw new Error(`request with Bearer ${token} failed`)
      },
      save: async () => {},
      logger,
      now: () => START,
    })
    expect(raw()).not.toContain(token)
  })
})

describe('loadConfig', () => {
  it('needs the database, and takes the token only when it is set', () => {
    expect(loadConfig({ DATABASE_URL: 'postgresql://x' })).toEqual({ databaseUrl: 'postgresql://x', githubToken: undefined, logLevel: 'info' })
    expect(loadConfig({ DATABASE_URL: 'postgresql://x', GITHUB_TOKEN: 't' }).githubToken).toBe('t')
    expect(() => loadConfig({})).toThrow('DATABASE_URL is required')
  })
})
