import type { NextApiRequest, NextApiResponse } from 'next'
import { sendResearchResponse } from '@/lib/research/apiRoute'
import { getDayMap } from '@/lib/research/dayMap'
import { isValidTickerSymbol, normalizeTickerSymbol } from '@/lib/research/repository'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const ticker = normalizeTickerSymbol(req.query.ticker)
  if (!isValidTickerSymbol(ticker)) return res.status(400).json({ error: 'Valid ticker is required.' })
  return sendResearchResponse(res, await getDayMap(ticker))
}
