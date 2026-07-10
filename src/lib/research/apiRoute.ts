import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'
import { createApiResponse, type ApiResponse } from './api'
import { recordResearchEvent } from '@/platform/observability/research-events'
import { ZodError } from 'zod'

export type ApiErrorCategory =
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'unavailable'
  | 'provider_failure'
  | 'internal_failure'
  | 'method_not_allowed'

export type ApiErrorResponse = { error: string; category: ApiErrorCategory }

export function sendResearchResponse<T>(res: NextApiResponse, data: T, status = 200) {
  return res.status(status).json(createApiResponse(data))
}

export function sendApiError(
  res: NextApiResponse,
  status: number,
  category: ApiErrorCategory,
  error: string
) {
  recordResearchEvent({ event: 'api_error', status: `${status}:${category}` })
  return res.status(status).json({ error, category } satisfies ApiErrorResponse)
}

export function methodAllowed(
  req: NextApiRequest,
  res: NextApiResponse,
  allowedMethods: readonly string[]
) {
  if (req.method && allowedMethods.includes(req.method)) return true
  res.setHeader('Allow', allowedMethods.join(', '))
  sendApiError(res, 405, 'method_not_allowed', 'Method not allowed.')
  return false
}

export function parseJsonObject<T>(body: unknown): T {
  const parsed = typeof body === 'string' ? JSON.parse(body) : body ?? {}
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Request body must be a JSON object.')
  }
  return parsed as T
}

export function describeApiError(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}

export function validationApiError(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues.map(issue => `${issue.path.join('.') || 'body'}: ${issue.message}`).join('; ')
  }
  if (error instanceof SyntaxError) return 'Request body contains invalid JSON.'
  return null
}

export function domainValidationApiError(error: unknown, allowedPrefixes: readonly string[]) {
  const structured = validationApiError(error)
  if (structured) return structured
  const message = describeApiError(error)
  return allowedPrefixes.some(prefix => message.startsWith(prefix)) ? message : null
}

export function createResearchApiHandler<T>(load: () => Promise<T> | T): NextApiHandler<ApiResponse<T> | ApiErrorResponse> {
  return async function handler(req, res) {
    if (!methodAllowed(req, res, ['GET'])) return
    try {
      sendResearchResponse(res, await load())
    } catch (error) {
      sendApiError(res, 503, 'unavailable', 'Research data is temporarily unavailable.')
    }
  }
}
