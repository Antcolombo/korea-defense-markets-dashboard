import { seedBaskets } from '@/lib/data/baskets/seedBaskets'
import { seedTickers } from '@/lib/data/baskets/seedTickers'
import { getAssets } from '@/lib/data/getAssets'
import { getPrices } from '@/lib/data/getPrices'
import { combineStatuses, metric, pointInTime, sourceCoverage } from '@/lib/data/availability'
import { buildStockReport, buildUnavailableStockReport } from '@/lib/research/report/buildStockReport'
import { crowdingLabel as scoreCrowdingLabel, crowdingScoreFromComponents, extensionRiskScoreFromComponents, setupLabel } from '@/lib/research/crowdingScores'
import { getPrisma } from '@/lib/server/prisma'
import { researchSnapshotCutoff, resolveResearchDataMode } from '@/platform/data/data-mode'
import type { Asset } from '@/types/asset'
import type { PricePoint } from '@/types/market'
import type { BasketSummary, CatalystReportRow, CrowdingRow, DbDataStatus, MetricValue, PositioningRow, RotationRow, StockReport, TickerSeed, ValidationRow } from '@/lib/research/types'

const rotationTickers = ['SPY', 'QQQ', 'IWM', 'TLT', 'GLD', 'USO', 'VIXY', 'XLK', 'XLF', 'XLI', 'XLE', 'XLU', 'XLP', 'XLV', 'XLY', 'SMH', 'ITA', 'XAR', 'EWY']

type MinimalTicker = {
  id?: string
  ticker: string
  name: string
  sector: string | null
  industry?: string | null
  country?: string | null
  assetType: string
  isEtf: boolean
  description?: string | null
}

type SnapshotLike = {
  id?: string
  tickerId?: string
  date?: Date | string | null
  asOfDate?: Date | string | null
  observedAt?: Date | string | null
  providerTimestamp?: Date | string | null
  ingestedAt?: Date | string | null
  source?: string
  provider?: string
  revisionFlag?: string
  dataStatus?: string
  [key: string]: unknown
}

type TerminalContext = {
  tickers: MinimalTicker[]
  baskets: unknown[]
  signalByTicker: Map<string, SnapshotLike>
  positioningByTicker: Map<string, SnapshotLike>
  crowdingByTicker: Map<string, SnapshotLike>
  validationResults: SnapshotLike[]
  providerRuns: SnapshotLike[]
  databaseConfigured: boolean
}

let terminalContextPromise: Promise<TerminalContext> | null = null
let terminalContextCache: { value: TerminalContext; loadedAt: number } | null = null
let databaseUnavailableUntil = 0

const TERMINAL_CONTEXT_TTL_MS = 60_000
const DATABASE_RETRY_DELAY_MS = 10_000
const DATABASE_QUERY_TIMEOUT_MS = Number(process.env.RESEARCH_DB_TIMEOUT_MS ?? 10_000)

export async function getTerminalContext(): Promise<TerminalContext> {
  const prisma = getPrisma()
  if (!prisma) {
    return resolveResearchDataMode().mode === 'generated'
      ? generatedContext()
      : fallbackContext(false)
  }
  const now = Date.now()
  if (terminalContextCache && now - terminalContextCache.loadedAt < TERMINAL_CONTEXT_TTL_MS) {
    return terminalContextCache.value
  }
  if (now < databaseUnavailableUntil) {
    return terminalContextCache?.value ?? fallbackContext(true)
  }
  if (!terminalContextPromise) {
    terminalContextPromise = loadTerminalContext()
      .then(context => {
        if (!isFallbackOnlyContext(context)) {
          terminalContextCache = { value: context, loadedAt: Date.now() }
        }
        return context
      })
      .finally(() => {
        terminalContextPromise = null
      })
  }
  return terminalContextPromise
}

let generatedTerminalContext: TerminalContext | null = null

