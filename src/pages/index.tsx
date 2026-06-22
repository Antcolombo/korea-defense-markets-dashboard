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
import {
  getBasketDetail,
  getBasketSummaries,
  getCrowdingRows,
  getDailyNote,
  getHomeSummary,
  getPositioningRows,
  getRotationRows,
  getStockReport,
  getValidationRows,
  isValidTickerSymbol,
  normalizeTickerSymbol
} from '@/lib/research/repository'

type Props = {
  module: WorkspaceModule
  data: WorkspaceData
  shell: ShellMeta
  unavailableFields: UnavailableField[]
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
  'daily-note',
  'validation',
  'methodology',
  'korea-defense',
  'stock-report'
])

export const getServerSideProps: GetServerSideProps<Props> = async context => {
  const requested = typeof context.query.module === 'string' ? context.query.module : 'overview'
  const module = validModules.has(requested as WorkspaceModule) ? requested as WorkspaceModule : 'overview'
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
      note: summary.note,
    }
    selectedTicker = selectPriceTicker(allPrices, rotations.map(row => row.ticker))
    data.prices = scopedPrices(allPrices, selectedTicker)
    responseData = data
  }

  if (module === 'rotation') {
    const rotations = await getRotationRows()
    selectedTicker = selectPriceTicker(
      allPrices,
      rotations
        .slice()
        .sort((a, b) => (b.relativeStrengthVsSpy20d.value ?? -Infinity) - (a.relativeStrengthVsSpy20d.value ?? -Infinity))
        .map(row => row.ticker)
    )
    data = { rotations, prices: scopedPrices(allPrices, selectedTicker) }
    responseData = { rotations }
  }

  if (module === 'baskets') {
    const baskets = await getBasketSummaries()
    data = { baskets }
    responseData = { baskets }
  }

  if (module === 'basket-detail') {
    selectedSlug = typeof context.query.slug === 'string' ? context.query.slug : ''
    const [detail, positioningRows] = await Promise.all([getBasketDetail(selectedSlug), getPositioningRows()])
    const tickers = new Set(detail.members.map(member => member.ticker))
    data = {
      basketSummary: detail.summary,
      basketSignals: detail.members.map(member => member.signal),
      basketCrowding: detail.members.map(member => member.crowding),
      positioning: positioningRows.filter(row => tickers.has(row.ticker))
    }
    selectedTicker = selectPriceTicker(allPrices, detail.members.map(member => member.ticker))
    data.prices = scopedPrices(allPrices, selectedTicker)
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

  if (module === 'daily-note') {
    const note = await getDailyNote()
    data = { note }
    responseData = { note }
  }

  if (module === 'validation') {
    const validation = await getValidationRows()
    data = { validation }
    responseData = { validation }
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
    selectedTicker = selectPriceTicker(allPrices, rotationsForTheme.map(row => row.ticker))
    data = { rotations: rotationsForTheme, crowding, events, prices: scopedPrices(allPrices, selectedTicker) }
    responseData = { rotations: rotationsForTheme, crowding }
  }

  if (module === 'stock-report') {
    const ticker = normalizeTickerSymbol(context.query.ticker)
    selectedTicker = isValidTickerSymbol(ticker) ? ticker : 'NVDA'
    const report = await getStockReport(selectedTicker)
    data = { report }
    responseData = { report }
  }

  const response = createApiResponse(responseData)
  const props: Props = {
    module,
    data,
    shell: createShellMeta(response),
    unavailableFields: response.unavailableFields
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
        <meta name="description" content="Single-workspace market terminal for sourced flow, positioning, crowding, validation, and PM reports." />
      </Head>
      <TerminalWorkspace {...props} />
    </>
  )
}

export default WorkspacePage

function selectPriceTicker(prices: ReturnType<typeof getPrices>, candidates: string[]) {
  const available = new Set(prices.map(point => point.ticker))
  return candidates.find(ticker => available.has(ticker)) ?? candidates[0]
}

function scopedPrices(prices: ReturnType<typeof getPrices>, ticker: string | undefined) {
  if (!ticker) return []
  return prices
    .filter(point => point.ticker === ticker)
    .slice(-180)
    .map(point => ({
      date: point.date,
      ticker: point.ticker,
      price: point.price
    }))
}
