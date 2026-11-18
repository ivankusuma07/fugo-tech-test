import { z } from 'zod'

/**
 * Server configuration, read from process.env at runtime (not baked in at build time)
 * and validated once. Every server module reads config through `useEnv()`.
 */
const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  ADMIN_EMAIL: z.string().trim().toLowerCase().pipe(z.email()).optional(),
  ADMIN_PASSWORD: z.string().min(8, 'ADMIN_PASSWORD must be at least 8 characters').optional(),
  LLM_BASE_URL: z.url().default('https://api.deepseek.com'),
  LLM_MODEL: z.string().min(1).default('deepseek-flash'),
  LLM_API_KEY: z.string().optional(),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),
  AI_WORKER_INTERVAL_MS: z.coerce.number().int().positive().default(3_000),
  AI_WORKER_ENABLED: z.stringbool().default(true),
  AI_FORCE_FAIL: z.stringbool().default(false),
  BRIEF_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(5),
})

export type Env = z.infer<typeof EnvSchema>

let env: Env | undefined

export function useEnv(): Env {
  if (!env) {
    // Treat `FOO=` (empty) the same as unset, so defaults apply.
    const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ''))
    const parsed = EnvSchema.safeParse(raw)
    if (!parsed.success) {
      throw new Error(`Invalid server environment:\n${z.prettifyError(parsed.error)}`)
    }
    env = parsed.data
  }
  return env
}
