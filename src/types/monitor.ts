import type { Asset, SourceQualityLabel } from './asset'

export type MonitorWindow = '7D' | '30D' | '90D' | 'YTD' | '1Y'

export type MonitorTab = {
  id: string
  label: string
  description: string
  tickers: string[]
}

export type MonitorAsset = Pick<
  Asset,
  | 'ticker'
  | 'name'
  | 'assetClass'
  | 'country'
  | 'sector'
  | 'group'
  | 'sleeve'
  | 'sourceQuality'
  | 'provider'
  | 'dataQuality'
> & {
  latestDate: string | null
  latestPrice: number | null
  usable: boolean
  tradingViewSymbol?: string
}

export type MonitorSeries = {
  ticker: string
  name: string
  color: string
  sourceQuality: SourceQualityLabel
  provider: string
  latestDate: string | null
  latestMove: number | null
  moveMode: 'percent' | 'level'
  points: {
    date: string
    value: number
    price: number
  }[]
}

export type MonitorTableRow = {
  ticker: string
  name: string
  pairLabel: string
  sourceQuality: SourceQualityLabel
  provider: string
  latestDate: string | null
  moveMode: 'percent' | 'level'
  moves: Record<'7D' | '30D' | '1Y', number | null>
  usable: boolean
  tradingViewSymbol?: string
}

export type MonitorFreshness = {
  generatedAt: string | null
  lastSuccessfulRefreshAt: string | null
  nextScheduledRefreshAt: string | null
  staleCount: number
  status: 'fresh' | 'stale' | 'unknown'
  providers: {
    provider: string
    status: string
    records: number
    retrievedAt: string | null
    freshnessStatus: 'fresh' | 'stale' | 'unknown'
    ageHours: number | null
    staleAfterHours: number | null
  }[]
}

export type MonitorPriceResponse = {
  window: MonitorWindow
  windows: MonitorWindow[]
  assets: MonitorAsset[]
  series: MonitorSeries[]
  tableRows: MonitorTableRow[]
  chartData: Record<string, string | number | null>[]
  latestDate: string | null
  freshness: MonitorFreshness
}
