import type { H3Event } from 'h3'
import { z } from 'zod'

/**
 * Validates `input` against `schema`. On failure throws the app-wide error shape:
 * { statusCode: 400, message, data: { fieldErrors: { field: [messages] } } }
 */
export function validateOrThrow<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Data yang dikirim tidak valid.',
      data: { fieldErrors: z.flattenError(result.error).fieldErrors },
    })
  }
  return result.data
}

export async function readValidated<S extends z.ZodType>(event: H3Event, schema: S) {
  const body = await readBody(event).catch(() => undefined)
  return validateOrThrow(schema, body)
}

export function getValidatedQuery<S extends z.ZodType>(event: H3Event, schema: S) {
  return validateOrThrow(schema, getQuery(event))
}

export function getValidatedParams<S extends z.ZodType>(event: H3Event, schema: S) {
  return validateOrThrow(schema, getRouterParams(event))
}
