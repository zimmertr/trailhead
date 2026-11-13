import type { Pool } from '@trailhead/common'
import { migrate } from '@trailhead/common'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DB_DIR, asRole, freshDatabase } from '../../common/test/database.ts'
import { saveStats } from '../src/store.ts'
import { START, captureLogger, daysAfterStart, stats } from './fixtures.ts'

let pool: Pool
let drop: () => Promise<void>
beforeEach(async () => {
  ;({ pool, drop } = await freshDatabase())
  await migrate(pool, DB_DIR, captureLogger().logger)
})
afterEach(async () => drop())

const read = async () => (await pool.query<Record<string, unknown>>('SELECT * FROM project_stats')).rows

describe('saveStats', () => {
  it('inserts a repo’s numbers, then replaces them on the next good fetch', async () => {
    await saveStats(pool, 'zimmertr/bluebird', stats(), START)
    await saveStats(pool, 'zimmertr/bluebird', stats({ stars: 5, release: null, language: null }), daysAfterStart(1))
    expect(await read()).toEqual([
      { repo: 'zimmertr/bluebird', stars: 5, language: null, license: 'NOASSERTION', release_tag: null, release_published_at: null, fetched_at: daysAfterStart(1) },
    ])
  })

  it('works with nothing more than the fetcher role grants', async () => {
    await asRole(pool, 'trailhead_fetcher', async (client) => {
      await saveStats(client, 'zimmertr/bluebird', stats(), START)
      await saveStats(client, 'zimmertr/bluebird', stats({ stars: 7 }), START)
    })
    expect((await read())[0]).toMatchObject({ stars: 7, release_tag: 'v0.140.0', release_published_at: daysAfterStart(-3) })
  })
})
