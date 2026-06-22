import { assertIsoDate } from './csv'

export const supportedIndexTickers = new Set(['KOSPI', 'KOSDAQ'])
export const supportedMacroSeries = new Set(['KR_FOREIGN_EQUITY_FLOW', 'BOK_BASE_RATE', 'KR_CURRENT_ACCOUNT', 'KR_TRADE_BALANCE'])
export const requiredMacroSeries = new Set(['KR_FOREIGN_EQUITY_FLOW'])

export type IndexPriceRow = {
  ticker: string
  date: string
  close: number
  volume?: number | null
}

export type MacroFlowSeries = {
  ticker: string
  name: string
  provider: string
  sourceUrl: string
  status: 'source' | string
  unit: string
  observations: { date: string; value: number; unit?: string }[]
}

type ValidationMessages = {
  labelPrefix?: string
  emptyIndexRows?: string
  missingIndexTicker?: (ticker: string) => string
  emptyMacroSeries?: string
  missingMacroSeries?: (ticker: string) => string
  missingMacroMetadata?: (ticker: string) => string
  emptyMacroObservations?: (ticker: string) => string
}

function labelFor(raw: string, messages: ValidationMessages) {
  return messages.labelPrefix ? `${messages.labelPrefix}: ${raw}` : raw
}

export function validateIndexRows(rows: IndexPriceRow[], messages: ValidationMessages = {}) {
  if (rows.length === 0) throw new Error(messages.emptyIndexRows ?? 'korea-index-prices import produced zero rows')
  const seen = new Set<string>()
  const present = new Set<string>()
  for (const row of rows) {
    const rawLabel = `${row.ticker} ${row.date}`
    const label = labelFor(rawLabel, messages)
    if (!supportedIndexTickers.has(row.ticker)) throw new Error(`${label}: unsupported ticker`)
    assertIsoDate(row.date, label)
    if (!Number.isFinite(row.close) || row.close <= 0) throw new Error(`${label}: close must be positive`)
    if (row.volume !== null && row.volume !== undefined && (!Number.isFinite(row.volume) || row.volume < 0)) throw new Error(`${label}: volume must be nonnegative`)
    const key = `${row.ticker}:${row.date}`
    if (seen.has(key)) throw new Error(`${label}: duplicate row`)
    seen.add(key)
    present.add(row.ticker)
  }
  for (const ticker of supportedIndexTickers) {
    if (!present.has(ticker)) throw new Error(messages.missingIndexTicker?.(ticker) ?? `missing required ticker ${ticker}`)
  }
}

export function validateMacroFlowSeries(series: MacroFlowSeries[], messages: ValidationMessages = {}) {
  if (series.length === 0) throw new Error(messages.emptyMacroSeries ?? 'korea-macro-flows import produced zero series')
  const present = new Set(series.map(item => item.ticker))
  for (const ticker of requiredMacroSeries) {
    if (!present.has(ticker)) throw new Error(messages.missingMacroSeries?.(ticker) ?? `missing required series ${ticker}`)
  }
  for (const item of series) {
    const itemLabel = labelFor(item.ticker, messages)
    if (!supportedMacroSeries.has(item.ticker)) throw new Error(`${itemLabel}: unsupported series`)
    if (!item.name || !item.provider || !item.sourceUrl || !item.unit) {
      throw new Error(messages.missingMacroMetadata?.(item.ticker) ?? `${itemLabel}: missing series metadata`)
    }
    if (!Array.isArray(item.observations) || item.observations.length === 0) {
      throw new Error(messages.emptyMacroObservations?.(item.ticker) ?? `${itemLabel}: observations are empty`)
    }
    const seen = new Set<string>()
    for (const observation of item.observations) {
      const label = labelFor(`${item.ticker} ${observation.date}`, messages)
      assertIsoDate(observation.date, label)
      if (!Number.isFinite(observation.value)) throw new Error(`${label}: value must be numeric`)
      if (!observation.unit) throw new Error(`${label}: unit is missing`)
      if (seen.has(observation.date)) throw new Error(`${label}: duplicate observation`)
      seen.add(observation.date)
    }
  }
}
