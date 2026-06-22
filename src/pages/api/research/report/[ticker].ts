import type { NextApiRequest, NextApiResponse } from 'next'
import type { ApiResponse } from '@/lib/research/api'
import { sendResearchResponse } from '@/lib/research/apiRoute'
import { buildUnavailableStockReport } from '@/lib/research/report/buildStockReport'
import { getStockReport, isValidTickerSymbol, normalizeTickerSymbol } from '@/lib/research/repository'
import type { StockReport } from '@/lib/research/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse<StockReport>>) {
  const ticker = normalizeTickerSymbol(req.query.ticker)

  if (!isValidTickerSymbol(ticker)) {
    sendResearchResponse(res, buildUnavailableStockReport(ticker || 'UNKNOWN', ticker || 'Unknown ticker', 'Ticker format is invalid.'), 400)
    return
  }

  try {
    sendResearchResponse(res, await getStockReport(ticker))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown report engine error.'
    sendResearchResponse(res, buildUnavailableStockReport(ticker, ticker, `Report engine unavailable: ${message}`, 'PROVIDER_ERROR'), 500)
  }
}
