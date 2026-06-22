import type { Asset } from '@/types/asset'
import type { PricePoint } from '@/types/market'
import type {
  MonitorAsset,
  MonitorFreshness,
  MonitorPriceResponse,
  MonitorSeries,
  MonitorTab,
  MonitorTableRow,
  MonitorWindow
} from '@/types/monitor'
import type { SourceAudit } from '@/lib/data/getSourceAudit'
import { getTradingViewSymbol } from '@/lib/tradingView'

export const MONITOR_WINDOWS: MonitorWindow[] = ['7D', '30D', '90D', 'YTD', '1Y']

export const DEFAULT_MONITOR_TICKERS = [
  'EWY',
  'KOSPI',
  '005930.KS',
  '000660.KS',
  '012450.KS',
  '079550.KS',
  '047810.KS',
  '064350.KS',
  '042660.KS',
  'SOXX',
  'SMH',
  'NVDA',
  'TSM',
  'MU'
]

export const MONITOR_TABS: MonitorTab[] = [
  {
    id: 'today',
    label: 'Today',
    description: 'Core Korea risk monitor: FX, beta, semis, and liquid expressions.',
    tickers: ['USDKRW', 'EWY', 'QQQ', 'SOXX', 'SMH', 'NVDA', 'TSM', 'MU', 'NOC', 'LMT']
  },
  {
    id: 'korea',
    label: 'Korea',
    description: 'Korea local and U.S.-listed expression pack.',
    tickers: DEFAULT_MONITOR_TICKERS
  },
  {
    id: 'semis',
    label: 'Semis',
    description: 'Semis tape against Korea memory bellwethers.',
    tickers: ['SOXX', 'SMH', 'NVDA', 'TSM', 'MU', 'AMD', 'AVGO', '005930.KS', '000660.KS']
  },
  {
    id: 'defense',
    label: 'Defense',
    description: 'Korea defense exporters against U.S. A&D proxies.',
    tickers: ['012450.KS', '079550.KS', '047810.KS', '064350.KS', '042660.KS', 'LMT', 'RTX', 'NOC', 'GD', 'HII', 'ITA', 'XAR']
  },
  {
    id: 'wall-street',
    label: 'Wall Street',
    description: 'U.S.-listed ETFs, semis, and defense stocks.',
    tickers: ['SPX', 'QQQ', 'EWY', 'SOXX', 'SMH', 'NVDA', 'TSM', 'MU', 'LMT', 'NOC', 'HII']
  },
  {
    id: 'markets',
    label: 'Markets',
    description: 'All broad price-board expressions with sourced rows where available.',
    tickers: ['SPX', 'QQQ', 'DXY', 'US2Y', 'USDKRW', 'KR10Y', 'EWY', 'KOSPI', 'KOSDAQ', 'SMH']
  },
  {
    id: 'yield',
    label: 'Yield',
    description: 'Rates, FX, and KRW pressure context. These are level moves.',
    tickers: ['USDKRW', 'DXY', 'US2Y', 'US10Y', 'KR10Y', 'VIX', 'GOLD', 'OIL']
  },
  {
    id: 'energy',
    label: 'Energy',
    description: 'Oil, Brent, gasoline, and energy ETF expressions.',
    tickers: ['OIL', 'BRENT', 'GASOLINE', 'USO', 'BNO', 'XLE', 'XOP', 'OIH']
  },
  {
    id: 'ecosystem',
    label: 'Ecosystem',
    description: 'Coverage breadth: sources, companies, ideas, and provider gaps.',
    tickers: ['EWY', 'KOSPI', 'KOSDAQ', '005930.KS', '000660.KS', '012450.KS', '042660.KS', 'USDKRW']
  },
  {
    id: 'research',
    label: 'Research',
    description: 'Default research expressions for memo promotion.',
    tickers: ['EWY', 'SOXX', 'SMH', 'NVDA', 'TSM', 'MU', 'LMT', 'NOC', 'HII', 'USDKRW']
  }
]

const MONITOR_COLORS = [
  '#79f3df',
  '#ff9f2d',
  '#6f8cff',
  '#9b58ff',
  '#ff6565',
  '#ffe46f',
  '#7cbfff',
  '#35d07f',
  '#ff7ac8',
  '#c7ff7a',
  '#9aa6b2',
  '#ffffff'
]

type PriceRow = {
  date: string
  price: number
}

