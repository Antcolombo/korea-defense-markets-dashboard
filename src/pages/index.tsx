import Head from 'next/head'
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import {
  TerminalWorkspace,
  type WorkspaceData,
  type WorkspaceModule
} from '@/components/terminal/terminal-workspace'
import { createApiResponse, createShellMeta, type ShellMeta, type UnavailableField } from '@/lib/research/api'
import { getEvents } from '@/lib/data/getEvents'
import { getPrices } from '@/lib/data/getPrices'
import { getAssets } from '@/lib/data/getAssets'
import { getEventReturns } from '@/lib/data/getEventReturns'
import { getSourceAudit } from '@/lib/data/getSourceAudit'
import {
  getBasketDetail,
  getBasketSummaries,
  getCrowdingRows,
  getHomeSummary,
  getPositioningRows,
  getRotationRows,
  getStockReport,
  getValidationRows,
  isValidTickerSymbol,
  normalizeTickerSymbol
} from '@/lib/research/repository'
import { buildRiskLensRows } from '@/lib/research/riskLens'
import {
  getDefaultStockPitch,
  getStockPitch,
  listStockPitchSummaries
} from '@/lib/research/pitches'
import {
  buildInvestmentDecisionTemplate,
  getInvestmentDecision,
  listInvestmentDecisions,
  listInvestmentDecisionSummaries
} from '@/lib/research/decisions'
import { buildStockPitchSourceSnapshot, getSourcedPriceSeries } from '@/lib/research/stockPitchSources'
import { buildTargetConfidence } from '@/lib/research/targetConfidence'
import { buildPmEngineView } from '@/lib/research/pm'

type Props = {
  module: WorkspaceModule
  data: WorkspaceData
  shell: ShellMeta
  unavailableFields: UnavailableField[]
  deferredUnavailableFields: UnavailableField[]
  selectedTicker?: string
  selectedSlug?: string
}

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

