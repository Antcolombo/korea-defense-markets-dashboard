import { getPrisma } from '@/lib/server/prisma'
import { researchSnapshotCutoff } from '@/platform/data/data-mode'
import type { PriceSeries } from '@/lib/research/pm/factorRisk'

export async function loadPriceSeries(tickers: string[]): Promise<PriceSeries> {
  const uniqueTickers = [...new Set(tickers.filter(Boolean))]
  const output: PriceSeries = {}
  const prisma = getPrisma()
  const cutoff = researchSnapshotCutoff()
  if (!prisma) return output
  try {
    const rows = await prisma.dailyPrice.findMany({
      where: {
        ticker: { ticker: { in: uniqueTickers } },
        dataStatus: { in: ['AVAILABLE', 'PARTIAL'] },
        ...(cutoff ? { asOfDate: { lte: cutoff } } : {})
      },
      include: { ticker: true },
      orderBy: [{ date: 'asc' }],
      take: uniqueTickers.length * 260
    })
    for (const row of rows) {
      const ticker = row.ticker.ticker
      output[ticker] = [...output[ticker] ?? [], {
        date: row.date.toISOString().slice(0, 10),
        price: row.adjustedClose ?? row.close,
        volume: typeof row.volume === 'bigint' ? Number(row.volume) : row.volume
      }]
    }
  } catch {
    return output
  }
  return output
}