export function normalizeMonitorWindow(value: string | string[] | undefined): MonitorWindow {
  const raw = Array.isArray(value) ? value[0] : value
  return MONITOR_WINDOWS.includes(raw as MonitorWindow) ? raw as MonitorWindow : '30D'
}

export function parseMonitorTickers(value: string | string[] | undefined, fallback = DEFAULT_MONITOR_TICKERS) {
  const raw = Array.isArray(value) ? value.join(',') : value
  const tickers = raw?.split(',').map(item => item.trim()).filter(Boolean) ?? []
  return tickers.length > 0 ? Array.from(new Set(tickers)) : fallback
}

export function getMonitorTab(tabId: string | undefined) {
  return MONITOR_TABS.find(tab => tab.id === tabId) ?? MONITOR_TABS[0]
}

export function latestPriceByTicker(prices: PricePoint[]) {
  const latest = new Map<string, PricePoint>()
  for (const point of prices) {
    const current = latest.get(point.ticker)
    if (!current || point.date.localeCompare(current.date) > 0) latest.set(point.ticker, point)
  }
  return latest
}

export function buildMonitorAssets(assets: Asset[], prices: PricePoint[]): MonitorAsset[] {
  const latest = latestPriceByTicker(prices)
  return assets.map(asset => {
    const price = latest.get(asset.ticker)
    const tradingViewSymbol = asset.tradingViewSymbol ?? getTradingViewSymbol(asset.ticker)
    return {
      ticker: asset.ticker,
      name: asset.name,
      assetClass: asset.assetClass,
      country: asset.country,
      sector: asset.sector,
      group: asset.group,
      sleeve: asset.sleeve,
      sourceQuality: asset.sourceQuality,
      provider: asset.provider,
      dataQuality: asset.dataQuality,
      latestDate: price?.date ?? null,
      latestPrice: price?.price ?? null,
      usable: asset.dataQuality === 'source' && Boolean(price),
      tradingViewSymbol
    }
  })
}

export function buildMonitorFreshness(audit: SourceAudit | null | undefined): MonitorFreshness {
  const staleCount = audit?.freshnessWarnings?.length ?? 0
  return {
    generatedAt: audit?.generatedAt ?? null,
    lastSuccessfulRefreshAt: audit?.lastSuccessfulRefreshAt ?? null,
    nextScheduledRefreshAt: audit?.nextScheduledRefreshAt ?? null,
    staleCount,
    status: !audit ? 'unknown' : staleCount > 0 ? 'stale' : audit.status === 'passed' ? 'fresh' : 'unknown',
    providers: (audit?.providers ?? []).map(provider => ({
      provider: provider.provider,
      status: provider.status,
      records: provider.records,
      retrievedAt: provider.retrievedAt ?? null,
      freshnessStatus: provider.freshnessStatus ?? 'unknown',
      ageHours: provider.ageHours ?? null,
      staleAfterHours: provider.staleAfterHours ?? null
    }))
  }
}

export function buildMonitorPriceResponse(args: {
  assets: Asset[]
  prices: PricePoint[]
  sourceAudit?: SourceAudit | null
  tickers: string[]
  window: MonitorWindow
}): MonitorPriceResponse {
  const assetMap = new Map(args.assets.map(asset => [asset.ticker, asset]))
  const requestedAssets = args.tickers.map(ticker => assetMap.get(ticker)).filter(Boolean) as Asset[]
  const allAssets = buildMonitorAssets(args.assets, args.prices)
  const priceMap = groupPrices(args.prices)
  const series = requestedAssets.map((asset, index) => buildSeries(asset, priceMap.get(asset.ticker) ?? [], args.window, MONITOR_COLORS[index % MONITOR_COLORS.length]))
  const tableRows = requestedAssets.map(asset => buildTableRow(asset, priceMap.get(asset.ticker) ?? []))
  const chartData = buildChartData(series)
  const latestDate = series.reduce<string | null>((latest, current) => {
    if (!current.latestDate) return latest
    if (!latest || current.latestDate.localeCompare(latest) > 0) return current.latestDate
    return latest
  }, null)

  return {
    window: args.window,
    windows: MONITOR_WINDOWS,
    assets: allAssets,
    series,
    tableRows,
    chartData,
    latestDate,
    freshness: buildMonitorFreshness(args.sourceAudit)
  }
}

