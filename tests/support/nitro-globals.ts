/**
 * Server code uses Nitro auto-imports (useDb, useEnv, createError, ...).
 * For service-level tests outside Nitro we provide the same globals here.
 */
import { createError } from 'h3'
import { createDb, type Db } from '../../server/db/client'
import { INTEGRATION_DATABASE_URL } from './test-db'

const db: Db = createDb(INTEGRATION_DATABASE_URL)

export const testEnv = {
  DATABASE_URL: INTEGRATION_DATABASE_URL,
  LLM_BASE_URL: 'http://llm.invalid',
  LLM_MODEL: 'deepseek-flash',
  LLM_API_KEY: 'test-key',
  LLM_TIMEOUT_MS: 20_000,
  AI_WORKER_INTERVAL_MS: 3_000,
  AI_WORKER_ENABLED: false,
  AI_FORCE_FAIL: false,
  BRIEF_RATE_LIMIT_PER_MINUTE: 5,
}

Object.assign(globalThis, {
  useDb: () => db,
  useEnv: () => testEnv,
  createError,
})
