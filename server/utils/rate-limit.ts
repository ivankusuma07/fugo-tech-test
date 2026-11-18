import type { H3Event } from 'h3'

/**
 * Minimal fixed-window rate limiter kept in memory.
 * Good enough for a single-instance internal tool; with several instances
 * this would move to Postgres or Redis.
 */
const hits = new Map<string, { count: number, resetAt: number }>()

export function assertRateLimit(event: H3Event, key: string, limit: number, windowMs: number) {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const bucketKey = `${key}:${ip}`
  const now = Date.now()
  const bucket = hits.get(bucketKey)

  if (!bucket || bucket.resetAt <= now) {
    hits.set(bucketKey, { count: 1, resetAt: now + windowMs })
    return
  }

  bucket.count++
  if (bucket.count > limit) {
    setResponseHeader(event, 'Retry-After', Math.ceil((bucket.resetAt - now) / 1000))
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: 'Terlalu banyak permintaan. Coba lagi beberapa saat lagi.',
    })
  }
}

// Drop expired buckets so the map does not grow forever.
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k)
}, 60_000).unref()

/** Test helper. */
export function resetRateLimits() {
  hits.clear()
}
