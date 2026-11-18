import OpenAI, { APIConnectionError, APIConnectionTimeoutError, APIError, APIUserAbortError } from 'openai'
import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions'

/**
 * Thin wrapper around the OpenAI SDK pointed at DeepSeek (OpenAI-compatible).
 * Provider, model and timeout all come from env, so they can change without code changes.
 */

export interface LlmConfig {
  baseURL: string
  apiKey: string
  model: string
  timeoutMs: number
}

export interface LlmJsonRequest {
  system: string
  user: string
  maxTokens?: number
  temperature?: number
  json?: boolean
}

export interface LlmResponse {
  content: string
  model: string
}

/** A failure worth one automatic retry (network, 429, 5xx, blank JSON-mode content). */
export class TransientLlmError extends Error {}
/** A failure that will not fix itself by retrying (timeout, 4xx, truncated output). */
export class PermanentLlmError extends Error {}

// DeepSeek-specific field, not in the OpenAI types. Thinking is ON by default there.
type DeepSeekParams = ChatCompletionCreateParamsNonStreaming & { thinking: { type: 'enabled' | 'disabled' } }

export async function callLlm(config: LlmConfig, req: LlmJsonRequest): Promise<LlmResponse> {
  const client = new OpenAI({ baseURL: config.baseURL, apiKey: config.apiKey, maxRetries: 0 })
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), config.timeoutMs)

  const params: DeepSeekParams = {
    model: config.model,
    messages: [
      { role: 'system', content: req.system },
      { role: 'user', content: req.user },
    ],
    thinking: { type: 'disabled' },
    temperature: req.temperature ?? 0.2,
    max_tokens: req.maxTokens ?? 800,
    ...(req.json === false ? {} : { response_format: { type: 'json_object' as const } }),
  }

  try {
    const completion = await client.chat.completions.create(params, { signal: controller.signal })
    const choice = completion.choices[0]
    const content = choice?.message?.content ?? ''

    if (choice?.finish_reason === 'length') {
      throw new PermanentLlmError('Output LLM terpotong (melebihi max_tokens).')
    }
    // Documented DeepSeek JSON-mode quirk: content may be only whitespace.
    if (!content.trim()) {
      throw new TransientLlmError('LLM mengembalikan konten kosong.')
    }
    return { content, model: completion.model ?? config.model }
  }
  catch (error) {
    throw classifyLlmError(error, config.timeoutMs)
  }
  finally {
    clearTimeout(timer)
  }
}

function classifyLlmError(error: unknown, timeoutMs: number): Error {
  if (error instanceof TransientLlmError || error instanceof PermanentLlmError) return error
  if (error instanceof APIUserAbortError || error instanceof APIConnectionTimeoutError) {
    return new PermanentLlmError(`LLM timeout (${Math.round(timeoutMs / 1000)} dtk).`)
  }
  if (error instanceof APIConnectionError) {
    return new TransientLlmError(`Koneksi ke LLM gagal: ${error.message}`)
  }
  if (error instanceof APIError) {
    const status = error.status ?? 0
    const msg = `LLM API error ${status}: ${error.message}`
    return status === 429 || status >= 500 ? new TransientLlmError(msg) : new PermanentLlmError(msg)
  }
  return new PermanentLlmError(error instanceof Error ? error.message : String(error))
}
