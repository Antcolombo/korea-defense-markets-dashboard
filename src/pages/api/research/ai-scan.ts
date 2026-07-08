import type { NextApiRequest, NextApiResponse } from 'next'
import { sendResearchResponse } from '@/lib/research/apiRoute'
import { runAiScan } from '@/lib/research/aiScan'

type AiScanRequestBody = {
  ticker?: string
  mode?: string
  forceRefresh?: boolean
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = parseBody<AiScanRequestBody>(req.body)
    const result = await runAiScan({
      ticker: body.ticker ?? '',
      mode: body.mode ?? 'stock-pitch',
      forceRefresh: Boolean(body.forceRefresh)
    })
    return sendResearchResponse(res, result)
  } catch (error) {
    return res.status(400).json({ error: describeError(error) })
  }
}

function parseBody<T>(body: unknown): T {
  if (typeof body === 'string') return JSON.parse(body) as T
  return (body ?? {}) as T
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}