export function windowedRows(rows: PriceRow[], window: MonitorWindow) {
  const sorted = rows.filter(row => row.date && Number.isFinite(row.price)).sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length <= 1) return sorted
  const latest = sorted[sorted.length - 1]
  if (window === 'YTD') {
    const year = latest.date.slice(0, 4)
    const ytd = sorted.filter(row => row.date.slice(0, 4) === year)
    return ytd.length > 1 ? ytd : sorted.slice(-30)
  }

  const days = window === '7D' ? 7 : window === '30D' ? 30 : window === '90D' ? 90 : 365
  const start = new Date(`${latest.date}T00:00:00Z`)
  start.setUTCDate(start.getUTCDate() - days)
  const startKey = start.toISOString().slice(0, 10)
  const filtered = sorted.filter(row => row.date >= startKey)
  if (filtered.length > 1) return filtered
  const fallbackCount = window === '7D' ? 7 : window === '30D' ? 30 : window === '90D' ? 90 : 252
  return sorted.slice(-fallbackCount)
}

export function moveModeForAsset(asset: Pick<Asset, 'assetClass' | 'sourceQuality'>): 'percent' | 'level' {
  return asset.assetClass === 'fx' || asset.assetClass === 'rate' ? 'level' : 'percent'
}

export function indexedMove(asset: Pick<Asset, 'assetClass' | 'sourceQuality'>, base: number, value: number) {
  if (!Number.isFinite(base) || !Number.isFinite(value)) return null
  if (moveModeForAsset(asset) === 'level') return Number((value - base).toFixed(2))
  if (base === 0) return 0
  return Number((((value - base) / base) * 100).toFixed(2))
}

function buildSeries(asset: Asset, rows: PriceRow[], window: MonitorWindow, color: string): MonitorSeries {
  const windowRows = windowedRows(rows, window)
  const base = windowRows[0]?.price
  const points = base === undefined ? [] : windowRows
    .map(row => {
      const value = indexedMove(asset, base, row.price)
      return value === null ? null : { date: row.date, value, price: row.price }
    })
    .filter(Boolean) as MonitorSeries['points']
  const latest = points[points.length - 1]
  return {
    ticker: asset.ticker,
    name: asset.name,
    color,
    sourceQuality: asset.sourceQuality,
    provider: asset.provider,
    latestDate: latest?.date ?? null,
    latestMove: latest?.value ?? null,
    moveMode: moveModeForAsset(asset),
    points
  }
}

function buildTableRow(asset: Asset, rows: PriceRow[]): MonitorTableRow {
  const moves = {
    '7D': moveForWindow(asset, rows, '7D'),
    '30D': moveForWindow(asset, rows, '30D'),
    '1Y': moveForWindow(asset, rows, '1Y')
  }
  const latest = rows[rows.length - 1]
  const tradingViewSymbol = asset.tradingViewSymbol ?? getTradingViewSymbol(asset.ticker)
  return {
    ticker: asset.ticker,
    name: asset.name,
    pairLabel: `KOREA/${asset.ticker}`,
    sourceQuality: asset.sourceQuality,
    provider: asset.provider,
    latestDate: latest?.date ?? null,
    moveMode: moveModeForAsset(asset),
    moves,
    usable: asset.dataQuality === 'source' && rows.length > 0,
    tradingViewSymbol
  }
}

function moveForWindow(asset: Asset, rows: PriceRow[], window: MonitorWindow) {
  const selected = windowedRows(rows, window)
  const first = selected[0]
  const last = selected[selected.length - 1]
  if (!first || !last) return null
  return indexedMove(asset, first.price, last.price)
}

function groupPrices(prices: PricePoint[]) {
  const grouped = new Map<string, PriceRow[]>()
  for (const point of prices) {
    const rows = grouped.get(point.ticker) ?? []
    rows.push({ date: point.date, price: point.price })
    grouped.set(point.ticker, rows)
  }
  for (const [ticker, rows] of grouped) {
    grouped.set(ticker, rows.sort((a, b) => a.date.localeCompare(b.date)))
  }
  return grouped
}

function buildChartData(series: MonitorSeries[]) {
  const byDate = new Map<string, Record<string, string | number | null>>()
  for (const line of series) {
    for (const point of line.points) {
      const row = byDate.get(point.date) ?? { date: point.date }
      row[line.ticker] = point.value
      byDate.set(point.date, row)
    }
  }
  return Array.from(byDate.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)))
}
