// The database tests' one way to get a database: a fresh one per test file on
// the throwaway Postgres `make test-db` starts, dropped afterwards. Nothing
// here can reach a shared or production database, because the URL comes
// only from TEST_DATABASE_URL, which only the make target and its CI job set.
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import pg from 'pg'
import { type Pool, createPool } from '../src/db.ts'
import { captureLogger } from './fixtures.ts'

export const ROLES = ['trailhead_api', 'trailhead_admin', 'trailhead_fetcher'] as const
export const DB_DIR = join(import.meta.dirname, '..', '..', 'db')

export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL
  // Fails rather than skips: a database suite that finds no database must
  // not pass by testing nothing.
  if (!url) throw new Error('TEST_DATABASE_URL is not set. Run the database tests with `make test-db`.')
  return url
}

export async function freshDatabase(): Promise<{ pool: Pool; drop: () => Promise<void> }> {
  const admin = new pg.Client({ connectionString: testDatabaseUrl() })
  await admin.connect()
  const name = `test_${randomUUID().replaceAll('-', '')}`
  await admin.query(`CREATE DATABASE ${name}`)
  const url = new URL(testDatabaseUrl())
  url.pathname = `/${name}`
  const pool = createPool(url.toString(), 'test', captureLogger().logger)
  return {
    pool,
    drop: async () => {
      await pool.end()
      await admin.query(`DROP DATABASE ${name} WITH (FORCE)`)
      await admin.end()
    },
  }
}

// Runs `work` as one of the services' roles, the way the chart connects them.
export async function asRole<T>(pool: Pool, role: (typeof ROLES)[number], work: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query(`SET ROLE ${role}`)
    return await work(client)
  } finally {
    await client.query('RESET ROLE')
    client.release()
  }
}
