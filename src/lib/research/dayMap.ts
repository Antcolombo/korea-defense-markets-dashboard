import { getPrisma } from '@/lib/server/prisma'
import type { DayMapView } from '@/types/pitch'

type DailyPriceRow = {
  date: Date | string
  high: number | null
  low: number | null
  close: number
  adjustedClose: number | null
  volume: bigint | number | null
}

export async function getDayMap(ticker: string): Promise<DayMapView> {
  const symbol = normalizeTicker(ticker)
  const prisma = getPrisma()
  if (!prisma) return unavailableDayMap(symbol, 'DATABASE_URL unavailable.')

  try {
    const rows = await prisma.dailyPrice.findMany({
      where: { ticker: { ticker: symbol }, dataStatus: { in: ['AVAILABLE', 'PARTIAL'] } },
      orderBy: { date: 'desc' },
      take: 80
    }) as DailyPriceRow[]
    if (!rows.length) return unavailableDayMap(symbol, 'No DailyPrice rows.')
    return buildDayMapFromDailyPrices(symbol, rows)
  } catch (error) {
    return unavailableDayMap(symbol, describeError(error))
  }
}

export function buildDayMapFromDailyPrices(ticker: string, descRows: DailyPriceRow[]): DayMapView {
  const rows = [...descRows].sort((a, b) => isoDate(a.date).localeCompare(isoDate(b.date)))
  const latest = rows.at(-1)
  const previous = rows.at(-2)
  if (!latest) return unavailableDayMap(ticker, 'No DailyPrice rows.')

  const close = latest.adjustedClose ?? latest.close
  const priorHigh = finiteOrNull(latest.high)
  const priorLow = finiteOrNull(latest.low)
  const priorClose = finiteOrNull(close)
  const previousClose = previous ? finiteOrNull(previous.adjustedClose ?? previous.close) : null
  const atr20 = averageTrueRange(rows.slice(-21))
  const gapLevel = priorClose !== null && previousClose !== null ? round(priorClose - previousClose, 2) : null
  const upperAtrBand = priorClose !== null && atr20 !== null ? round(priorClose + atr20, 2) : null
  const lowerAtrBand = priorClose !== null && atr20 !== null ? round(priorClose - atr20, 2) : null
  const volumeShelf = volumeShelfProxy(rows.slice(-60))
  const gaps = [
    'VWAP and premarket levels require intraday feed; current map uses daily OHLCV only.',
    atr20 === null ? 'ATR20 unavailable until enough high/low/close rows exist.' : null,
    volumeShelf === null ? 'Volume shelf proxy unavailable without volume history.' : null
  ].filter((item): item is string => Boolean(item))

  return {
    ticker: normalizeTicker(ticker),
    asOfDate: isoDate(latest.date) || today(),
    sourceLabel: 'Daily OHLCV day map',
    priorHigh,
    priorLow,
    priorClose,
    atr20,
    gapLevel,
    upperAtrBand,
    lowerAtrBand,
    volumeShelf,
    levels: [
      { label: 'Prior high', price: priorHigh, type: 'prior', description: 'Previous sourced daily high. First fight zone above spot.' },
      { label: 'Prior low', price: priorLow, type: 'prior', description: 'Previous sourced daily low. First fight zone below spot.' },
      { label: 'Prior close', price: priorClose, type: 'prior', description: 'Sourced close anchor for scenario math.' },
      { label: 'ATR upper band', price: upperAtrBand, type: 'atr', description: 'Prior close plus 20-day average true range.' },
      { label: 'ATR lower band', price: lowerAtrBand, type: 'atr', description: 'Prior close minus 20-day average true range.' },
      { label: 'Volume shelf proxy', price: volumeShelf, type: 'volume-shelf', description: 'Volume-weighted close from recent high-volume daily bars.' },
      { label: 'Gap delta', price: gapLevel, type: 'gap', description: 'Latest close minus previous close, displayed as price delta.' }
    ],
    gaps
  }
}

function averageTrueRange(rows: DailyPriceRow[]) {
  if (rows.length < 2) return null
  const ranges: number[] = []
  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index]
    const previous = rows[index - 1]
    const high = finiteOrNull(row.high)
    const low = finiteOrNull(row.low)
    const previousClose = finiteOrNull(previous.adjustedClose ?? previous.close)
    if (high === null || low === null || previousClose === null) continue
    ranges.push(Math.max(high - low, Math.abs(high - previousClose), Math.abs(low - previousClose)))
  }
  if (!ranges.length) return null
  return round(ranges.reduce((total, value) => total + value, 0) / ranges.length, 2)
}

function volumeShelfProxy(rows: DailyPriceRow[]) {
  const ranked = rows
    .map(row => ({
      close: finiteOrNull(row.adjustedClose ?? row.close),
      volume: volumeNumber(row.volume)
    }))
    .filter((row): row is { close: number; volume: number } => row.close !== null && row.volume !== null && row.volume > 0)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 8)
  const volume = ranked.reduce((total, row) => total + row.volume, 0)
  if (!ranked.length || volume <= 0) return null
  return round(ranked.reduce((total, row) => total + row.close * row.volume, 0) / volume, 2)
}

function unavailableDayMap(ticker: string, reason: string): DayMapView {
  return {
    ticker: normalizeTicker(ticker),
    asOfDate: today(),
    sourceLabel: 'Unavailable',
    priorHigh: null,
    priorLow: null,
    priorClose: null,
    atr20: null,
    gapLevel: null,
    upperAtrBand: null,
    lowerAtrBand: null,
    volumeShelf: null,
    levels: [],
    gaps: [reason]
  }
}

function volumeNumber(value: bigint | number | null | undefined) {
  if (typeof value === 'bigint') return Number(value)
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function finiteOrNull(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '').slice(0, 10)
}

function isoDate(value: Date | string | null | undefined) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : String(value).slice(0, 10)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}
