import type { ParsedUrlQuery } from 'node:querystring'
import type { ShellMeta, UnavailableField } from '@/contracts/provenance'
import type { WorkspaceData, WorkspaceModule } from '@/contracts/workspace'
import { createApiResponse, createShellMeta } from '@/lib/research/api'
import { isValidTickerSymbol, normalizeTickerSymbol } from '@/lib/research/repository'
import type { ResearchDataMode } from '@/platform/data/data-mode'
import { resolveResearchDataMode } from '@/platform/data/data-mode'
import { runtimeRepositories, type RuntimeRepositories } from '@/platform/runtime/repositories'
import { recordResearchEvent } from '@/platform/observability/research-events'
import { sectorBenchmarkForTicker } from '@/features/stock-report/domain/benchmark'

export type WorkspaceLoadContext = {
  query: ParsedUrlQuery
  dataMode: ResearchDataMode
  repositories: RuntimeRepositories
}

export type WorkspaceLoadResult = {
  data: WorkspaceData
  responseData: unknown
  selectedTicker?: string
  selectedSlug?: string
}

export type WorkspacePageProps = {
  module: WorkspaceModule
  data: WorkspaceData
  shell: ShellMeta
  unavailableFields: UnavailableField[]
  deferredUnavailableFields: UnavailableField[]
  selectedTicker?: string
  selectedSlug?: string
}

type WorkspaceLoader = (context: WorkspaceLoadContext) => Promise<WorkspaceLoadResult>

const validModules = new Set<WorkspaceModule>([
  'overview',
  'rotation',
  'baskets',
  'basket-detail',
  'positioning',
  'crowding',
  'validation',
  'methodology',
  'korea-defense',
  'stock-report',
  'decision-log',
  'stock-pitch',
  'event-study',
  'paper-book',
  'risk-lens',
  'source-audit'
])

export async function loadWorkspacePage(
  query: ParsedUrlQuery,
  repositories = runtimeRepositories
): Promise<WorkspacePageProps> {
  const module = resolveWorkspaceModule(query)
  const dataMode = resolveResearchDataMode().mode
  const startedAt = Date.now()
  const result = await workspaceLoaders[module]({ query, dataMode, repositories })
  const response = createApiResponse(result.responseData)
  recordResearchEvent({
    event: 'workspace_loader',
    module,
    dataMode,
    status: 'succeeded',
    durationMs: Date.now() - startedAt,
    coveragePercent: response.coverage.coveragePercent,
    unavailableCount: response.unavailableFields.length,
    deferredUnavailableCount: response.deferredUnavailableFields.length
  })
  return compactOptionalProps({
    module,
    data: result.data,
    shell: createShellMeta(response),
    unavailableFields: response.unavailableFields,
    deferredUnavailableFields: response.deferredUnavailableFields,
    selectedTicker: result.selectedTicker,
    selectedSlug: result.selectedSlug
  })
}

export function resolveWorkspaceModule(query: ParsedUrlQuery): WorkspaceModule {
  const requested = queryString(query.module) || 'overview'
  const requestedSlug = queryString(query.slug)
  if (requested === 'baskets' && requestedSlug) return 'basket-detail'
  return validModules.has(requested as WorkspaceModule) ? requested as WorkspaceModule : 'overview'
}

export const workspaceLoaders: Record<WorkspaceModule, WorkspaceLoader> = {
  overview: loadOverview,
  rotation: loadRotation,
  baskets: loadBaskets,
  'basket-detail': loadBasketDetail,
  positioning: loadPositioning,
  crowding: loadCrowding,
  validation: loadValidation,
  methodology: loadMethodology,
  'korea-defense': loadKoreaDefense,
  'stock-report': loadStockReport,
  'decision-log': loadDecisionLog,
  'stock-pitch': loadStockPitch,
  'event-study': loadEventStudy,
  'paper-book': loadPaperBook,
  'risk-lens': loadRiskLens,
  'source-audit': loadSourceAudit
}

