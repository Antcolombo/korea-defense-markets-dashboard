import pricesJson from '@/generated/prices.json'
import type { PricePoint } from '@/types/market'

export function getPrices(tickers?: Iterable<string>, limitPerTicker = 260): PricePoint[] {
  const rows = pricesJson as PricePoint[]
  if (!tickers) return rows
  const selected = new Set([...tickers].map(ticker => ticker.trim().toUpperCase()).filter(Boolean))
  if (!selected.size) return []
  const grouped = new Map<string, PricePoint[]>()
  for (const row of rows) {
    if (!selected.has(row.ticker.toUpperCase())) continue
    grouped.set(row.ticker, [...grouped.get(row.ticker) ?? [], row])
  }
  return [...grouped.values()].flatMap(series => series
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-Math.max(1, limitPerTicker)))
}
