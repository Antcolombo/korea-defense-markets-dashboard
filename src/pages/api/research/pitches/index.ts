import type { NextApiRequest, NextApiResponse } from 'next'
import { sendResearchResponse } from '@/lib/research/apiRoute'
import { createStockPitch, listStockPitchSummaries } from '@/lib/research/pitches'
import type { StockPitch } from '@/types/pitch'

type CreatePitchBody = {
  ticker?: string
  companyName?: string
  analyst?: string
  pitch?: StockPitch
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return sendResearchResponse(res, { pitches: await listStockPitchSummaries() })
  }

  if (req.method === 'POST') {
    if (!hasPitchWriteAccess(req)) {
      return res.status(401).json({ error: 'PITCH_EDITOR_TOKEN is required to create stock pitches in production.' })
    }

    try {
      const body = parseBody<CreatePitchBody>(req.body)
      const record = await createStockPitch({
        ticker: body.ticker,
        companyName: body.companyName,
        analyst: body.analyst,
        pitch: body.pitch
      })
      return sendResearchResponse(res, {
        record,
        sourceSnapshot: record.pitch.sourceSnapshot
      }, 201)
    } catch (error) {
      return res.status(503).json({ error: describeError(error) })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}

function hasPitchWriteAccess(req: NextApiRequest) {
  if (process.env.NODE_ENV !== 'production') return true
  const required = process.env.PITCH_EDITOR_TOKEN?.trim()
  const supplied = req.headers['x-pitch-editor-token']
  const token = Array.isArray(supplied) ? supplied[0] : supplied
  return Boolean(required && token && token === required)
}

function parseBody<T>(body: unknown): T {
  if (typeof body === 'string') return JSON.parse(body) as T
  return (body ?? {}) as T
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}