async function loadOverview({ repositories }: WorkspaceLoadContext): Promise<WorkspaceLoadResult> {
  const summary = await repositories.research.getHomeSummary()
  const rotations = summary.rotations
    .slice()
    .sort((a, b) => (b.return20d.value ?? -Infinity) - (a.return20d.value ?? -Infinity))
    .slice(0, 16)
  const crowding = summary.crowding
    .slice()
    .sort((a, b) => (b.crowdingScore.value ?? -Infinity) - (a.crowdingScore.value ?? -Infinity))
    .slice(0, 20)
  const selectedTicker = selectPriceTicker(rotations.map(row => row.ticker))
  const data = {
    rotations,
    baskets: summary.baskets,
    crowding,
    prices: await scopedSourcedPrices(repositories, selectedTicker)
  }
  return { data, responseData: data, selectedTicker }
}

async function loadRotation({ repositories }: WorkspaceLoadContext): Promise<WorkspaceLoadResult> {
  const rotations = await repositories.research.getRotationRows()
  const selectedTicker = selectPriceTicker(rotations
    .slice()
    .sort((a, b) => (b.relativeStrengthVsSpy20d.value ?? -Infinity) - (a.relativeStrengthVsSpy20d.value ?? -Infinity))
    .map(row => row.ticker))
  return {
    data: { rotations, prices: await scopedSourcedPrices(repositories, selectedTicker) },
    responseData: { rotations },
    selectedTicker
  }
}

async function loadBaskets({ repositories }: WorkspaceLoadContext): Promise<WorkspaceLoadResult> {
  const baskets = await repositories.research.getBasketSummaries()
  return { data: { baskets }, responseData: { baskets } }
}

async function loadBasketDetail({ query, repositories }: WorkspaceLoadContext): Promise<WorkspaceLoadResult> {
  const selectedSlug = queryString(query.slug)
  const [detail, positioningRows] = await Promise.all([
    repositories.research.getBasketDetail(selectedSlug),
    repositories.research.getPositioningRows()
  ])
  const tickers = new Set(detail.members.map(member => member.ticker))
  const selectedTicker = selectPriceTicker(detail.members.map(member => member.ticker))
  const data: WorkspaceData = {
    basketSummary: detail.summary,
    basketSignals: detail.members.map(member => member.signal),
    basketCrowding: detail.members.map(member => member.crowding),
    positioning: positioningRows.filter(row => tickers.has(row.ticker)),
    prices: await scopedSourcedPrices(repositories, selectedTicker)
  }
  return { data, responseData: data, selectedTicker, selectedSlug }
}

async function loadPositioning({ repositories }: WorkspaceLoadContext): Promise<WorkspaceLoadResult> {
  const positioning = await repositories.research.getPositioningRows()
  return { data: { positioning }, responseData: { positioning }, selectedTicker: positioning[0]?.ticker }
}

async function loadCrowding({ repositories }: WorkspaceLoadContext): Promise<WorkspaceLoadResult> {
  const crowding = await repositories.research.getCrowdingRows()
  return { data: { crowding }, responseData: { crowding }, selectedTicker: crowding[0]?.ticker }
}

async function loadValidation({ repositories }: WorkspaceLoadContext): Promise<WorkspaceLoadResult> {
  const validation = await repositories.research.getValidationRows()
  return { data: { validation }, responseData: { validation } }
}

async function loadEventStudy({ repositories }: WorkspaceLoadContext): Promise<WorkspaceLoadResult> {
  const events = repositories.generated.getEvents()
  const eventReturns = repositories.generated.getEventReturns()
  const assets = repositories.generated.getAssets()
  const eventTickers = new Set([
    ...events.flatMap(event => event.affectedAssets),
    'SPY', 'EWY', 'ITA', 'XAR', 'SMH'
  ])
  const prices = repositories.generated.getPrices(eventTickers, 260)
  const data = { events, eventReturns, assets, prices }
  return { data, responseData: data }
}

async function loadPaperBook({ repositories }: WorkspaceLoadContext): Promise<WorkspaceLoadResult> {
  const portfolioDecisions = await repositories.decisions.listInvestmentDecisions()
  const pmEngine = await repositories.pm.buildPmEngineView(portfolioDecisions)
  const data = { portfolioDecisions, pmEngine }
  return { data, responseData: data }
}

