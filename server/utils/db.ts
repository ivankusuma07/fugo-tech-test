import { createDb, type Db } from '../db/client'

let db: Db | undefined

/** Lazily created, process-wide Drizzle client. */
export function useDb(): Db {
  db ??= createDb(useEnv().DATABASE_URL)
  return db
}
