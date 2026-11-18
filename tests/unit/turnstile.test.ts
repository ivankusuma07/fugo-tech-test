import { createError, isError, type H3Event } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Nitro auto-imports used by server/utils/turnstile.ts
const env = { TURNSTILE_SECRET_KEY: 'secret-key' as string | undefined, TURNSTILE_HOSTNAMES: [] as string[] }
Object.assign(globalThis, {
  useEnv: () => env,
  createError,
  isError,
  getRequestIP: () => '203.0.113.7',
})

const { assertTurnstile } = await import('../../server/utils/turnstile')
const event = {} as H3Event

const fetchMock = vi.fn()
function siteverifyReturns(body: Record<string, unknown>, status = 200) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }))
}
const ok = { 'success': true, 'action': 'brief', 'hostname': 'brief.example.com', 'error-codes': [] }

beforeEach(() => {
  env.TURNSTILE_SECRET_KEY = 'secret-key'
  env.TURNSTILE_HOSTNAMES = []
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('assertTurnstile', () => {
  it('is skipped when no secret is configured', async () => {
    env.TURNSTILE_SECRET_KEY = undefined
    await expect(assertTurnstile(event, undefined, 'brief')).resolves.toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([undefined, '', 42, 'x'.repeat(2049)])('rejects a missing or malformed token (%s) without calling Cloudflare', async (token) => {
    await expect(assertTurnstile(event, token, 'brief')).rejects.toMatchObject({ statusCode: 403 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('accepts a valid token and sends secret, token and client IP as a form', async () => {
    siteverifyReturns(ok)
    await expect(assertTurnstile(event, 'token-1', 'brief')).resolves.toBeUndefined()

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify')
    const form = init.body as URLSearchParams
    expect(Object.fromEntries(form)).toEqual({ secret: 'secret-key', response: 'token-1', remoteip: '203.0.113.7' })
  })

  it('rejects when Cloudflare says the token is invalid (e.g. replayed)', async () => {
    siteverifyReturns({ 'success': false, 'error-codes': ['timeout-or-duplicate'] })
    await expect(assertTurnstile(event, 'used', 'brief')).rejects.toMatchObject({ statusCode: 403 })
  })

  it('rejects a token issued for another action', async () => {
    siteverifyReturns({ ...ok, action: 'login' })
    await expect(assertTurnstile(event, 't', 'brief')).rejects.toMatchObject({ statusCode: 403 })
  })

  it('accepts Cloudflare test-key results, which carry no action', async () => {
    siteverifyReturns({ 'success': true, 'hostname': 'example.com', 'error-codes': [], 'metadata': { result_with_testing_key: true } })
    await expect(assertTurnstile(event, 't', 'brief')).resolves.toBeUndefined()
  })

  it('checks the hostname only when an allowlist is set', async () => {
    env.TURNSTILE_HOSTNAMES = ['brief.example.com']
    siteverifyReturns(ok)
    await expect(assertTurnstile(event, 't', 'brief')).resolves.toBeUndefined()

    siteverifyReturns({ ...ok, hostname: 'evil.example.net' })
    await expect(assertTurnstile(event, 't', 'brief')).rejects.toMatchObject({ statusCode: 403 })
  })

  it('fails closed when siteverify is down or unreachable', async () => {
    siteverifyReturns({}, 503)
    await expect(assertTurnstile(event, 't', 'brief')).rejects.toMatchObject({ statusCode: 403 })

    fetchMock.mockRejectedValueOnce(new Error('network down'))
    await expect(assertTurnstile(event, 't', 'brief')).rejects.toMatchObject({ statusCode: 403 })
  })
})
