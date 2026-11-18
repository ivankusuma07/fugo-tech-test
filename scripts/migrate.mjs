// Applies SQL migrations from server/db/migrations.
// Plain JS on purpose so it runs in the production image with `node`, no TS tooling.
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import pg from 'pg'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: url })
try {
  await migrate(drizzle(pool), { migrationsFolder: './server/db/migrations' })
  console.log('Migrations applied')
}
catch (error) {
  console.error('Migration failed:', error)
  process.exitCode = 1
}
finally {
  await pool.end()
}
