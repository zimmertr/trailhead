import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createPool } from '../src/db.ts'
import { readMigrations } from '../src/migrate.ts'
import { captureLogger } from './fixtures.ts'

describe('createPool', () => {
  it('logs a dropped idle connection instead of crashing', async () => {
    const { logger, lines } = captureLogger()
    const pool = createPool('postgresql://u:p@localhost:1/db', 'test', logger)
    pool.emit('error', new Error('terminating connection due to administrator command'))
    expect(lines()).toEqual([expect.objectContaining({ level: 'warn', msg: 'an idle database connection failed' })])
    await pool.end()
  })
})

describe('readMigrations', () => {
  let dir: string | undefined
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true })
  })

  it('reads the migrations in name order with a checksum each', () => {
    dir = mkdtempSync(join(tmpdir(), 'migrations-'))
    writeFileSync(join(dir, '0002_second.sql'), 'SELECT 2;')
    writeFileSync(join(dir, '0001_first.sql'), 'SELECT 1;')
    const migrations = readMigrations(dir)
    expect(migrations.map((m) => m.version)).toEqual(['0001_first', '0002_second'])
    expect(migrations[0]?.checksum).toMatch(/^[0-9a-f]{64}$/)
  })

  it('refuses a file not named NNNN_words.sql', () => {
    dir = mkdtempSync(join(tmpdir(), 'migrations-'))
    writeFileSync(join(dir, 'add-table.sql'), 'SELECT 1;')
    expect(() => readMigrations(dir as string)).toThrow('db/migrations/add-table.sql: name it NNNN_words.sql')
  })

  it('reads the real migrations', () => {
    const migrations = readMigrations(join(import.meta.dirname, '..', '..', 'db', 'migrations'))
    expect(migrations.map((m) => m.version)).toContain('0001_project_stats')
  })
})
