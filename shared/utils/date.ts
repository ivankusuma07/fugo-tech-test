import { BUSINESS_TIMEZONE } from '../constants'

/**
 * Today's date in WIB (Asia/Jakarta) as YYYY-MM-DD.
 * Never use `new Date().toISOString().slice(0, 10)`: that is UTC, and between
 * 00:00 and 07:00 WIB it still returns "yesterday".
 */
export function todayInJakarta(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** True when `value` is a real calendar date written as YYYY-MM-DD. */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}
