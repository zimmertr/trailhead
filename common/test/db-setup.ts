// The chart creates the three service roles; here the suite does, once,
// because roles belong to the whole server rather than one test database.
import pg from 'pg'
import { ROLES, testDatabaseUrl } from './database.ts'

export default async function setup(): Promise<void> {
  const client = new pg.Client({ connectionString: testDatabaseUrl() })
  await client.connect()
  try {
    for (const role of ROLES) {
      await client.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN CREATE ROLE ${role} NOLOGIN; END IF; END $$`)
    }
  } finally {
    await client.end()
  }
}