function generatedContext(): TerminalContext {
  if (generatedTerminalContext) return generatedTerminalContext

  const assets = getAssets()
  const prices = getPrices()
  const pricesByTicker = groupPrices(prices)
  const generatedTickers = assets.map(assetToTicker)
  const tickers = mergeTickers(seedTickers.map(seedToTicker), generatedTickers)
  const signalByTicker = new Map<string, SnapshotLike>()
  const crowdingByTicker = new Map<string, SnapshotLike>()
  const benchmarkSeries = pricesByTicker.get('SPY') ?? pricesByTicker.get('SPX') ?? []
  const benchmark20d = periodReturn(benchmarkSeries, 20)
  const benchmark60d = periodReturn(benchmarkSeries, 60)

  for (const asset of assets) {
    const series = pricesByTicker.get(asset.ticker) ?? []
    const signal = generatedSignalSnapshot(asset, series, benchmark20d, benchmark60d)
    if (!signal) continue
    signalByTicker.set(asset.ticker, signal)
    crowdingByTicker.set(asset.ticker, generatedCrowdingSnapshot(signal))
  }

  generatedTerminalContext = {
    tickers,
    baskets: seedBaskets,
    signalByTicker,
    positioningByTicker: new Map<string, SnapshotLike>(),
    crowdingByTicker,
    validationResults: [],
    providerRuns: [],
    databaseConfigured: false
  }
  return generatedTerminalContext
}

function groupPrices(rows: PricePoint[]) {
  const grouped = new Map<string, PricePoint[]>()
  for (const row of rows) grouped.set(row.ticker, [...grouped.get(row.ticker) ?? [], row])
  for (const [ticker, series] of grouped) grouped.set(ticker, series.sort((a, b) => a.date.localeCompare(b.date)))
  return grouped
}

function assetToTicker(asset: Asset): MinimalTicker {
  return {
    ticker: asset.ticker,
    name: asset.name,
    sector: asset.sector,
    country: asset.country,
    assetType: asset.assetClass.toUpperCase(),
    isEtf: asset.assetClass === 'etf',
    description: asset.description
  }
}

function mergeTickers(primary: MinimalTicker[], secondary: MinimalTicker[]) {
  const merged = new Map(primary.map(ticker => [ticker.ticker, ticker]))
  for (const ticker of secondary) merged.set(ticker.ticker, { ...merged.get(ticker.ticker), ...ticker })
  return [...merged.values()]
}

function generatedSignalSnapshot(
  asset: Asset,
  series: PricePoint[],
  benchmark20d: number | null,
  benchmark60d: number | null
): SnapshotLike | null {
  const latest = series.at(-1)
  const return1d = periodReturn(series, 1) ?? asset.return1d
  const return5d = periodReturn(series, 5) ?? asset.return5d
  const return20d = periodReturn(series, 20) ?? asset.return20d
  const return60d = periodReturn(series, 60)
  if (!latest && return1d === null && return5d === null && return20d === null) return null

  const ma20 = movingAverage(series, 20)
  const ma50 = movingAverage(series, 50)
  const distanceFrom20dMa = priceDistance(latest?.price ?? null, ma20)
  const distanceFrom50dMa = priceDistance(latest?.price ?? null, ma50)
  const volumeVs20dAvg = volumeRatio(series, 20)
  const realizedVol20d = realizedVolatility(series, 20)
  const relativeStrengthVsSpy20d = return20d === null || benchmark20d === null ? null : return20d - benchmark20d
  const relativeStrengthVsSpy60d = return60d === null || benchmark60d === null ? null : return60d - benchmark60d

  return {
    asOfDate: latest?.date ?? asset.retrievedAt,
    observedAt: asset.retrievedAt,
    providerTimestamp: asset.publishedAt,
    ingestedAt: asset.retrievedAt,
    source: latest?.sourceName ?? asset.sourceName,
    provider: latest?.provider ?? asset.provider,
    revisionFlag: 'ORIGINAL',
    dataStatus: 'AVAILABLE',
    return1d,
    return5d,
    return20d,
    return60d,
    relativeStrengthVsSpy20d,
    relativeStrengthVsSpy60d,
    volumeVs20dAvg,
    realizedVol20d,
    distanceFrom20dMa,
    distanceFrom50dMa,
    trendLabel: trendLabel(return20d, distanceFrom20dMa, distanceFrom50dMa)
  }
}

function generatedCrowdingSnapshot(signal: SnapshotLike): SnapshotLike {
  const relativeStrength = numberOf(signal.relativeStrengthVsSpy20d)
  const volumeRatioValue = numberOf(signal.volumeVs20dAvg)
  const volatility = numberOf(signal.realizedVol20d)
  const momentumScore = relativeStrength === null ? null : clamp(50 + relativeStrength * 3, 0, 100)
  const volumeScore = volumeRatioValue === null ? null : clamp(volumeRatioValue * 50, 0, 100)
  const volatilityScore = volatility === null ? null : clamp(volatility * 2, 0, 100)
  return {
    ...signal,
    dataStatus: 'PARTIAL',
    momentumScore,
    volumeScore,
    volatilityScore,
    optionsScore: null,
    shortInterestScore: null,
    excludedUnavailableInputs: ['Options positioning', 'Short interest'],
    explanation: 'Derived from sourced daily close and volume only. Options and short-interest inputs are excluded, not estimated.'
  }
}

