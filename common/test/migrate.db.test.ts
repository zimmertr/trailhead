import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Pool } from '../src/db.ts'
import { ping } from '../src/db.ts'
import { migrate } from '../src/migrate.ts'
import { DB_DIR, asRole, freshDatabase } from './database.ts'
import { START, captureLogger } from './fixtures.ts'

let pool: Pool
let drop: () => Promise<void>
beforeEach(async () => {
  ;({ pool, drop } = await freshDatabase())
})
afterEach(async () => drop())

const insertRow = "INSERT INTO project_stats (repo, stars, fetched_at) VALUES ('zimmertr/bluebird', 2, $1)"

describe('migrate', () => {
  it('applies every migration once, records it, and logs it', async () => {
    const { logger, lines } = captureLogger()
    expect(await migrate(pool, DB_DIR, logger)).toEqual(['0001_project_stats'])
    expect(await migrate(pool, DB_DIR, logger)).toEqual([])
    const { rows } = await pool.query('SELECT version FROM schema_migrations')
    expect(rows).toEqual([{ version: '0001_project_stats' }])
    expect(lines()).toEqual([expect.objectContaining({ msg: 'applied migration', migration: '0001_project_stats' })])
  })

  it('refuses a migration that changed after it ran', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'db-'))
    try {
      cpSync(DB_DIR, dir, { recursive: true })
      await migrate(pool, dir, captureLogger().logger)
      writeFileSync(join(dir, 'migrations', '0001_project_stats.sql'), 'SELECT 1;')
      await expect(migrate(pool, dir, captureLogger().logger)).rejects.toThrow('migration 0001_project_stats changed after it ran; add a new migration instead')
    } finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('rolls back a migration that fails, leaving nothing half-applied', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'db-'))
    try {
      cpSync(DB_DIR, dir, { recursive: true })
      writeFileSync(join(dir, 'migrations', '0002_broken.sql'), 'CREATE TABLE half (id int); SELECT * FROM nowhere;')
      await expect(migrate(pool, dir, captureLogger().logger)).rejects.toThrow('relation "nowhere" does not exist')
      const { rows } = await pool.query("SELECT to_regclass('half') AS half, (SELECT count(*)::int FROM schema_migrations) AS done")
      expect(rows).toEqual([{ half: null, done: 1 }])
    } finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('answers a ping once the database is up', async () => {
    await expect(ping(pool)).resolves.toBeUndefined()
  })
})

describe('the schema', () => {
  beforeEach(async () => {
    await migrate(pool, DB_DIR, captureLogger().logger)
  })

  it('refuses a release tag without its date, and negative stars', async () => {
    await expect(pool.query("INSERT INTO project_stats (repo, stars, release_tag, fetched_at) VALUES ('zimmertr/a', 1, 'v1', $1)", [START])).rejects.toThrow(/check constraint/)
    await expect(pool.query("INSERT INTO project_stats (repo, stars, fetched_at) VALUES ('zimmertr/a', -1, $1)", [START])).rejects.toThrow(/check constraint/)
    await expect(pool.query("INSERT INTO project_stats (repo, stars, fetched_at) VALUES ('not a repo', 1, $1)", [START])).rejects.toThrow(/check constraint/)
  })
})

describe('the grants', () => {
  beforeEach(async () => {
    await migrate(pool, DB_DIR, captureLogger().logger)
  })

  it('lets the api read the numbers and nothing more', async () => {
    await pool.query(insertRow, [START])
    await asRole(pool, 'trailhead_api', async (client) => {
      expect((await client.query('SELECT stars FROM project_stats')).rows).toEqual([{ stars: 2 }])
      await expect(client.query("UPDATE project_stats SET stars = 9")).rejects.toThrow('permission denied for table project_stats')
      await expect(client.query(insertRow.replace('bluebird', 'other'), [START])).rejects.toThrow('permission denied')
    })
  })

  it('lets the fetcher insert and update the numbers, but not delete them', async () => {
    await asRole(pool, 'trailhead_fetcher', async (client) => {
      await client.query(insertRow, [START])
      await client.query("INSERT INTO project_stats (repo, stars, fetched_at) VALUES ('zimmertr/bluebird', 3, $1) ON CONFLICT (repo) DO UPDATE SET stars = EXCLUDED.stars", [START])
      await expect(client.query('DELETE FROM project_stats')).rejects.toThrow('permission denied')
    })
    expect((await pool.query('SELECT stars FROM project_stats')).rows).toEqual([{ stars: 3 }])
  })

  it('gives the admin panel no access to the numbers', async () => {
    await asRole(pool, 'trailhead_admin', async (client) => {
      await expect(client.query('SELECT * FROM project_stats')).rejects.toThrow('permission denied')
    })
  })
})
