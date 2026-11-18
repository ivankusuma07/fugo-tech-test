import type { z } from 'zod'
import { AiResultSchema, type AiResult } from '#shared/schemas/ai-result'

export type ParseResult
  = | { ok: true, data: AiResult }
    | { ok: false, error: string }

/**
 * Turns raw LLM text into a validated AiResult, or a readable error.
 * Pure function: no I/O, easy to unit test.
 */
export function parseAiOutput(raw: string): ParseResult {
  let json: unknown
  try {
    json = JSON.parse(raw)
  }
  catch (error) {
    return { ok: false, error: `Output bukan JSON valid: ${(error as Error).message}` }
  }

  const result = AiResultSchema.safeParse(json)
  if (!result.success) {
    return { ok: false, error: `Output tidak lolos validasi schema. ${formatIssues(result.error)}` }
  }
  return { ok: true, data: result.data }
}

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map(i => `${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('; ')
}
