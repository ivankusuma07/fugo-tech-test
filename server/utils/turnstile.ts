import type { H3Event } from 'h3'

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const MAX_TOKEN_LENGTH = 2048

interface SiteverifyResponse {
  'success': boolean
  'action'?: string
  'hostname'?: string
  'error-codes'?: string[]
  'metadata'?: { result_with_testing_key?: boolean }
}

function reject(reason: string): never {
  console.warn(`[turnstile] rejected: ${reason}`)
  throw createError({
    statusCode: 403,
    statusMessage: 'Forbidden',
    message: 'Verifikasi keamanan gagal. Selesaikan verifikasi lalu kirim ulang.',
    data: { code: 'turnstile_failed' },
  })
}

/**
 * Checks a Cloudflare Turnstile token with siteverify. Skipped when
 * TURNSTILE_SECRET_KEY is not set (local dev, tests). Tokens are single-use,
 * so the client resets the widget after every submit attempt.
 */
export async function assertTurnstile(event: H3Event, token: unknown, expectedAction: string) {
  const { TURNSTILE_SECRET_KEY, TURNSTILE_HOSTNAMES } = useEnv()
  if (!TURNSTILE_SECRET_KEY) return

  if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    reject('missing or malformed token')
  }

  const form = new URLSearchParams({ secret: TURNSTILE_SECRET_KEY, response: token })
  const ip = getRequestIP(event, { xForwardedFor: true })
  if (ip) form.set('remoteip', ip)

  let result: SiteverifyResponse
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) reject(`siteverify HTTP ${res.status}`)
    result = await res.json() as SiteverifyResponse
  }
  catch (error) {
    if (isError(error)) throw error
    reject(`siteverify unreachable: ${(error as Error).message}`)
  }

  if (!result.success) reject(`error-codes ${(result['error-codes'] ?? []).join(',') || 'none'}`)
  // Cloudflare's test keys return no action and a placeholder hostname, so only real keys get the checks below.
  if (result.metadata?.result_with_testing_key) return
  if (result.action !== expectedAction) reject(`action ${result.action}`)
  if (TURNSTILE_HOSTNAMES.length > 0 && !TURNSTILE_HOSTNAMES.includes(result.hostname ?? '')) {
    reject(`hostname ${result.hostname}`)
  }
}
