import { seedBaskets } from '@/lib/data/baskets/seedBaskets'
import { seedTickers } from '@/lib/data/baskets/seedTickers'
import { combineStatuses, metric, pointInTime, sourceCoverage } from '@/lib/data/availability'
import { getEvents } from '@/lib/data/getEvents'
import { generateDailyNote } from '@/lib/data/notes/generateDailyNote'
import { buildStockReport, buildUnavailableStockReport } from '@/lib/research/report/buildStockReport'
import { getPrisma } from '@/lib/server/prisma'
import type { BasketSummary, CatalystReportRow, CrowdingRow, DailyNoteDto, DbDataStatus, MetricValue, PositioningRow, RotationRow, StockReport, TickerSeed, ValidationRow } from '@/lib/research/types'

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
  date?: Date | null
  asOfDate?: Date | null
  observedAt?: Date | null
  providerTimestamp?: Date | null
  ingestedAt?: Date | null
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
  latestNote: SnapshotLike | null
  validationResults: SnapshotLike[]
  providerRuns: SnapshotLike[]
  databaseConfigured: boolean
}

let terminalContextPromise: Promise<TerminalContext> | null = null
let terminalContextCache: { value: TerminalContext; loadedAt: number } | null = null
let databaseUnavailableUntil = 0

const TERMINAL_CONTEXT_TTL_MS = 60_000
const DATABASE_RETRY_DELAY_MS = 10_000
const DATABASE_QUERY_TIMEOUT_MS = Number(process.env.RESEARCH_DB_TIMEOUT_MS ?? 5_000)