async function loadRiskLens({ query, repositories }: WorkspaceLoadContext): Promise<WorkspaceLoadResult> {
  const requestedTicker = normalizeTickerSymbol(query.ticker)
  const rotations = await repositories.research.getRotationRows()
  const focusTickers = [
    isValidTickerSymbol(requestedTicker) ? requestedTicker : null,
    ...rotations
      .slice()
      .sort((a, b) => (b.relativeStrengthVsSpy20d.value ?? -Infinity) - (a.relativeStrengthVsSpy20d.value ?? -Infinity))
      .map(row => row.ticker)
  ].filter((ticker): ticker is string => Boolean(ticker))
  const riskLens = await repositories.risk.buildRiskLensRows(focusTickers, rotations)
  const selectedTicker = isValidTickerSymbol(requestedTicker) ? requestedTicker : riskLens[0]?.ticker ?? 'NVDA'
  return { data: { rotations, riskLens }, responseData: { riskLens }, selectedTicker }
}

async function loadSourceAudit({ repositories }: WorkspaceLoadContext): Promise<WorkspaceLoadResult> {
  const generatedAudit = repositories.generated.getSourceAudit()
  const providerRun = await repositories.providerRuns.getAudit()
  const providerRunNote = providerRun.latestAttemptAt
    ? `Latest ${providerRun.provider ?? 'provider'} ${providerRun.dataset ?? 'dataset'} run: ${providerRun.latestStatus}; ${providerRun.rowsIngested} rows.`
    : 'Provider-run history unavailable.'
  const sourceAudit = {
    ...generatedAudit,
    lastSuccessfulRefreshAt: providerRun.lastSuccessfulAt ?? generatedAudit.lastSuccessfulRefreshAt,
    notes: [...generatedAudit.notes, providerRunNote]
  }
  return { data: { sourceAudit }, responseData: { sourceAudit } }
}

async function loadMethodology(): Promise<WorkspaceLoadResult> {
  return { data: {}, responseData: {} }
}

async function loadKoreaDefense({ repositories }: WorkspaceLoadContext): Promise<WorkspaceLoadResult> {
  const [basket, rotations, crowdingRows] = await Promise.all([
    repositories.research.getBasketDetail('korea-indo-pacific'),
    repositories.research.getRotationRows(),
    repositories.research.getCrowdingRows()
  ])
  const memberTickers = new Set(basket.members.map(member => member.ticker))
  const rotationsForTheme = rotations.filter(row => memberTickers.has(row.ticker) || ['EWY', 'ITA', 'XAR', 'SMH'].includes(row.ticker))
  const crowding = crowdingRows.filter(row => memberTickers.has(row.ticker))
  const events = repositories.generated.getEvents()
    .filter(event => event.affectedThemes.some(theme => theme.toLowerCase().includes('defense')) || event.category.includes('DEFENSE'))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12)
  const selectedTicker = selectPriceTicker(rotationsForTheme.map(row => row.ticker))
  return {
    data: { rotations: rotationsForTheme, crowding, events, prices: await scopedSourcedPrices(repositories, selectedTicker) },
    responseData: { rotations: rotationsForTheme, crowding },
    selectedTicker
  }
}

async function loadStockReport({ query, repositories }: WorkspaceLoadContext): Promise<WorkspaceLoadResult> {
  const requestedTicker = normalizeTickerSymbol(query.ticker)
  const selectedTicker = isValidTickerSymbol(requestedTicker) ? requestedTicker : 'NVDA'
  const report = await repositories.research.getStockReport(selectedTicker)
  return {
    data: { report, prices: await scopedSourcedPrices(repositories, selectedTicker) },
    responseData: { report },
    selectedTicker
  }
}

