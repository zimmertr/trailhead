import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Pool } from './db.ts'
import type { Logger } from './logger.ts'

export type Migration = { version: string; sql: string; checksum: string }

const NAME = /^(\d{4})_[a-z0-9_]+\.sql$/
// Any constant both runners agree on; it keeps two migrate jobs (a re-run
// overlapping a rollout) from applying the same file twice.
const LOCK_KEY = 7_401_233

export function readMigrations(dir: string): Migration[] {
  const files = readdirSync(dir).toSorted()
  return files.map((file) => {
    if (!NAME.test(file)) throw new Error(`db/migrations/${file}: name it NNNN_words.sql`)
    const sql = readFileSync(join(dir, file), 'utf8')
    return { version: file.replace(/\.sql$/, ''), sql, checksum: createHash('sha256').update(sql).digest('hex') }
  })
}

// Applies every migration in db/migrations that hasn't run, each in its own
// transaction, then db/grants.sql, which is written to run any number of
// times. A migration that changed after it ran stops the run: the database
// would no longer match the file that claims to describe it.
export async function migrate(pool: Pool, dbDir: string, logger: Logger): Promise<string[]> {
  const migrations = readMigrations(join(dbDir, 'migrations'))
  const grants = readFileSync(join(dbDir, 'grants.sql'), 'utf8')
  const client = await pool.connect()
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY])
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())',
    )
    const { rows } = await client.query<{ version: string; checksum: string }>('SELECT version, checksum FROM schema_migrations')
    const done = new Map(rows.map((row) => [row.version, row.checksum]))
    const applied: string[] = []
    for (const migration of migrations) {
      const checksum = done.get(migration.version)
      if (checksum === migration.checksum) continue
      if (checksum !== undefined) throw new Error(`migration ${migration.version} changed after it ran; add a new migration instead`)
      await client.query('BEGIN')
      try {
        await client.query(migration.sql)
        await client.query('INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)', [migration.version, migration.checksum])
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
      logger.info({ migration: migration.version }, 'applied migration')
      applied.push(migration.version)
    }
    await client.query(grants)
    return applied
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY])
    client.release()
  }
}
