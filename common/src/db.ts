import pg from 'pg'
import type { Logger } from './logger.ts'

export type Pool = pg.Pool

// Small and quick to give up: each service runs a handful of short queries,
// and a probe or a visitor is better served by a fast 503 than a hung
// request. docs/LIMITS.md has the reasons.
export const POOL_MAX = 5
export const CONNECT_TIMEOUT_MS = 3_000
export const STATEMENT_TIMEOUT_MS = 5_000

export function createPool(url: string, service: string, logger: Logger): Pool {
  const pool = new pg.Pool({
    connectionString: url,
    application_name: `trailhead-${service}`,
    max: POOL_MAX,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    statement_timeout: STATEMENT_TIMEOUT_MS,
    idleTimeoutMillis: 30_000,
  })
  // An idle connection the server drops (a failover, a restart) is emitted
  // here; unheard, it would crash the process. The pool replaces it.
  pool.on('error', (error) => logger.warn({ err: error }, 'an idle database connection failed'))
  return pool
}

export async function ping(pool: Pick<Pool, 'query'>): Promise<void> {
  await pool.query('SELECT 1')
}
