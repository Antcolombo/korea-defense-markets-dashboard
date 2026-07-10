import { getPrisma } from '@/lib/server/prisma'
import { researchSnapshotCutoff } from '@/platform/data/data-mode'
import type { RotationRow } from '@/lib/research/types'
import type { RiskLensRow } from '@/types/riskLens'

export type { RiskLensRow } from '@/types/riskLens'

type DailyPriceLike = {
  ticker?: { ticker?: string | null } | null
  date: Date | string
  open: number | null
  high: number | null
  low: number | null
  close: number
  adjustedClose: number | null
  volume?: bigint | number | null
  provider?: string | null
  dataStatus?: string | null
}

export async function buildRiskLensRows(tickers: string[], rotations: RotationRow[]): Promise<RiskLensRow[]> {
  const uniqueTickers = Array.from(new Set(tickers.map(normalizeTicker).filter(Boolean))).slice(0, 24)
  const queryTickers = Array.from(new Set([...uniqueTickers, 'VIX']))
  const byTicker = new Map<string, DailyPriceLike[]>()
  const prisma = getPrisma()
  const cutoff = researchSnapshotCutoff()

  if (prisma) {
    try {
      const rows = await prisma.dailyPrice.findMany({
        where: {
          ticker: { ticker: { in: queryTickers } },
          dataStatus: { in: ['AVAILABLE', 'PARTIAL'] },
          ...(cutoff ? { asOfDate: { lte: cutoff } } : {})
        },
        include: { ticker: true },
        orderBy: [{ date: 'desc' }],
        take: queryTickers.length * 100
      }) as DailyPriceLike[]
      for (const row of rows) {
        const ticker = normalizeTicker(row.ticker?.ticker ?? '')
        if (!ticker) continue
        const list = byTicker.get(ticker) ?? []
        list.push(row)
        byTicker.set(ticker, list)
      }
    } catch (error) {
      console.warn(`Risk lens DailyPrice lookup unavailable; no generated close fallback used. ${describeError(error)}`)
    }
  }

  const vixRows = (byTicker.get('VIX') ?? []).sort((a, b) => isoDate(a.date).localeCompare(isoDate(b.date)))
  const vixLevel = vixRows.at(-1)?.close ?? null
  const vixBackdrop = vixLevel === null ? 'VIX unavailable' : vixLevel >= 25 ? 'stressed' : vixLevel >= 18 ? 'watch' : 'benign'
  const rotationByTicker = new Map(rotations.map(row => [row.ticker, row]))

  return uniqueTickers.map(ticker => {
    const rows = (byTicker.get(ticker) ?? []).sort((a, b) => isoDate(a.date).localeCompare(isoDate(b.date)))
    const latest = rows.at(-1)
    const previous = rows.at(-2)
    const rotation = rotationByTicker.get(ticker)
    const atr20 = averageTrueRange(rows.slice(-21))
    const range20Pct = averageRangePct(rows.slice(-20))
    const gapPct = latest?.open !== null && latest?.open !== undefined && previous
      ? percentMove(close(previous), latest.open)
      : null
    const extensionRisk = rotation?.distanceFrom20dMa.value ?? extensionFromClose(rows)
    const caveats = [
      rows.length < 61 ? 'RV60 limited until 61 sourced close rows exist.' : null,
      atr20 === null ? 'ATR20 unavailable without sourced high/low/close rows.' : null,
      gapPct === null ? 'Gap risk unavailable without sourced open and prior close.' : null,
      range20Pct === null ? 'Daily range unavailable without sourced high/low rows.' : null
    ].filter((item): item is string => Boolean(item))
    return {
      ticker,
      name: rotation?.name ?? ticker,
      asOfDate: latest ? isoDate(latest.date) : '',
      provider: latest?.provider ?? 'unavailable',
      rv20: realizedVol(rows, 20),
      rv60: realizedVol(rows, 60),
      atr20,
      range20Pct,
      gapPct,
      extensionRisk,
      vixLevel,
      vixBackdrop,
      caveats
    }
  })
}

function realizedVol(rows: DailyPriceLike[], days: number) {
  const window = rows.slice(-(days + 1))
  if (window.length < days + 1) return null
  const returns = window.slice(1).map((row, index) => {
    const previous = close(window[index])
    const current = close(row)
    return previous > 0 ? Math.log(current / previous) : 0
  })
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length
  const variance = returns.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / Math.max(1, returns.length - 1)
  return round(Math.sqrt(variance) * Math.sqrt(252) * 100, 1)
}

function averageTrueRange(rows: DailyPriceLike[]) {
  if (rows.length < 2) return null
  const ranges = rows.slice(1).flatMap((row, index) => {
    const previous = rows[index]
    if (row.high === null || row.low === null) return []
    const previousClose = close(previous)
    return [Math.max(row.high - row.low, Math.abs(row.high - previousClose), Math.abs(row.low - previousClose))]
  })
  return ranges.length ? round(avg(ranges), 2) : null
}

function averageRangePct(rows: DailyPriceLike[]) {
  const ranges = rows.flatMap(row => {
    if (row.high === null || row.low === null || close(row) <= 0) return []
    return [((row.high - row.low) / close(row)) * 100]
  })
  return ranges.length ? round(avg(ranges), 1) : null
}

function extensionFromClose(rows: DailyPriceLike[]) {
  const window = rows.slice(-20)
  const latest = rows.at(-1)
  if (!latest || window.length < 20) return null
  const movingAverage = avg(window.map(close))
  return movingAverage > 0 ? round(((close(latest) - movingAverage) / movingAverage) * 100, 1) : null
}

function percentMove(start: number, end: number) {
  return start > 0 ? round(((end - start) / start) * 100, 1) : null
}

function close(row: DailyPriceLike) {
  return row.adjustedClose ?? row.close
}

function avg(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)
}

function normalizeTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '').slice(0, 10)
}

function isoDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : String(value).slice(0, 10)
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}