export async function getTerminalContext(): Promise<TerminalContext> {
  const prisma = getPrisma()
  if (!prisma) {
    return fallbackContext(false)
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

async function loadTerminalContext(): Promise<TerminalContext> {
  const prisma = getPrisma()
  if (!prisma) return fallbackContext(false)

  try {
    const [tickers, baskets, signals, positioning, crowding, notes, validationResults, providerRuns] = await withTimeout(Promise.all([
      prisma.ticker.findMany({ orderBy: { ticker: 'asc' } }),
      prisma.themeBasket.findMany({ include: { members: { include: { ticker: true } } }, orderBy: { slug: 'asc' } }),
      prisma.signalSnapshot.findMany({ include: { ticker: true }, orderBy: [{ asOfDate: 'desc' }, { date: 'desc' }], take: 2000 }),
      prisma.positioningSnapshot.findMany({ include: { ticker: true }, orderBy: [{ asOfDate: 'desc' }, { date: 'desc' }], take: 2000 }),
      prisma.crowdingSnapshot.findMany({ include: { ticker: true }, orderBy: [{ asOfDate: 'desc' }, { date: 'desc' }], take: 2000 }),
      prisma.dailyNote.findMany({ orderBy: [{ asOfDate: 'desc' }, { generatedAt: 'desc' }], take: 1 }),
      prisma.validationResult.findMany({ orderBy: [{ asOfDate: 'desc' }, { createdAt: 'desc' }], take: 20 }),
      prisma.providerRun.findMany({ orderBy: { startedAt: 'desc' }, take: 20 })
    ]), DATABASE_QUERY_TIMEOUT_MS)

    return {
      tickers: tickers.length > 0 ? tickers : seedTickers.map(seedToTicker),
      baskets: baskets.length > 0 ? baskets : seedBaskets,
      signalByTicker: latestSnapshotByTicker(signals),
      positioningByTicker: latestSnapshotByTicker(positioning),
      crowdingByTicker: latestSnapshotByTicker(crowding),
      latestNote: notes[0] ?? null,
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
    latestNote: null,
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

export async function getDailyNote() {
  const context = await getTerminalContext()
  if (context.latestNote) return dailyNoteDto(context.latestNote)
  const rotations = await getRotationRows()
  const crowding = await getCrowdingRows()
  const asOfDate = process.env.DEMO_AS_OF_DATE || new Date().toISOString().slice(0, 10)
  return generateDailyNote({
    asOfDate,
    rotations,
    crowding,
    source: process.env.DEMO_AS_OF_DATE ? 'frozen sourced snapshot' : 'database',
    provider: context.databaseConfigured ? 'Postgres' : 'not configured'
  })
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
  const [rotations, baskets, crowding, note, validation] = await Promise.all([
    getRotationRows(),
    getBasketSummaries(),
    getCrowdingRows(),
    getDailyNote(),
    getValidationRows()
  ])
  return { rotations, baskets, crowding, note, validation, demoAsOfDate: process.env.DEMO_AS_OF_DATE ?? null }
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
  const catalysts = await getCatalystRows(ticker)

  return buildStockReport({
    ticker,
    companyName: tickerRow.name,
    signal: rotationRow(tickerRow, context.signalByTicker.get(ticker)),
    positioning: positioningRow(tickerRow, context.positioningByTicker.get(ticker)),
    crowding: crowdingRow(tickerRow, context.crowdingByTicker.get(ticker), basketForTicker(ticker)),
    catalysts
  })
}

async function getCatalystRows(ticker: string): Promise<CatalystReportRow[]> {
  const prisma = getPrisma()
  if (prisma && Date.now() >= databaseUnavailableUntil) {
    try {
      const rows = await withTimeout(prisma.catalystEvent.findMany({
        where: { tickerTags: { has: ticker } },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: 5
      }), 2500)
      if (rows.length > 0) return rows.map(catalystEventRow)
    } catch (error) {
      databaseUnavailableUntil = Date.now() + 30_000
      console.warn(`Catalyst query unavailable; using generated event fallback. ${describeDatabaseError(error)}`)
    }
  }

  return getEvents()
    .filter(event => event.affectedAssets.includes(ticker))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .map(event => {
      const point = pointInTime({
        asOfDate: event.date,
        observedAt: event.publishedAt,
        providerTimestamp: event.retrievedAt,
        ingestedAt: event.retrievedAt,
        source: event.sourceUrl,
        provider: event.provider,
        dataStatus: event.verified ? 'AVAILABLE' : 'PARTIAL'
      })
      return {
        ...point,
        id: event.id,
        title: event.title,
        date: event.date,
        summary: event.summary,
        sourceName: event.sourceName,
        url: event.sourceUrl,
        materialityScore: metric(null, 'UNAVAILABLE', 'No sourced materiality score stored for generated event')
      }
    })
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
    optionsVolume: metric(numberOf(snapshot?.optionsVolume), status, 'Polygon options entitlement or row missing'),
    openInterest: metric(numberOf(snapshot?.openInterest), status, 'Polygon options entitlement or row missing'),
    putCallRatio: metric(numberOf(snapshot?.putCallRatio), status, 'Options chain inputs missing'),
    impliedVolatility: metric(numberOf(snapshot?.impliedVolatility), status, 'Polygon options entitlement or row missing'),
    impliedVolPercentile: metric(numberOf(snapshot?.impliedVolPercentile), status, 'Insufficient IV history'),
    shortInterest: metric(numberOf(snapshot?.shortInterest), status, 'FINRA short-interest row missing'),
    shortInterestChange: metric(numberOf(snapshot?.shortInterestChange), status, 'FINRA short-interest history missing'),
    shortVolumeRatio: metric(numberOf(snapshot?.shortVolumeRatio), status, 'FINRA short-sale volume row missing'),
    positioningNotes: textOf(snapshot?.positioningNotes) ?? 'No sourced positioning note available.',
    excludedUnavailableInputs: excluded
  }
}

function crowdingRow(ticker: MinimalTicker, snapshot: SnapshotLike | undefined, basket: string): CrowdingRow {
  const status = statusOf(snapshot)
  const excluded = arrayOfStrings(snapshot?.excludedUnavailableInputs)
  return {
    ...pointInTime(snapshot ?? { source: 'crowding snapshot', provider: 'not configured', dataStatus: 'UNAVAILABLE' }),
    ticker: ticker.ticker,
    name: ticker.name,
    basket,
    crowdingScore: metric(numberOf(snapshot?.crowdingScore), status, 'Crowding snapshot missing'),
    crowdingLabel: textOf(snapshot?.crowdingLabel) ?? 'Unavailable',
    momentumScore: metric(numberOf(snapshot?.momentumScore), status, 'Momentum component missing'),
    volumeScore: metric(numberOf(snapshot?.volumeScore), status, 'Volume component missing'),
    optionsScore: metric(numberOf(snapshot?.optionsScore), status, 'Options component missing'),
    volatilityScore: metric(numberOf(snapshot?.volatilityScore), status, 'Volatility component missing'),
    shortInterestScore: metric(numberOf(snapshot?.shortInterestScore), status, 'Short-interest component missing'),
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
    basketLabel: avgCrowding === null ? 'Unavailable' : avgCrowding >= 75 ? 'Crowded Momentum' : avgCrowding >= 50 ? 'Confirmed Sponsorship' : avgCrowding >= 25 ? 'Early Accumulation' : 'Ignored / Weak',
    topContributors: ranked.slice(0, 3).map(item => item.ticker),
    laggards: ranked.slice(-3).reverse().map(item => item.ticker)
  }
}

function dailyNoteDto(note: SnapshotLike): DailyNoteDto {
  return {
    ...pointInTime(note),
    id: textOf(note.id) ?? 'daily-note',
    date: isoDate(note.date) ?? isoDate(note.asOfDate) ?? '',
    title: textOf(note.title) ?? 'PM Daily Flow & Positioning Note',
    marketRegime: textOf(note.marketRegime) ?? 'Unavailable',
    topRotations: arrayOfStrings(note.topRotations),
    crowdedLongs: arrayOfStrings(note.crowdedLongs),
    earlyAccumulation: arrayOfStrings(note.earlyAccumulation),
    reversalRisks: arrayOfStrings(note.reversalRisks),
    pmQuestions: arrayOfStrings(note.pmQuestions),
    body: textOf(note.body) ?? '',
    inputSnapshotIds: arrayOfStrings(note.inputSnapshotIds),
    excludedUnavailableInputs: arrayOfStrings(note.excludedUnavailableInputs),
    generatedAt: isoDateTime(note.generatedAt) ?? '',
    humanEditedAt: isoDateTime(note.humanEditedAt),
    noteStatus: (textOf(note.noteStatus) as DailyNoteDto['noteStatus']) ?? 'GENERATED',
    sourceCoveragePercent: numberOf(note.sourceCoveragePercent) ?? 0
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
    caveats: textOf(record.caveats) ?? 'No caveat recorded.'
  }
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

function isoDate(value: unknown) {
  const date = dateOf(value)
  return date ? date.toISOString().slice(0, 10) : null
}

function isoDateTime(value: unknown) {
  const date = dateOf(value)
  return date ? date.toISOString() : null
}

function dateOf(value: unknown) {
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const date = new Date(value)
    return Number.isFinite(date.getTime()) ? date : null
  }
  return null
}
