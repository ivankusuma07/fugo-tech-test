import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'

const BASE_URL = process.env.TEST_DATABASE_BASE_URL ?? 'postgres://postgres:postgres@localhost:5433'

/** Integration (service) tests and e2e (HTTP) tests use separate databases. */
export const INTEGRATION_DATABASE_URL = `${BASE_URL}/fugo_test`
export const E2E_DATABASE_URL = `${BASE_URL}/fugo_e2e`

/** Drops and recreates a database, then applies the real migrations. */
export async function recreateDatabase(url: string) {
  const name = new URL(url).pathname.slice(1)
  const admin = new pg.Client({ connectionString: `${BASE_URL}/postgres` })
  await admin.connect()
  await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`)
  await admin.query(`CREATE DATABASE ${name}`)
  await admin.end()

  const pool = new pg.Pool({ connectionString: url })
  await migrate(drizzle(pool), { migrationsFolder: './server/db/migrations' })
  await pool.end()
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(url: string, text: string, params: unknown[] = []) {
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try {
    return (await client.query<T>(text, params)).rows
  }
  finally {
    await client.end()
  }
}

export function truncateAll(url: string) {
  return query(url, 'TRUNCATE ai_runs, pipeline_status_history, briefs RESTART IDENTITY CASCADE')
}
