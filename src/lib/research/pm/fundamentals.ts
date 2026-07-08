import { getPrisma } from '@/lib/server/prisma'
import type { FundamentalInputRow, EstimateInputRow } from '@/types/pm'

type FundamentalRow = FundamentalInputRow & { dataStatus?: string | null; asOfDate?: Date | string | null }
type EstimateRow = EstimateInputRow & { dataStatus?: string | null; asOfDate?: Date | string | null }

export async function latestFundamentalByTicker(tickers: string[]) {
  const prisma = getPrisma()
  const rows = new Map<string, FundamentalRow>()
  if (!prisma) return rows
  for (const ticker of tickers) {
    try {
      const result = await prisma.$queryRawUnsafe<FundamentalRow[]>(
        'SELECT "ticker", "periodEnd", "fiscalPeriod", "currency", "revenue", "grossProfit", "operatingIncome", "ebitda", "netIncome", "epsDiluted", "freeCashFlow", "cash", "debt", "sharesDiluted", "dataStatus", "asOfDate" FROM "FundamentalSnapshot" WHERE "ticker" = $1 ORDER BY "asOfDate" DESC, "periodEnd" DESC LIMIT 1',
        ticker
      )
      if (result[0]) rows.set(ticker, result[0])
    } catch {
      return rows
    }
  }
  return rows
}

export async function latestEstimateByTicker(tickers: string[]) {
  const prisma = getPrisma()
  const rows = new Map<string, EstimateRow>()
  if (!prisma) return rows
  for (const ticker of tickers) {
    try {
      const result = await prisma.$queryRawUnsafe<EstimateRow[]>(
        'SELECT "ticker", "periodEnd", "fiscalPeriod", "estimateDate", "revenueEstimate", "epsEstimate", "ebitdaEstimate", "provider", "dataStatus", "asOfDate" FROM "EstimateSnapshot" WHERE "ticker" = $1 ORDER BY "asOfDate" DESC, "estimateDate" DESC LIMIT 1',
        ticker
      )
      if (result[0]) rows.set(ticker, result[0])
    } catch {
      return rows
    }
  }
  return rows
}
