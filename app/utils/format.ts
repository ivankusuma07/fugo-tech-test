import { BUSINESS_TIMEZONE } from '#shared/constants'

const dateTime = new Intl.DateTimeFormat('id-ID', {
  timeZone: BUSINESS_TIMEZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const dateOnly = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'UTC', // date-only values (YYYY-MM-DD) carry no zone
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** "18 Nov 2026, 08.42" in WIB. */
export function formatDateTime(value: string | Date): string {
  return dateTime.format(new Date(value))
}

/** "9 Des 2026" for a YYYY-MM-DD date. */
export function formatDate(value: string): string {
  return dateOnly.format(new Date(`${value}T00:00:00Z`))
}

export function formatBriefNumber(n: number): string {
  return `#BR-${String(n).padStart(4, '0')}`
}

export function formatLatency(ms: number): string {
  return `${(ms / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} dtk`
}
