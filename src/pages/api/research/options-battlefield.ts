import type { NextApiRequest, NextApiResponse } from 'next'
import { methodAllowed, sendApiError, sendResearchResponse } from '@/lib/research/apiRoute'
import { getOptionsBattlefield } from '@/lib/research/optionsBattlefield'
import { isValidTickerSymbol, normalizeTickerSymbol } from '@/lib/research/repository'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!methodAllowed(req, res, ['GET'])) return
  const ticker = normalizeTickerSymbol(req.query.ticker)
  if (!isValidTickerSymbol(ticker)) return sendApiError(res, 400, 'validation', 'Valid ticker is required.')
  return sendResearchResponse(res, await getOptionsBattlefield(ticker))
}