export const getServerSideProps: GetServerSideProps<Props> = async context => {
  const requested = typeof context.query.module === 'string' ? context.query.module : 'overview'
  const requestedSlug = typeof context.query.slug === 'string' ? context.query.slug : ''
  const module = requested === 'baskets' && requestedSlug
    ? 'basket-detail'
    : validModules.has(requested as WorkspaceModule) ? requested as WorkspaceModule : 'overview'
  const allPrices = getPrices()
  let data: WorkspaceData = {}
  let responseData: unknown = data
  let selectedTicker: string | undefined
  let selectedSlug: string | undefined

  if (module === 'overview') {
    const summary = await getHomeSummary()
    const rotations = summary.rotations
      .slice()
      .sort((a, b) => (b.return20d.value ?? -Infinity) - (a.return20d.value ?? -Infinity))
      .slice(0, 16)
    const crowding = summary.crowding
      .slice()
      .sort((a, b) => (b.crowdingScore.value ?? -Infinity) - (a.crowdingScore.value ?? -Infinity))
      .slice(0, 20)
    data = {
      rotations,
      baskets: summary.baskets,
      crowding,
    }
    selectedTicker = selectPriceTicker(rotations.map(row => row.ticker))
    data.prices = await scopedSourcedPrices(selectedTicker)
    responseData = data
  }

  if (module === 'rotation') {
    const rotations = await getRotationRows()
    selectedTicker = selectPriceTicker(
      rotations
        .slice()
        .sort((a, b) => (b.relativeStrengthVsSpy20d.value ?? -Infinity) - (a.relativeStrengthVsSpy20d.value ?? -Infinity))
        .map(row => row.ticker)
    )
    data = { rotations, prices: await scopedSourcedPrices(selectedTicker) }
    responseData = { rotations }
  }

  if (module === 'baskets') {
    const baskets = await getBasketSummaries()
    data = { baskets }
    responseData = { baskets }
  }

  if (module === 'basket-detail') {
    selectedSlug = requestedSlug
    const [detail, positioningRows] = await Promise.all([getBasketDetail(selectedSlug), getPositioningRows()])
    const tickers = new Set(detail.members.map(member => member.ticker))
    data = {
      basketSummary: detail.summary,
      basketSignals: detail.members.map(member => member.signal),
      basketCrowding: detail.members.map(member => member.crowding),
      positioning: positioningRows.filter(row => tickers.has(row.ticker))
    }
    selectedTicker = selectPriceTicker(detail.members.map(member => member.ticker))
    data.prices = await scopedSourcedPrices(selectedTicker)
    responseData = data
  }

  if (module === 'positioning') {
    const positioning = await getPositioningRows()
    data = { positioning }
    responseData = { positioning }
    selectedTicker = positioning[0]?.ticker
  }

  if (module === 'crowding') {
    const crowding = await getCrowdingRows()
    data = { crowding }
    responseData = { crowding }
    selectedTicker = crowding[0]?.ticker
  }

  if (module === 'validation') {
    const validation = await getValidationRows()
    data = { validation }
    responseData = { validation }
  }

  if (module === 'event-study') {
    const events = getEvents()
    const eventReturns = getEventReturns()
    const assets = getAssets()
    data = { events, eventReturns, assets, prices: allPrices }
    responseData = { events, eventReturns, assets, prices: allPrices }
  }

  if (module === 'paper-book') {
    const portfolioDecisions = await listInvestmentDecisions()
    const pmEngine = await buildPmEngineView(portfolioDecisions)
    data = { portfolioDecisions, pmEngine }
    responseData = { portfolioDecisions, pmEngine }
  }

  if (module === 'risk-lens') {
    const requestedRiskTicker = normalizeTickerSymbol(context.query.ticker)
    const rotations = await getRotationRows()
    const focusTickers = [
      isValidTickerSymbol(requestedRiskTicker) ? requestedRiskTicker : null,
      ...rotations
        .slice()
        .sort((a, b) => (b.relativeStrengthVsSpy20d.value ?? -Infinity) - (a.relativeStrengthVsSpy20d.value ?? -Infinity))
        .map(row => row.ticker)
    ].filter((ticker): ticker is string => Boolean(ticker))
    const riskLens = await buildRiskLensRows(focusTickers, rotations)
    selectedTicker = isValidTickerSymbol(requestedRiskTicker) ? requestedRiskTicker : riskLens[0]?.ticker ?? 'NVDA'
    data = { rotations, riskLens }
    responseData = { riskLens }
  }

  if (module === 'source-audit') {
    const sourceAudit = getSourceAudit()
    data = { sourceAudit }
    responseData = { sourceAudit }
  }

  if (module === 'methodology') {
    data = {}
    responseData = {}
  }

  if (module === 'korea-defense') {
    const [basket, rotations, crowdingRows] = await Promise.all([
      getBasketDetail('korea-indo-pacific'),
      getRotationRows(),
      getCrowdingRows()
    ])
    const memberTickers = new Set(basket.members.map(member => member.ticker))
    const rotationsForTheme = rotations.filter(row => memberTickers.has(row.ticker) || ['EWY', 'ITA', 'XAR', 'SMH'].includes(row.ticker))
    const crowding = crowdingRows.filter(row => memberTickers.has(row.ticker))
    const events = getEvents()
      .filter(event => event.affectedThemes.some(theme => theme.toLowerCase().includes('defense')) || event.category.includes('DEFENSE'))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 12)
    selectedTicker = selectPriceTicker(rotationsForTheme.map(row => row.ticker))
    data = { rotations: rotationsForTheme, crowding, events, prices: await scopedSourcedPrices(selectedTicker) }
    responseData = { rotations: rotationsForTheme, crowding }
  }

  if (module === 'stock-report') {
    const ticker = normalizeTickerSymbol(context.query.ticker)
    selectedTicker = isValidTickerSymbol(ticker) ? ticker : 'NVDA'
    const report = await getStockReport(selectedTicker)
    data = { report, prices: await scopedSourcedPrices(selectedTicker) }
    responseData = { report }
  }

  if (module === 'decision-log') {
    const requestedDecisionTicker = normalizeTickerSymbol(context.query.ticker)
    const decisions = await listInvestmentDecisionSummaries()
    let activeDecision = typeof context.query.slug === 'string' ? await getInvestmentDecision(context.query.slug) : null
    if (!activeDecision && context.query.new === '1') {
      activeDecision = await buildInvestmentDecisionTemplate(isValidTickerSymbol(requestedDecisionTicker) ? requestedDecisionTicker : 'NVDA')
    }
    if (!activeDecision && isValidTickerSymbol(requestedDecisionTicker)) {
      const match = decisions.find(row => row.ticker === requestedDecisionTicker)
      activeDecision = match ? await getInvestmentDecision(match.slug) : await buildInvestmentDecisionTemplate(requestedDecisionTicker)
    }
    activeDecision = activeDecision ?? (decisions[0] ? await getInvestmentDecision(decisions[0].slug) : await buildInvestmentDecisionTemplate('NVDA'))
    selectedTicker = activeDecision?.ticker ?? 'NVDA'
    data = { decisions, decision: activeDecision ?? undefined }
    responseData = { decisions, decision: activeDecision }
  }

  if (module === 'stock-pitch') {
    const slug = typeof context.query.slug === 'string' ? context.query.slug : ''
    const requestedPitchTicker = normalizeTickerSymbol(context.query.ticker)
    const pitches = await listStockPitchSummaries()
    let activePitch = slug ? await getStockPitch(slug) : null
    if (!activePitch && isValidTickerSymbol(requestedPitchTicker)) {
      const match = pitches.find(row => row.ticker === requestedPitchTicker)
      activePitch = match ? await getStockPitch(match.slug) : null
    }
    activePitch = activePitch ?? await getDefaultStockPitch()
    selectedTicker = isValidTickerSymbol(requestedPitchTicker) ? requestedPitchTicker : activePitch.ticker
    const report = await getStockReport(selectedTicker)
    const [baseSourceSnapshot, sourcedPrices] = await Promise.all([
      buildStockPitchSourceSnapshot(selectedTicker, report),
      getSourcedPriceSeries(selectedTicker)
    ])
    const sourceSnapshot = {
      ...baseSourceSnapshot,
      targetConfidence: buildTargetConfidence({
        report,
        sourceSnapshot: baseSourceSnapshot,
        currentPrice: activePitch.pitch.setup.currentPrice,
        targetPrice: activePitch.pitch.setup.targetPrice,
        expectedReturn: activePitch.pitch.setup.expectedReturn
      })
    }
    data = {
      pitches,
      pitch: activePitch,
      pitchCreateTicker: selectedTicker,
      pitchSource: sourceSnapshot,
      prices: sourcedPrices
    }
    responseData = { pitches, pitch: activePitch, report, sourceSnapshot, prices: sourcedPrices }
  }

  const response = createApiResponse(responseData)
  const props: Props = {
    module,
    data,
    shell: createShellMeta(response),
    unavailableFields: response.unavailableFields,
    deferredUnavailableFields: response.deferredUnavailableFields
  }
  if (selectedTicker) props.selectedTicker = selectedTicker
  if (selectedSlug) props.selectedSlug = selectedSlug
  return {
    props
  }
}

export function WorkspacePage(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>LIQUIDCHAIN Market Terminal</title>
        <meta name="description" content="Single-workspace PM research terminal for sourced pitches, decision journal, event studies, validation, paper book, risk, and source audit." />
      </Head>
      <TerminalWorkspace {...props} />
    </>
  )
}

export default WorkspacePage

function selectPriceTicker(candidates: string[]) {
  return candidates.find(Boolean) ?? candidates[0]
}

async function scopedSourcedPrices(ticker: string | undefined) {
  if (!ticker) return []
  const tickers = new Set([ticker, 'SPY', 'ITA', 'XAR', 'SMH', 'XLK', 'XLI', 'XLE', 'XLF'])
  const series = await Promise.all(Array.from(tickers).map(async symbol => sourcedPriceRows(await getSourcedPriceSeries(symbol, 260))))
  return series.flat()
}

function sourcedPriceRows(points: Awaited<ReturnType<typeof getSourcedPriceSeries>>) {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date)).slice(-260)
  const anchor = sorted.find(point => point.price > 0)?.price ?? null
  return sorted.map(point => ({
    date: point.date,
    ticker: point.ticker,
    price: point.price,
    returnValue: anchor ? ((point.price - anchor) / anchor) * 100 : 0
  }))
}
