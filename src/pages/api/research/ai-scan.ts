import type { NextApiRequest, NextApiResponse } from 'next'
import { methodAllowed, parseJsonObject, sendApiError, sendResearchResponse, validationApiError } from '@/lib/research/apiRoute'
import { runAiScan } from '@/lib/research/aiScan'
import { editorTokenName, hasEditorWriteAccess } from '@/lib/research/editorAuth'
import { z } from 'zod'

type AiScanRequestBody = {
  ticker?: string
  mode?: string
  forceRefresh?: boolean
}

const aiScanRequestSchema = z.object({
  ticker: z.string().trim().min(1).max(10),
  mode: z.string().trim().min(1).max(40).optional(),
  forceRefresh: z.boolean().optional()
}).strict()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!methodAllowed(req, res, ['POST'])) return
  if (!hasEditorWriteAccess(req, 'pitch')) {
    return sendApiError(res, 401, 'unauthorized', `${editorTokenName('pitch')} is required to run AI scans in production.`)
  }

  try {
    const body = aiScanRequestSchema.parse(parseJsonObject<AiScanRequestBody>(req.body))
    const result = await runAiScan({
      ticker: body.ticker ?? '',
      mode: body.mode ?? 'stock-pitch',
      forceRefresh: Boolean(body.forceRefresh)
    })
    return sendResearchResponse(res, result)
  } catch (error) {
    const validation = validationApiError(error)
    return validation
      ? sendApiError(res, 400, 'validation', validation)
      : sendApiError(res, 503, 'provider_failure', 'AI scan provider is temporarily unavailable.')
  }
}
