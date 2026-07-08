import type { NextApiRequest, NextApiResponse } from 'next'
import { sendResearchResponse } from '@/lib/research/apiRoute'
import { getStockPitch, updateStockPitch } from '@/lib/research/pitches'
import type { StockPitch, StockPitchStatus } from '@/types/pitch'

type UpdatePitchBody = {
  pitch?: StockPitch
  status?: StockPitchStatus
  shareEnabled?: boolean
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug
  if (!slug) return res.status(400).json({ error: 'Missing pitch slug.' })

  if (req.method === 'GET') {
    const record = await getStockPitch(slug)
    if (!record) return res.status(404).json({ error: 'Stock pitch not found.' })
    return sendResearchResponse(res, { record })
  }

  if (req.method === 'PUT') {
    if (!hasPitchWriteAccess(req)) {
      return res.status(401).json({ error: 'PITCH_EDITOR_TOKEN is required to update stock pitches in production.' })
    }

    try {
      const body = parseBody<UpdatePitchBody>(req.body)
      if (!body.pitch) return res.status(400).json({ error: 'Missing structured StockPitch payload.' })
      const record = await updateStockPitch(slug, {
        pitch: body.pitch,
        status: body.status,
        shareEnabled: body.shareEnabled
      })
      return sendResearchResponse(res, { record })
    } catch (error) {
      return res.status(503).json({ error: describeError(error) })
    }
  }

  res.setHeader('Allow', 'GET, PUT')
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