async function loadDecisionLog({ query, repositories }: WorkspaceLoadContext): Promise<WorkspaceLoadResult> {
  const requestedTicker = normalizeTickerSymbol(query.ticker)
  const decisions = await repositories.decisions.listInvestmentDecisionSummaries()
  const requestedSlug = queryString(query.slug)
  let activeDecision = requestedSlug ? await repositories.decisions.getInvestmentDecision(requestedSlug) : null
  if (!activeDecision && queryString(query.new) === '1') {
    activeDecision = await repositories.decisions.buildInvestmentDecisionTemplate(isValidTickerSymbol(requestedTicker) ? requestedTicker : 'NVDA')
  }
  if (!activeDecision && isValidTickerSymbol(requestedTicker)) {
    const match = decisions.find(row => row.ticker === requestedTicker)
    activeDecision = match
      ? await repositories.decisions.getInvestmentDecision(match.slug)
      : await repositories.decisions.buildInvestmentDecisionTemplate(requestedTicker)
  }
  activeDecision = activeDecision ?? (decisions[0]
    ? await repositories.decisions.getInvestmentDecision(decisions[0].slug)
    : await repositories.decisions.buildInvestmentDecisionTemplate('NVDA'))
  const selectedTicker = activeDecision?.ticker ?? 'NVDA'
  return {
    data: { decisions, decision: activeDecision ?? undefined },
    responseData: { decisions, decision: activeDecision },
    selectedTicker
  }
}

async function loadStockPitch({ query, repositories }: WorkspaceLoadContext): Promise<WorkspaceLoadResult> {
  const requestedSlug = queryString(query.slug)
  const requestedTicker = normalizeTickerSymbol(query.ticker)
  const pitches = await repositories.pitches.listStockPitchSummaries()
  let activePitch = requestedSlug ? await repositories.pitches.getStockPitch(requestedSlug) : null
  if (!activePitch && isValidTickerSymbol(requestedTicker)) {
    const match = pitches.find(row => row.ticker === requestedTicker)
    activePitch = match ? await repositories.pitches.getStockPitch(match.slug) : null
  }
  activePitch = activePitch ?? await repositories.pitches.getDefaultStockPitch()
  const selectedTicker = isValidTickerSymbol(requestedTicker) ? requestedTicker : activePitch.ticker
  const report = await repositories.research.getStockReport(selectedTicker)
  const [baseSourceSnapshot, sourcedPrices] = await Promise.all([
    repositories.pitches.buildStockPitchSourceSnapshot(selectedTicker, report),
    repositories.pitches.getSourcedPriceSeries(selectedTicker)
  ])
  const sourceSnapshot = {
    ...baseSourceSnapshot,
    targetConfidence: repositories.pitches.buildTargetConfidence({
      report,
      sourceSnapshot: baseSourceSnapshot,
      currentPrice: activePitch.pitch.setup.currentPrice,
      targetPrice: activePitch.pitch.setup.targetPrice,
      expectedReturn: activePitch.pitch.setup.expectedReturn
    })
  }
  return {
    data: {
      pitches,
      pitch: activePitch,
      pitchCreateTicker: selectedTicker,
      pitchSource: sourceSnapshot,
      prices: sourcedPrices
    },
    responseData: { pitches, pitch: activePitch, report, sourceSnapshot, prices: sourcedPrices },
    selectedTicker
  }
}

function selectPriceTicker(candidates: string[]) {
  return candidates.find(Boolean) ?? candidates[0]
}

async function scopedSourcedPrices(repositories: RuntimeRepositories, ticker: string | undefined) {
  if (!ticker) return []
  const tickers = new Set([ticker, 'SPY', sectorBenchmarkForTicker(ticker)])
  const series = await Promise.all(Array.from(tickers).map(async symbol => sourcedPriceRows(
    await repositories.pitches.getSourcedPriceSeries(symbol, 260)
  )))
  return series.flat()
}

function sourcedPriceRows(points: Awaited<ReturnType<RuntimeRepositories['pitches']['getSourcedPriceSeries']>>) {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date)).slice(-260)
  const anchor = sorted.find(point => point.price > 0)?.price ?? null
  return sorted.map(point => ({
    date: point.date,
    ticker: point.ticker,
    price: point.price,
    returnValue: anchor ? ((point.price - anchor) / anchor) * 100 : 0
  }))
}

function queryString(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : ''
}

function compactOptionalProps(props: WorkspacePageProps): WorkspacePageProps {
  if (!props.selectedTicker) delete props.selectedTicker
  if (!props.selectedSlug) delete props.selectedSlug
  return props
}
