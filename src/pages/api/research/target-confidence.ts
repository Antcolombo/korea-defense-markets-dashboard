import type { NextApiRequest, NextApiResponse } from 'next'
import { methodAllowed, sendApiError, sendResearchResponse } from '@/lib/research/apiRoute'
import { buildPitchFromSourcedContext } from '@/lib/research/pitches'
import { isValidTickerSymbol, normalizeTickerSymbol } from '@/lib/research/repository'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!methodAllowed(req, res, ['GET'])) return
  const ticker = normalizeTickerSymbol(req.query.ticker)
  if (!isValidTickerSymbol(ticker)) return sendApiError(res, 400, 'validation', 'Valid ticker is required.')
  const pitch = await buildPitchFromSourcedContext({ ticker })
  return sendResearchResponse(res, pitch.sourceSnapshot?.targetConfidence ?? null)
}