function periodReturn(series: PricePoint[], sessions: number) {
  if (series.length < 2) return null
  const end = series.at(-1)?.price
  const start = series[Math.max(0, series.length - 1 - sessions)]?.price
  if (!end || !start) return null
  return Number((((end - start) / start) * 100).toFixed(2))
}

function movingAverage(series: PricePoint[], sessions: number) {
  const values = series.slice(-sessions).map(row => row.price).filter(value => Number.isFinite(value))
  if (values.length < Math.min(5, sessions)) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function priceDistance(price: number | null, average: number | null) {
  if (price === null || average === null || average === 0) return null
  return Number((((price - average) / average) * 100).toFixed(2))
}

function volumeRatio(series: PricePoint[], sessions: number) {
  const latest = series.at(-1)?.volume
  const history = series.slice(-(sessions + 1), -1).map(row => row.volume).filter((value): value is number => typeof value === 'number' && value > 0)
  if (!latest || history.length < 5) return null
  const average = history.reduce((sum, value) => sum + value, 0) / history.length
  return average ? Number((latest / average).toFixed(2)) : null
}

function realizedVolatility(series: PricePoint[], sessions: number) {
  const closes = series.slice(-(sessions + 1)).map(row => row.price).filter(value => value > 0)
  if (closes.length < 6) return null
  const returns = closes.slice(1).map((price, index) => Math.log(price / closes[index]))
  const average = returns.reduce((sum, value) => sum + value, 0) / returns.length
  const variance = returns.reduce((sum, value) => sum + (value - average) ** 2, 0) / Math.max(1, returns.length - 1)
  return Number((Math.sqrt(variance) * Math.sqrt(252) * 100).toFixed(2))
}

function trendLabel(return20d: number | null, distance20d: number | null, distance50d: number | null) {
  if (return20d === null) return 'Unavailable'
  if (return20d > 0 && (distance20d ?? 0) > 0 && (distance50d ?? 0) > 0) return 'Uptrend'
  if (return20d < 0 && (distance20d ?? 0) < 0 && (distance50d ?? 0) < 0) return 'Downtrend'
  return 'Mixed'
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

async function loadTerminalContext(): Promise<TerminalContext> {
  const prisma = getPrisma()
  if (!prisma) return fallbackContext(false)
  const cutoff = researchSnapshotCutoff()
  const snapshotWhere = cutoff ? { asOfDate: { lte: cutoff } } : undefined

  try {
    const [tickers, baskets, signals, positioning, crowding, validationResults, providerRuns] = await withTimeout(Promise.all([
      prisma.ticker.findMany({ orderBy: { ticker: 'asc' } }),
      prisma.themeBasket.findMany({ include: { members: { include: { ticker: true } } }, orderBy: { slug: 'asc' } }),
      prisma.signalSnapshot.findMany({ where: snapshotWhere, include: { ticker: true }, orderBy: [{ asOfDate: 'desc' }, { date: 'desc' }], take: 2000 }),
      prisma.positioningSnapshot.findMany({ where: snapshotWhere, include: { ticker: true }, orderBy: [{ asOfDate: 'desc' }, { date: 'desc' }], take: 2000 }),
      prisma.crowdingSnapshot.findMany({ where: snapshotWhere, include: { ticker: true }, orderBy: [{ asOfDate: 'desc' }, { date: 'desc' }], take: 2000 }),
      prisma.validationResult.findMany({ where: snapshotWhere, orderBy: [{ asOfDate: 'desc' }, { createdAt: 'desc' }], take: 20 }),
      prisma.providerRun.findMany({ where: snapshotWhere, orderBy: { startedAt: 'desc' }, take: 20 })
    ]), DATABASE_QUERY_TIMEOUT_MS)

    return {
      tickers: tickers.length > 0 ? tickers : seedTickers.map(seedToTicker),
      baskets: baskets.length > 0 ? baskets : seedBaskets,
      signalByTicker: latestSnapshotByTicker(signals),
      positioningByTicker: latestSnapshotByTicker(positioning),
      crowdingByTicker: latestSnapshotByTicker(crowding),
      validationResults,
      providerRuns,
      databaseConfigured: true
    }
  } catch (error) {
    databaseUnavailableUntil = Date.now() + DATABASE_RETRY_DELAY_MS
    if (terminalContextCache) {
      console.warn(`Research database unavailable; using cached terminal state. ${describeDatabaseError(error)}`)
      return terminalContextCache.value
    }
    console.warn(`Research database unavailable; rendering setup state. ${describeDatabaseError(error)}`)
    return fallbackContext(true)
  }
}

function isFallbackOnlyContext(context: TerminalContext) {
  return context.signalByTicker.size === 0
    && context.positioningByTicker.size === 0
    && context.crowdingByTicker.size === 0
    && context.providerRuns.length === 0
}

function fallbackContext(databaseConfigured: boolean): TerminalContext {
  return {
    tickers: seedTickers.map(seedToTicker),
    baskets: seedBaskets,
    signalByTicker: new Map<string, SnapshotLike>(),
    positioningByTicker: new Map<string, SnapshotLike>(),
    crowdingByTicker: new Map<string, SnapshotLike>(),
    validationResults: [],
    providerRuns: [],
    databaseConfigured
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`Database query timed out after ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout)
  })
}

function describeDatabaseError(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Unknown database error.'
}

export async function getRotationRows() {
  const context = await getTerminalContext()
  const tickers = context.tickers.filter(ticker => rotationTickers.includes(ticker.ticker))
  return tickers.map(ticker => rotationRow(ticker, context.signalByTicker.get(ticker.ticker)))
}

export async function getPositioningRows() {
  const context = await getTerminalContext()
  return context.tickers
    .filter(ticker => !ticker.isEtf || ['SPY', 'QQQ', 'SMH', 'ITA', 'XAR', 'EWY'].includes(ticker.ticker))
    .slice(0, 80)
    .map(ticker => positioningRow(ticker, context.positioningByTicker.get(ticker.ticker)))
}

export async function getCrowdingRows() {
  const context = await getTerminalContext()
  return context.tickers
    .filter(ticker => context.crowdingByTicker.has(ticker.ticker) || !ticker.isEtf)
    .slice(0, 80)
    .map(ticker => crowdingRow(ticker, context.crowdingByTicker.get(ticker.ticker), basketForTicker(ticker.ticker)))
}

export async function getBasketSummaries() {
  const context = await getTerminalContext()
  return context.baskets.map(basket => basketSummary(basket, context.signalByTicker, context.crowdingByTicker))
}

export async function getBasketDetail(slug: string) {
  const summaries = await getBasketSummaries()
  const context = await getTerminalContext()
  const summary = summaries.find(item => item.slug === slug) ?? null
  const basket = context.baskets.find(item => textOf(readField(item, 'slug')) === slug)
  const members = getBasketMembers(basket).map(member => {
    const ticker = context.tickers.find(item => item.ticker === member.ticker)
    return {
      ticker: member.ticker,
      name: ticker?.name ?? member.ticker,
      rationale: member.rationale,
      signal: rotationRow(ticker ?? seedToTicker({ ticker: member.ticker, name: member.ticker, sector: 'Unknown', country: 'Unknown', assetType: 'Equity', isEtf: false, description: 'Taxonomy member.' }), context.signalByTicker.get(member.ticker)),
      crowding: crowdingRow(ticker ?? seedToTicker({ ticker: member.ticker, name: member.ticker, sector: 'Unknown', country: 'Unknown', assetType: 'Equity', isEtf: false, description: 'Taxonomy member.' }), context.crowdingByTicker.get(member.ticker), summary?.name ?? 'Theme basket')
    }
  })
  return { summary, members }
}

export async function getValidationRows() {
  const context = await getTerminalContext()
  if (context.validationResults.length === 0) {
    const pit = pointInTime({
      asOfDate: process.env.DEMO_AS_OF_DATE ?? new Date().toISOString().slice(0, 10),
      observedAt: null,
      ingestedAt: null,
      source: 'validation engine',
      provider: context.databaseConfigured ? 'Postgres' : 'not configured',
      dataStatus: 'UNAVAILABLE'
    })
    return ['Crowding 5D/20D reversal', 'RS + volume continuation', 'Options volume spike vs realized vol'].map(testName => ({
      ...pit,
      testName,
      hitRate: metric(null, 'UNAVAILABLE', 'No sourced validation sample available'),
      averageForwardReturn: metric(null, 'UNAVAILABLE', 'No sourced validation sample available'),
      sampleSize: 0,
      coveragePercent: 0,
      caveats: 'Run ingestion and validation against sourced historical rows.'
    }))
  }
  return context.validationResults.map(validationRow)
}

export async function getHomeSummary() {
  const [rotations, baskets, crowding, validation] = await Promise.all([
    getRotationRows(),
    getBasketSummaries(),
    getCrowdingRows(),
    getValidationRows()
  ])
  return { rotations, baskets, crowding, validation, demoAsOfDate: process.env.DEMO_AS_OF_DATE ?? null }
}

export function normalizeTickerSymbol(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  return raw?.trim().toUpperCase() ?? ''
}

export function isValidTickerSymbol(value: string) {
  return /^[A-Z][A-Z0-9.-]{0,9}$/.test(value)
}

export async function getStockReport(symbol: string): Promise<StockReport> {
  const ticker = normalizeTickerSymbol(symbol)
  if (!isValidTickerSymbol(ticker)) {
    return buildUnavailableStockReport(ticker || 'UNKNOWN', ticker || 'Unknown ticker', 'Ticker format is invalid.')
  }

  const context = await getTerminalContext()
  const tickerRow = context.tickers.find(item => item.ticker === ticker)
    ?? seedTickers.map(seedToTicker).find(item => item.ticker === ticker)
    ?? seedToTicker({
      ticker,
      name: ticker,
      sector: 'Unknown',
      country: 'Unknown',
      assetType: 'Equity',
      isEtf: false,
      description: 'Ticker is outside seeded taxonomy.'
    })
  const catalysts = await getCatalystRows(ticker, tickerRow.name)

  return buildStockReport({
    ticker,
    companyName: tickerRow.name,
    signal: rotationRow(tickerRow, context.signalByTicker.get(ticker)),
    positioning: positioningRow(tickerRow, context.positioningByTicker.get(ticker)),
    crowding: crowdingRow(tickerRow, context.crowdingByTicker.get(ticker), basketForTicker(ticker), catalysts),
    catalysts
  })
}

async function getCatalystRows(ticker: string, companyName: string): Promise<CatalystReportRow[]> {
  const prisma = getPrisma()
  if (prisma && Date.now() >= databaseUnavailableUntil) {
    try {
      const rows = await withTimeout(prisma.catalystEvent.findMany({
        where: { tickerTags: { has: ticker } },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: 5
      }), 2500)
      const directRows = rows.filter(row => storedCatalystIsDirectTicker(row, ticker, companyName))
      if (directRows.length > 0) return directRows.map(catalystEventRow)
    } catch (error) {
      databaseUnavailableUntil = Date.now() + 30_000
      console.warn(`Catalyst query unavailable; no generated event fallback used. ${describeDatabaseError(error)}`)
    }
  }

  return []
}

function storedCatalystIsDirectTicker(record: SnapshotLike, ticker: string, companyName: string) {
  const text = [
    textOf(record.title),
    textOf(record.summary),
    textOf(record.sourceName),
    textOf(record.url)
  ].filter(Boolean).join(' ').toLowerCase()
  const symbol = ticker.toLowerCase()
  if (new RegExp(`\\b${escapeRegex(symbol)}\\b`, 'i').test(text)) return true
  const companyTokens = directCompanyTokens(companyName)
  return companyTokens.some(token => new RegExp(`\\b${escapeRegex(token)}\\b`, 'i').test(text))
}

function directCompanyTokens(companyName: string) {
  const generic = new Set(['inc', 'corp', 'corporation', 'company', 'co', 'ltd', 'plc', 'holdings', 'markets', 'group'])
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(token => token.length >= 4 && !generic.has(token))
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function catalystEventRow(record: SnapshotLike): CatalystReportRow {
  const status = statusOf(record)
  return {
    ...pointInTime(record),
    id: textOf(record.id) ?? `catalyst-${textOf(record.title) ?? 'row'}`,
    title: textOf(record.title) ?? 'Untitled catalyst',
    date: isoDate(record.date) ?? isoDate(record.asOfDate) ?? '',
    summary: textOf(record.summary) ?? 'No sourced catalyst summary stored.',
    sourceName: textOf(record.sourceName),
    url: textOf(record.url),
    materialityScore: metric(numberOf(record.materialityScore), status, 'Catalyst materiality score missing')
  }
}

function seedToTicker(seed: TickerSeed): MinimalTicker {
  return {
    ticker: seed.ticker,
    name: seed.name,
    sector: seed.sector,
    industry: seed.industry ?? null,
    country: seed.country,
    assetType: seed.assetType,
    isEtf: seed.isEtf,
    description: seed.description
  }
}

function latestSnapshotByTicker(records: (SnapshotLike & { ticker?: MinimalTicker })[]) {
  const map = new Map<string, SnapshotLike>()
  for (const record of records) {
    const symbol = record.ticker?.ticker
    if (symbol && !map.has(symbol)) map.set(symbol, record)
  }
  return map
}

function rotationRow(ticker: MinimalTicker, snapshot: SnapshotLike | undefined): RotationRow {
  const status = statusOf(snapshot)
  const pit = pointInTime(snapshot ?? { source: 'signal snapshot', provider: 'not configured', dataStatus: 'UNAVAILABLE' })
  return {
    ...pit,
    ticker: ticker.ticker,
    name: ticker.name,
    sector: ticker.sector ?? 'Unclassified',
    return1d: metric(numberOf(snapshot?.return1d), status, 'Signal snapshot missing'),
    return5d: metric(numberOf(snapshot?.return5d), status, 'Signal snapshot missing'),
    return20d: metric(numberOf(snapshot?.return20d), status, 'Signal snapshot missing'),
    return60d: metric(numberOf(snapshot?.return60d), status, 'Signal snapshot missing'),
    relativeStrengthVsSpy20d: metric(numberOf(snapshot?.relativeStrengthVsSpy20d), status, 'Signal snapshot missing'),
    relativeStrengthVsSpy60d: metric(numberOf(snapshot?.relativeStrengthVsSpy60d), status, 'Signal snapshot missing'),
    volumeVs20dAvg: metric(numberOf(snapshot?.volumeVs20dAvg), status, 'Volume data missing'),
    realizedVol20d: metric(numberOf(snapshot?.realizedVol20d), status, 'Signal snapshot missing'),
    distanceFrom20dMa: metric(numberOf(snapshot?.distanceFrom20dMa), status, 'Signal snapshot missing'),
    distanceFrom50dMa: metric(numberOf(snapshot?.distanceFrom50dMa), status, 'Signal snapshot missing'),
    trendLabel: textOf(snapshot?.trendLabel) ?? 'Unavailable'
  }
}

function positioningRow(ticker: MinimalTicker, snapshot: SnapshotLike | undefined): PositioningRow {
  const status = statusOf(snapshot)
  const excluded = arrayOfStrings(snapshot?.excludedUnavailableInputs)
  return {
    ...pointInTime(snapshot ?? { source: 'positioning snapshot', provider: 'not configured', dataStatus: 'UNAVAILABLE' }),
    ticker: ticker.ticker,
    name: ticker.name,
    optionsVolume: metric(numberOf(snapshot?.optionsVolume), status, 'Polygon/Massive options entitlement or row missing'),
    openInterest: metric(numberOf(snapshot?.openInterest), status, 'Polygon/Massive options entitlement or row missing'),
    putCallRatio: metric(numberOf(snapshot?.putCallRatio), status, 'Options chain inputs missing'),
    impliedVolatility: metric(numberOf(snapshot?.impliedVolatility), status, 'Polygon/Massive options entitlement or row missing'),
    impliedVolPercentile: metric(numberOf(snapshot?.impliedVolPercentile), status, 'Insufficient IV history'),
    shortInterest: metric(numberOf(snapshot?.shortInterest), status, 'FINRA short-interest row missing'),
    shortInterestChange: metric(numberOf(snapshot?.shortInterestChange), status, 'FINRA short-interest history missing'),
    shortVolumeRatio: metric(numberOf(snapshot?.shortVolumeRatio), status, 'FINRA short-sale volume row missing'),
    positioningNotes: textOf(snapshot?.positioningNotes) ?? 'No sourced positioning note available.',
    excludedUnavailableInputs: excluded
  }
}

function crowdingRow(ticker: MinimalTicker, snapshot: SnapshotLike | undefined, basket: string, catalysts: CatalystReportRow[] = []): CrowdingRow {
  const status = statusOf(snapshot)
  const excluded = arrayOfStrings(snapshot?.excludedUnavailableInputs)
  const momentumScore = numberOf(snapshot?.momentumScore)
  const volumeScore = numberOf(snapshot?.volumeScore)
  const optionsScore = numberOf(snapshot?.optionsScore)
  const volatilityScore = numberOf(snapshot?.volatilityScore)
  const shortInterestScore = numberOf(snapshot?.shortInterestScore)
  const storedCrowdingScore = numberOf(snapshot?.crowdingScore)
  const crowdingScore = crowdingScoreFromComponents({ momentumScore, volumeScore, optionsScore, shortInterestScore }) ?? storedCrowdingScore
  const extensionRiskScore = numberOf(snapshot?.extensionRiskScore)
    ?? componentNumber(snapshot, 'extensionRiskScore')
    ?? extensionRiskScoreFromComponents({
      volatilityScore,
      distanceFrom20dMa: componentNumber(snapshot, 'distanceFrom20dMa'),
      distanceFrom50dMa: componentNumber(snapshot, 'distanceFrom50dMa')
    })
    ?? volatilityScore
  const catalystSupportScore = numberOf(snapshot?.catalystScore)
    ?? componentNumber(snapshot, 'catalystSupportScore')
    ?? averageMetric(catalysts.map(row => row.materialityScore.value))
  const catalystStatus = catalystSupportScore !== null && catalysts.length > 0
    ? combineStatuses(catalysts.map(row => row.dataStatus as DbDataStatus))
    : status
  return {
    ...pointInTime(snapshot ?? { source: 'crowding snapshot', provider: 'not configured', dataStatus: 'UNAVAILABLE' }),
    ticker: ticker.ticker,
    name: ticker.name,
    basket,
    crowdingScore: metric(crowdingScore, status, 'Crowding snapshot missing'),
    crowdingLabel: scoreCrowdingLabel(crowdingScore),
    extensionRiskScore: metric(extensionRiskScore, status, 'Extension-risk snapshot missing'),
    catalystSupportScore: metric(catalystSupportScore, catalystStatus, 'Catalyst support score missing'),
    setupLabel: setupLabel({ crowdingScore, extensionRiskScore, catalystSupportScore }),
    momentumScore: metric(momentumScore, status, 'Momentum component missing'),
    volumeScore: metric(volumeScore, status, 'Volume component missing'),
    optionsScore: metric(optionsScore, status, 'Options component missing'),
    volatilityScore: metric(volatilityScore, status, 'Volatility component missing'),
    shortInterestScore: metric(shortInterestScore, status, 'Short-interest component missing'),
    explanation: textOf(snapshot?.explanation) ?? 'No sourced crowding explanation available.',
    excludedUnavailableInputs: excluded
  }
}

function basketSummary(basket: unknown, signalByTicker: Map<string, SnapshotLike>, crowdingByTicker: Map<string, SnapshotLike>): BasketSummary {
  const slug = textOf(readField(basket, 'slug')) ?? 'unknown'
  const name = textOf(readField(basket, 'name')) ?? slug
  const members = getBasketMembers(basket)
  const signals = members.map(member => signalByTicker.get(member.ticker))
  const crowding = members.map(member => crowdingByTicker.get(member.ticker))
  const return5d = averageMetric(signals.map(item => numberOf(item?.return5d)))
  const return20d = averageMetric(signals.map(item => numberOf(item?.return20d)))
  const return60d = averageMetric(signals.map(item => numberOf(item?.return60d)))
  const rs20d = averageMetric(signals.map(item => numberOf(item?.relativeStrengthVsSpy20d)))
  const avgCrowding = averageMetric(crowding.map(item => numberOf(item?.crowdingScore)))
  const statuses = [...signals, ...crowding].map(statusOf)
  const status = combineStatuses(statuses.length > 0 ? statuses : ['UNAVAILABLE'])
  const ranked = members.map(member => ({ ticker: member.ticker, value: numberOf(signalByTicker.get(member.ticker)?.return20d) }))
    .filter((item): item is { ticker: string; value: number } => item.value !== null)
    .sort((a, b) => b.value - a.value)
  return {
    ...pointInTime({ source: 'theme basket taxonomy + sourced snapshots', provider: 'Postgres', dataStatus: status }),
    slug,
    name,
    description: textOf(readField(basket, 'description')) ?? 'Theme basket.',
    category: textOf(readField(basket, 'category')) ?? 'Theme',
    memberCount: members.length,
    return5d: metric(return5d, status, 'Basket member signals missing'),
    return20d: metric(return20d, status, 'Basket member signals missing'),
    return60d: metric(return60d, status, 'Basket member signals missing'),
    relativeStrengthVsSpy20d: metric(rs20d, status, 'Basket member signals missing'),
    averageCrowdingScore: metric(avgCrowding, status, 'Basket member crowding rows missing'),
    basketLabel: avgCrowding === null ? 'Unavailable' : avgCrowding >= 75 ? 'Crowded Sponsorship' : avgCrowding >= 50 ? 'Confirmed Sponsorship' : avgCrowding >= 25 ? 'Early Accumulation' : 'Ignored / Weak',
    topContributors: ranked.slice(0, 3).map(item => item.ticker),
    laggards: ranked.slice(-3).reverse().map(item => item.ticker)
  }
}

function validationRow(record: SnapshotLike): ValidationRow {
  const status = statusOf(record)
  const hitRate = metric(numberOf(record.hitRate), status, 'Validation result missing')
  const averageForwardReturn = metric(numberOf(record.averageForwardReturn), status, 'Validation result missing')
  return {
    ...pointInTime(record),
    testName: textOf(record.testName) ?? 'Validation test',
    hitRate,
    averageForwardReturn,
    sampleSize: numberOf(record.sampleSize) ?? 0,
    coveragePercent: numberOf(record.coveragePercent) ?? sourceCoverage([hitRate, averageForwardReturn]),
    caveats: textOf(record.caveats) ?? 'No caveat recorded.',
    resultRows: normalizeValidationSamples(record.resultRows)
  }
}

function normalizeValidationSamples(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.slice(0, 100).flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const raw = item as Record<string, unknown>
    const hit = raw.hit
    const forwardReturn = numberOf(raw.forwardReturn)
    if (typeof hit !== 'boolean' || forwardReturn === null) return []
    return [{
      ticker: textOf(raw.ticker) ?? undefined,
      signalDate: textOf(raw.signalDate) ?? undefined,
      signalValue: numberOf(raw.signalValue),
      hit,
      forwardReturn,
      trailingVol: numberOf(raw.trailingVol),
      forwardVol: numberOf(raw.forwardVol)
    }]
  })
}

function getBasketMembers(basket: unknown) {
  const rawMembers = readField(basket, 'members')
  if (Array.isArray(rawMembers)) {
    return rawMembers.map(member => ({
      ticker: textOf(readField(readField(member, 'ticker'), 'ticker')) ?? textOf(readField(member, 'ticker')) ?? '',
      rationale: textOf(readField(member, 'rationale')) ?? 'Theme member.'
    })).filter(member => member.ticker)
  }
  const seed = seedBaskets.find(item => item.slug === textOf(readField(basket, 'slug')))
  return seed?.members ?? []
}

function basketForTicker(ticker: string) {
  return seedBaskets.find(basket => basket.members.some(member => member.ticker === ticker))?.name ?? 'Unassigned'
}

function averageMetric(values: (number | null)[]) {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value))
  if (valid.length === 0) return null
  return Number((valid.reduce((sum, value) => sum + value, 0) / valid.length).toFixed(2))
}

function statusOf(snapshot: SnapshotLike | undefined): DbDataStatus {
  return (snapshot?.dataStatus as DbDataStatus | undefined) ?? 'UNAVAILABLE'
}

function numberOf(value: unknown) {
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function textOf(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

function arrayOfStrings(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function readField(value: unknown, field: string): unknown {
  if (!value || typeof value !== 'object') return undefined
  return (value as Record<string, unknown>)[field]
}

function componentNumber(snapshot: SnapshotLike | undefined, field: string) {
  const components = readField(snapshot, 'components')
  if (!components || typeof components !== 'object' || Array.isArray(components)) return null
  return numberOf((components as Record<string, unknown>)[field])
}

function isoDate(value: unknown) {
  const date = dateOf(value)
  return date ? date.toISOString().slice(0, 10) : null
}

function dateOf(value: unknown) {
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const date = new Date(value)
    return Number.isFinite(date.getTime()) ? date : null
  }
  return null
}
