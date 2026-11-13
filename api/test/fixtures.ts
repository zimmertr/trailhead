import type { Project } from '@trailhead/content'
import { START, captureLogger, daysAfterStart } from '../../common/test/fixtures.ts'
import { type ApiDeps, buildApi } from '../src/app.ts'
import { createMetrics } from '../src/metrics.ts'
import type { StatsRow, Store } from '../src/store.ts'

export { START, daysAfterStart }

export const project = (fields: Partial<Project> = {}): Project => ({
  slug: 'bluebird',
  name: 'Bluebird Forecast',
  repo: 'zimmertr/bluebird',
  order: 1,
  html: '<p>Finds weather windows.</p>',
  ...fields,
})

export const row = (fields: Partial<StatsRow> = {}): StatsRow => ({
  repo: 'zimmertr/bluebird',
  stars: 2,
  language: 'TypeScript',
  license: 'NOASSERTION',
  release_tag: 'v0.140.0',
  release_published_at: daysAfterStart(-3),
  fetched_at: START,
  ...fields,
})

// A store that answers from memory, or fails the way Postgres does when it
// can't be reached.
export function fakeStore(rows: StatsRow[] = [], failure?: Error): Store {
  return {
    listStats: async () => {
      if (failure) throw failure
      return rows
    },
    ping: async () => {
      if (failure) throw failure
    },
  }
}

export const connectionRefused = (): Error => Object.assign(new Error('connect ECONNREFUSED 10.0.0.5:5432'), { code: 'ECONNREFUSED' })

export async function api(overrides: Partial<ApiDeps> = {}) {
  const { logger, lines, raw } = captureLogger('api')
  const metrics = createMetrics()
  const app = await buildApi({
    store: fakeStore(),
    projects: [project()],
    build: { version: '0.1.0', commit: 'abc1234' },
    logger,
    clientIpHeader: 'cf-connecting-ip',
    licenses: 'fastify 5.12.8\nMIT\n',
    metrics,
    ...overrides,
  })
  return { app, lines, raw, metrics }
}
