import { createHash } from 'node:crypto'
import { getPrices } from '@/lib/data/getPrices'
import { pointInTime } from '@/lib/data/availability'
import { getDayMap } from '@/lib/research/dayMap'
import { getOptionsBattlefield } from '@/lib/research/optionsBattlefield'
import { getPrisma } from '@/lib/server/prisma'
import type { ReportSection, StockReport } from '@/lib/research/types'
import type { PitchNewsTapeItem, PitchPriceProvenance, PitchSourceSnapshot } from '@/types/pitch'

export type SourcedPricePoint = PitchPriceProvenance

export async function getSourcedPriceSeries(ticker: string, limit = 180): Promise<SourcedPricePoint[]> {
  const symbol = normalizeTicker(ticker)
  const prisma = getPrisma()
  if (prisma) {
    try {
      const rows = await prisma.dailyPrice.findMany({
        where: { ticker: { ticker: symbol } },
        orderBy: [{ date: 'desc' }, { asOfDate: 'desc' }],
        take: limit
      })
      if (rows.length) {
        return rows
          .map(row => ({
            ...pointInTime(row),
            ticker: symbol,
            date: isoDate(row.date),
            price: row.close,
            label: `${row.provider} close`,
            fallback: false
          }))
          .sort((a, b) => a.date.localeCompare(b.date))
      }
    } catch (error) {
      console.warn(`DailyPrice lookup unavailable for ${symbol}; using generated price fallback. ${describeError(error)}`)
    }
  }

  return getPrices()
    .filter(point => point.ticker === symbol)
    .slice(-limit)
    .map(point => ({
      ...pointInTime({
        asOfDate: point.date,
        observedAt: point.date,
        providerTimestamp: point.publishedAt,
        ingestedAt: point.retrievedAt,
        source: point.sourceName || point.sourceUrl || 'fallback generated price',
        provider: point.provider || 'fallback generated price',
        dataStatus: point.dataQuality === 'unavailable' ? 'UNAVAILABLE' : 'PARTIAL'
      }),
      ticker: symbol,
      date: point.date,
      price: point.price,
      label: 'fallback generated price',
      fallback: true
    }))
}

export async function buildStockPitchSourceSnapshot(ticker: string, report: StockReport): Promise<PitchSourceSnapshot> {
  const prices = await getSourcedPriceSeries(ticker)
  const price = prices.at(-1) ?? null
  const [optionsBattlefield, dayMap] = await Promise.all([
    getOptionsBattlefield(ticker, price?.price ?? null),
    getDayMap(ticker)
  ])
  const newsTape = newsTapeFromReport(report)
  const gaps = allSections(report).flatMap(section => section.excludedUnavailableInputs)
  const providerNotes = [
    price ? `${price.label}: ${price.date} ${price.price}` : 'No sourced price row.',
    `${optionsBattlefield.sourceLabel}: ${optionsBattlefield.mode} via ${optionsBattlefield.provider}.`,
    `${dayMap.sourceLabel}: ${dayMap.levels.length} daily levels.`,
    report.positioning.summary,
    newsTape.length ? `${newsTape.length} direct catalyst/news row${newsTape.length === 1 ? '' : 's'}.` : 'No direct catalyst/news row passed relevance filter.'
  ]
  return {
    ticker: normalizeTicker(ticker),
    generatedAt: new Date().toISOString(),
    reportAsOf: report.asOfDate,
    price,
    newsTape,
    providerNotes,
    gaps: uniqueStrings(gaps),
    optionsBattlefield,
    dayMap,
    sourceQuality: {
      price: price ? (price.fallback ? 'proxy' : 'sourced') : 'unavailable',
      options: optionsBattlefield.mode === 'true-gex' ? 'sourced' : optionsBattlefield.mode === 'proxy' ? 'proxy' : optionsBattlefield.mode === 'plan-locked' ? 'plan-locked' : 'unavailable',
      dayMap: dayMap.sourceLabel === 'Daily OHLCV day map' ? 'derived' : 'unavailable',
      catalysts: newsTape.length ? 'sourced' : 'unavailable',
      ai: 'unavailable'
    }
  }
}

export function stockPitchSourceHash(sourceSnapshot: PitchSourceSnapshot) {
  return createHash('sha256').update(stableJson(sourceSnapshot)).digest('hex')
}

export function newsTapeFromReport(report: StockReport): PitchNewsTapeItem[] {
  if (report.catalysts.availability !== 'Available') return []
  const materialityByTitle = new Map<string, number | null>()
  for (const metric of report.catalysts.metrics) {
    if (!metric.label.startsWith('Materiality:')) continue
    materialityByTitle.set(metric.label.replace(/^Materiality:\s*/, '').trim(), metric.value)
  }

  return report.catalysts.sources.slice(0, 8).map((source, index) => {
    const bullet = report.catalysts.bullets[index] ?? ''
    const split = bullet.match(/^(\d{4}-\d{2}-\d{2}):\s*(.+)$/)
    const headline = split?.[2] ?? source.label
    return {
      ...pointInTime(source),
      id: `news-${index + 1}-${slugify(headline)}`,
      date: split?.[1] ?? isoDate(source.asOfDate) ?? report.asOfDate,
      headline,
      sourceName: source.label || null,
      url: source.url ?? null,
      tickers: [report.ticker],
      theme: 'ticker catalyst',
      materiality: materialityByTitle.get(headline) ?? null,
      priceConfirmationRequired: true,
      whyMatters: source.detail || 'Direct ticker catalyst row; verify price confirmation before promotion.',
      relevance: 'direct'
    }
  })
}

function allSections(report: StockReport): ReportSection[] {
  return [...report.evidence, report.positioning, report.catalysts]
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function uniqueStrings(rows: string[]) {
  return [...new Set(rows.filter(Boolean))]
}

function normalizeTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '').slice(0, 10)
}

function isoDate(value: Date | string | null | undefined) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : String(value).slice(0, 10)
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

function describeError(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}
