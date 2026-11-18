/** Reads the app-wide API error shape: { statusCode, message, data: { fieldErrors } }. */
interface ApiErrorData {
  statusCode?: number
  message?: string
  data?: { fieldErrors?: Record<string, string[] | undefined> }
}

function errorData(error: unknown): ApiErrorData | undefined {
  return (error as { data?: ApiErrorData } | null)?.data
}

export function getApiErrorMessage(error: unknown, fallback = 'Terjadi kesalahan. Coba lagi.'): string {
  return errorData(error)?.message ?? fallback
}

export function getApiFieldErrors(error: unknown): Record<string, string | undefined> {
  const fieldErrors = errorData(error)?.data?.fieldErrors ?? {}
  return Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0]]))
}

export function getApiStatus(error: unknown): number | undefined {
  return (error as { statusCode?: number } | null)?.statusCode ?? errorData(error)?.statusCode
}
