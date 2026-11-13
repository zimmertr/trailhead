import type { Pool } from '@trailhead/common'
import { createPool, migrate } from '@trailhead/common'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DB_DIR, asRole, freshDatabase } from '../../common/test/database.ts'
import { START, captureLogger, daysAfterStart } from '../../common/test/fixtures.ts'
import { pgStore } from '../src/store.ts'

let pool: Pool
let drop: () => Promise<void>
beforeEach(async () => {
  ;({ pool, drop } = await freshDatabase())
  await migrate(pool, DB_DIR, captureLogger().logger)
})
afterEach(async () => drop())

describe('pgStore', () => {
  it('reads every row with its times as dates', async () => {
    await pool.query(
      "INSERT INTO project_stats VALUES ('zimmertr/bluebird', 2, 'TypeScript', 'NOASSERTION', 'v0.140.0', $1, $2), ('zimmertr/trailhead', 0, NULL, NULL, NULL, NULL, $2)",
      [daysAfterStart(-3), START],
    )
    const rows = await pgStore(pool).listStats()
    expect(rows.toSorted((a, b) => a.repo.localeCompare(b.repo))).toEqual([
      { repo: 'zimmertr/bluebird', stars: 2, language: 'TypeScript', license: 'NOASSERTION', release_tag: 'v0.140.0', release_published_at: daysAfterStart(-3), fetched_at: START },
      { repo: 'zimmertr/trailhead', stars: 0, language: null, license: null, release_tag: null, release_published_at: null, fetched_at: START },
    ])
  })

  it('reads with nothing more than the api role grants', async () => {
    await asRole(pool, 'trailhead_api', async (client) => {
      await expect(pgStore(client as unknown as Pool).listStats()).resolves.toEqual([])
    })
  })

  it('pings, and fails a ping when nothing answers', async () => {
    await expect(pgStore(pool).ping()).resolves.toBeUndefined()
    // A closed local port, so the failure is the database's absence, not the network's.
    const nowhere = createPool('postgresql://u:p@127.0.0.1:1/none', 'test', captureLogger().logger)
    await expect(pgStore(nowhere).ping()).rejects.toThrow(/ECONNREFUSED/)
    await nowhere.end()
  })
})
